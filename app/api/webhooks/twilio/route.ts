/**
 * Twilio Webhook Handler for Incoming Calls
 * 
 * CRITICAL OWNERSHIP MODEL:
 * - Call ownership is determined by the CALLER's phone number (From field)
 * - NOT by the assistant number (To field)
 * - Lookup phone_numbers.phone_number = From to get user_id
 * - Multiple users MAY forward to the SAME assistant number
 * - Data must NEVER mix between users
 * 
 * FLOW:
 * 1. Twilio sends webhook when call arrives
 * 2. Extract From (caller) and To (assistant) phone numbers
 * 3. Lookup phone_numbers where phone_number = From
 * 4. Extract user_id, assistant_id, phone_number_id
 * 5. Reject call if no matching phone_number exists
 * 6. Start VAPI AI call session with metadata (user_id, assistant_id, phone_number_id)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import https from "https";

interface TwilioWebhookBody {
  From: string; // Caller's phone number (clinic number)
  To: string; // Assistant phone number (may be shared)
  CallSid: string;
  CallStatus: string;
  [key: string]: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse Twilio webhook body
    const formData = await req.formData();
    const body: TwilioWebhookBody = {
      From: formData.get("From") as string,
      To: formData.get("To") as string,
      CallSid: formData.get("CallSid") as string,
      CallStatus: formData.get("CallStatus") as string,
    };

    // Extract phone numbers
    const callerPhoneNumber = body.From; // This is the clinic number
    const assistantPhoneNumber = body.To; // This is the assistant number

    console.log(`[Twilio Webhook] Incoming call from ${callerPhoneNumber} to ${assistantPhoneNumber}`);

    // CRITICAL: Lookup user_id by caller's phone number (From field)
    // This is the SINGLE source of truth for call ownership
    const { data: phoneNumberRecord, error: lookupError } = await supabase
      .from("phone_numbers")
      .select("id, user_id, assistant_id, vapi_assistant_id, phone_number")
      .eq("phone_number", callerPhoneNumber)
      .eq("is_active", true)
      .single();

    if (lookupError || !phoneNumberRecord) {
      console.error(
        `[Twilio Webhook] No active phone number found for caller: ${callerPhoneNumber}`,
        lookupError
      );
      
      // Reject the call - return TwiML to hang up
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is not registered. Goodbye.</Say>
  <Hangup/>
</Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    const { user_id, assistant_id, vapi_assistant_id, id: phone_number_id } = phoneNumberRecord;

    console.log(
      `[Twilio Webhook] Found owner: user_id=${user_id}, assistant_id=${assistant_id}, phone_number_id=${phone_number_id}`
    );

    // Verify assistant exists and belongs to user
    if (!vapi_assistant_id) {
      console.error(
        `[Twilio Webhook] Phone number ${callerPhoneNumber} has no assistant configured`
      );
      
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, no assistant is configured for this number. Goodbye.</Say>
  <Hangup/>
</Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    // Start VAPI AI call session with metadata
    // This metadata will be passed to VAPI callback so we can store call data with correct user_id
    const vapiApiKey = process.env.VAPI_API_KEY;
    if (!vapiApiKey) {
      console.error("[Twilio Webhook] VAPI_API_KEY not configured");
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Service temporarily unavailable. Please try again later.</Say>
  <Hangup/>
</Response>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/xml",
          },
        }
      );
    }

    // Create VAPI call with metadata
    // The metadata is CRITICAL - it contains user_id so callbacks can store data correctly
    // NOTE: Verify VAPI API format - this may need adjustment based on actual VAPI API
    const vapiCallData = {
      phoneNumberId: assistantPhoneNumber, // The assistant number (To field) - may need to be VAPI phone number ID
      customer: {
        number: callerPhoneNumber, // The caller's clinic number (From field)
      },
      assistantId: vapi_assistant_id,
      metadata: {
        user_id: user_id, // CRITICAL: Pass user_id in metadata
        assistant_id: assistant_id,
        phone_number_id: phone_number_id,
        caller_phone_number: callerPhoneNumber,
        assistant_phone_number: assistantPhoneNumber,
        twilio_call_sid: body.CallSid,
      },
    };

    console.log(`[Twilio Webhook] Starting VAPI call with metadata:`, JSON.stringify(vapiCallData.metadata));

    // Make request to VAPI to start the call
    // NOTE: This endpoint format may need verification against VAPI API documentation
    const vapiResponse = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: "api.vapi.ai",
        port: 443,
        path: "/v1/call",
        method: "POST",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => (data += chunk));
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(jsonData);
            } else {
              reject(new Error(jsonData.message || `VAPI API error: ${res.statusCode}`));
            }
          } catch (parseError) {
            reject(new Error("Failed to parse VAPI response"));
          }
        });
      });

      req.on("error", reject);
      req.write(JSON.stringify(vapiCallData));
      req.end();
    });

    console.log(`[Twilio Webhook] VAPI call started:`, vapiResponse.id);

    // Store initial call record in database
    const { error: callInsertError } = await supabase.from("calls").insert({
      user_id: user_id, // CRITICAL: Store with correct user_id
      phone_number_id: phone_number_id,
      assistant_id: assistant_id,
      vapi_call_id: vapiResponse.id,
      caller_phone_number: callerPhoneNumber,
      assistant_phone_number: assistantPhoneNumber,
      call_status: "initiated",
      started_at: new Date().toISOString(),
      metadata: {
        twilio_call_sid: body.CallSid,
        vapi_response: vapiResponse,
      },
    });

    if (callInsertError) {
      console.error("[Twilio Webhook] Error storing call record:", callInsertError);
      // Don't fail the webhook, but log the error
    }

    // Return TwiML to connect the call
    // VAPI will handle the actual call routing
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you now.</Say>
</Response>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  } catch (error: any) {
    console.error("[Twilio Webhook] Error processing webhook:", error);
    
    // Return error response to Twilio
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">An error occurred. Please try again later.</Say>
  <Hangup/>
</Response>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  }
}

// Handle GET requests (Twilio status callbacks)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const callStatus = searchParams.get("CallStatus");
  const callSid = searchParams.get("CallSid");

  console.log(`[Twilio Status Callback] Call ${callSid} status: ${callStatus}`);

  // Update call status if we have the call record
  if (callSid) {
    const { error } = await supabase
      .from("calls")
      .update({
        call_status: callStatus || "unknown",
        updated_at: new Date().toISOString(),
      })
      .eq("metadata->>twilio_call_sid", callSid);

    if (error) {
      console.error("[Twilio Status Callback] Error updating call:", error);
    }
  }

  return NextResponse.json({ received: true });
}

