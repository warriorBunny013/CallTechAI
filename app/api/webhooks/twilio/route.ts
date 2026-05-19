/**
 * Twilio Webhook – Inbound Call Handler (ElevenLabs + Twilio)
 *
 * FLOW:
 *  1. Twilio receives inbound call on a clinic number.
 *  2. Twilio POSTs form data here (From, To, CallSid, CallStatus).
 *  3. We look up the organisation by the called number (To).
 *  4. We call the ElevenLabs "register call" API, which returns TwiML.
 *  5. We return that TwiML to Twilio — Twilio then streams audio directly
 *     to ElevenLabs Conversational AI over WebSocket.
 *
 * MULTI-TENANT:
 *  Call ownership is determined by the number that was CALLED (To = clinic number).
 *  - To   = clinic number (customers dial this) → lookup phone_numbers.phone_number = To
 *  - From = caller number
 *  - Lookup yields organisation_id + selected voice agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getSupabaseService } from "@/lib/supabase/service";
import { buildConversationInitData, resolveElevenLabsAgentId } from "@/lib/elevenlabs-call";

interface TwilioWebhookBody {
  From: string;
  To: string;
  CallSid: string;
  CallStatus: string;
  [key: string]: string;
}

function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && !phone.startsWith("+")) {
    return "+" + (digits.length === 10 ? "1" + digits : digits);
  }
  return phone.startsWith("+") ? phone : "+" + phone;
}

function twimlSay(message: string): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Say voice="alice">${message}</Say><Hangup/></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body: TwilioWebhookBody = {
      From: (formData.get("From") as string) ?? "",
      To: (formData.get("To") as string) ?? "",
      CallSid: (formData.get("CallSid") as string) ?? "",
      CallStatus: (formData.get("CallStatus") as string) ?? "",
    };

    const callerNumber = body.From;
    const clinicNumber = normalizeE164(body.To);

    console.log(`[Twilio] Inbound call To=${clinicNumber} From=${callerNumber} CallSid=${body.CallSid}`);

    const supabase = getSupabaseService();

    // 1. Resolve phone number → organisation
    const { data: phoneRowRaw, error: lookupError } = await supabase
      .from("phone_numbers")
      .select(
        "id, organisation_id, user_id, assistant_id, elevenlabs_agent_id, phone_number"
      )
      .eq("phone_number", clinicNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (lookupError || !phoneRowRaw) {
      console.error("[Twilio] No active phone number for:", clinicNumber, lookupError);
      return twimlSay("Sorry, this number is not registered. Goodbye.");
    }

    const phoneRow = phoneRowRaw as {
      id: string;
      organisation_id: string | null;
      user_id: string | null;
      assistant_id: string | null;
      elevenlabs_agent_id: string | null;
      phone_number: string;
    };

    const organisationId = phoneRow.organisation_id ?? null;
    const phoneNumberId = phoneRow.id;

    if (!organisationId) {
      console.error("[Twilio] Phone number has no organisation_id:", phoneRow.id);
      return twimlSay("Sorry, this number is not configured. Goodbye.");
    }

    // 2. Load organisation details
    const { data: org } = await supabase
      .from("organisations")
      .select("id, name, selected_voice_agent_id, elevenlabs_agent_id")
      .eq("id", organisationId)
      .single();

    const orgName = (org as { name?: string } | null)?.name ?? "our team";
    const voiceAgentId =
      (org as { selected_voice_agent_id?: string } | null)?.selected_voice_agent_id ?? null;
    const orgElevenLabsAgentId =
      phoneRow.elevenlabs_agent_id ??
      (org as { elevenlabs_agent_id?: string } | null)?.elevenlabs_agent_id ??
      null;

    // 3. Load intents for this organisation
    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true });

    // 4. Resolve ElevenLabs agent ID and API key
    let elevenLabsAgentId: string;
    try {
      elevenLabsAgentId = resolveElevenLabsAgentId(orgElevenLabsAgentId);
    } catch (err) {
      console.error("[Twilio] ElevenLabs agent ID not configured:", err);
      return twimlSay("Service temporarily unavailable. Please try again later.");
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      console.error("[Twilio] ELEVENLABS_API_KEY not set");
      return twimlSay("Service temporarily unavailable. Please try again later.");
    }

    // 5. Build dynamic conversation config (voice + org intents)
    const conversationInitData = buildConversationInitData(
      voiceAgentId,
      orgName,
      (intents ?? []) as {
        intent_name: string;
        example_user_phrases: string[];
        english_responses: string[];
        russian_responses: string[];
      }[],
      callerNumber,
      organisationId
    );

    // 6. Register the call with ElevenLabs → get TwiML back
    const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

    let twiml: string;
    try {
      twiml = await client.conversationalAi.twilio.registerCall({
        agentId: elevenLabsAgentId,
        fromNumber: callerNumber,
        toNumber: clinicNumber,
        direction: "inbound",
        conversationInitiationClientData: conversationInitData,
      });
    } catch (err) {
      console.error("[Twilio] ElevenLabs registerCall failed:", err);
      return twimlSay("We could not connect your call. Please try again later.");
    }

    // 7. Insert initial call record in our DB (updated when ElevenLabs sends post-call webhook)
    const { data: insertedCall } = await supabase
      .from("calls")
      .insert({
        organisation_id: organisationId,
        user_id: phoneRow.user_id ?? null,
        phone_number_id: phoneNumberId,
        assistant_id: phoneRow.assistant_id ?? null,
        caller_phone_number: callerNumber,
        assistant_phone_number: clinicNumber,
        call_status: "initiated",
        started_at: new Date().toISOString(),
        metadata: {
          twilio_call_sid: body.CallSid,
          elevenlabs_agent_id: elevenLabsAgentId,
          voice_agent_id: voiceAgentId,
        },
      } as never)
      .select("id")
      .single();

    console.log(
      `[Twilio] Call initiated. DB id=${(insertedCall as { id?: string } | null)?.id ?? "unknown"} ` +
        `org=${organisationId} agent=${elevenLabsAgentId}`
    );

    // 8. Return the TwiML ElevenLabs provided — Twilio streams audio directly to ElevenLabs
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: unknown) {
    console.error("[Twilio] Unhandled error:", err);
    return twimlSay("An error occurred. Please try again later.");
  }
}

/** Twilio status callback (GET or POST) — update call status in DB. */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const callStatus = searchParams.get("CallStatus");
  const callSid = searchParams.get("CallSid");

  console.log("[Twilio Status] CallSid:", callSid, "Status:", callStatus);

  if (callSid && callStatus) {
    const supabase = getSupabaseService();
    await supabase
      .from("calls")
      .update({ call_status: callStatus, updated_at: new Date().toISOString() } as never)
      .eq("metadata->>twilio_call_sid", callSid);
  }

  return NextResponse.json({ received: true });
}
