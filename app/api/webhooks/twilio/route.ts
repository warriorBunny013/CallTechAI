/**
 * Twilio Webhook Handler for Incoming Calls
 *
 * MULTI-TENANT: Call ownership is determined by the number that was CALLED (To = clinic number).
 * - To = clinic number (the number customers dial) → lookup phone_numbers.phone_number = To
 * - From = caller (customer) number
 * - Lookup returns organisation_id; we inject org's intents + voice agent into Vapi.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { buildTransientAssistant } from "@/lib/vapi-call";
import { fetchVapiAssistantVoiceConfig } from "@/lib/vapi-fetch-assistant";
import https from "https";

interface TwilioWebhookBody {
  From: string;
  To: string;
  CallSid: string;
  CallStatus: string;
  [key: string]: string;
}

/** Normalise to E.164 for lookup (Twilio usually sends E.164 already). */
function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && !phone.startsWith("+")) {
    return "+" + (digits.length === 10 ? "1" + digits : digits);
  }
  return phone.startsWith("+") ? phone : "+" + phone;
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

    console.log(`[Twilio] Incoming call To=${clinicNumber} (clinic) From=${callerNumber} (caller)`);

    const supabase = getSupabaseService();

    const { data: phoneRow, error: lookupError } = await supabase
      .from("phone_numbers")
      .select(
        "id, organisation_id, user_id, assistant_id, vapi_assistant_id, vapi_phone_number_id, phone_number"
      )
      .eq("phone_number", clinicNumber)
      .eq("is_active", true)
      .maybeSingle();

    if (lookupError || !phoneRow) {
      console.error(
        "[Twilio] No active phone number for clinic number:",
        clinicNumber,
        lookupError
      );
      return twimlResponse(
        "Sorry, this number is not registered. Goodbye."
      );
    }

    const organisationId = phoneRow.organisation_id ?? null;
    const phoneNumberId = phoneRow.id;
    const vapiPhoneNumberId =
      phoneRow.vapi_phone_number_id ?? phoneRow.vapi_phone_number_id;

    if (!organisationId) {
      console.error("[Twilio] Phone number has no organisation_id:", phoneRow.id);
      return twimlResponse(
        "Sorry, this number is not configured. Goodbye."
      );
    }

    const { data: org } = await supabase
      .from("organisations")
      .select("id, selected_voice_agent_id")
      .eq("id", organisationId)
      .single();

    const voiceAgentId = org?.selected_voice_agent_id ?? null;

    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true });

    // Fetch the assistant from VAPI so the voice matches (predefined or custom-created)
    let fetchedVoiceConfig = null;
    if (voiceAgentId) {
      fetchedVoiceConfig = await fetchVapiAssistantVoiceConfig(voiceAgentId);
    }

    // Always use a transient assistant with org intents; voice from VAPI so it sounds like the selected agent
    const assistantConfig = buildTransientAssistant(
      voiceAgentId,
      (intents ?? []) as {
        intent_name: string;
        example_user_phrases: string[];
        english_responses: string[];
        russian_responses: string[];
      }[],
      fetchedVoiceConfig ?? undefined
    );

    const vapiApiKey = process.env.VAPI_API_KEY;
    if (!vapiApiKey) {
      console.error("[Twilio] VAPI_API_KEY not set");
      return twimlResponse(
        "Service temporarily unavailable. Please try again later."
      );
    }

    const payload = {
      type: "inboundPhoneCall",
      assistant: assistantConfig,
      customer: { number: callerNumber },
      phoneNumberId: vapiPhoneNumberId || undefined,
      metadata: {
        organisation_id: organisationId,
        phone_number_id: phoneNumberId,
        caller_phone_number: callerNumber,
        assistant_phone_number: clinicNumber,
        twilio_call_sid: body.CallSid,
      },
    };

    const vapiResponse = await vapiPost("/v1/call", vapiApiKey, payload);

    if (!vapiResponse?.id) {
      console.error("[Twilio] Vapi create call failed:", vapiResponse);
      return twimlResponse(
        "We could not connect your call. Please try again later."
      );
    }

    await supabase.from("calls").insert({
      organisation_id: organisationId,
      user_id: phoneRow.user_id ?? null,
      phone_number_id: phoneNumberId,
      assistant_id: phoneRow.assistant_id ?? null,
      vapi_call_id: vapiResponse.id,
      caller_phone_number: callerNumber,
      assistant_phone_number: clinicNumber,
      call_status: "initiated",
      started_at: new Date().toISOString(),
      metadata: { twilio_call_sid: body.CallSid, vapi_response: vapiResponse },
    });

    return twimlResponse("Connecting you now.");
  } catch (err: unknown) {
    console.error("[Twilio] Error:", err);
    return twimlResponse(
      "An error occurred. Please try again later."
    );
  }
}

function twimlResponse(say: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${say}</Say>
  <Hangup/>
</Response>`,
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}

function vapiPost(
  path: string,
  apiKey: string,
  body: object
): Promise<{ id?: string; [k: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.vapi.ai",
        port: 443,
        path,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (ch) => (buf += ch));
        res.on("end", () => {
          try {
            const json = JSON.parse(buf);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(json.message || `Vapi ${res.statusCode}`));
            }
          } catch {
            reject(new Error("Invalid Vapi response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const callStatus = searchParams.get("CallStatus");
  const callSid = searchParams.get("CallSid");

  console.log("[Twilio Status] Call", callSid, "status:", callStatus);

  if (callSid) {
    const supabase = getSupabaseService();
    await supabase
      .from("calls")
      .update({
        call_status: callStatus || "unknown",
        updated_at: new Date().toISOString(),
      })
      .eq("metadata->>twilio_call_sid", callSid);
  }

  return NextResponse.json({ received: true });
}
