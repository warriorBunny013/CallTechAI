/**
 * VAPI Callback Handler for Call Completion
 * 
 * CRITICAL OWNERSHIP MODEL:
 * - Call ownership is determined by metadata.user_id from VAPI callback
 * - This user_id was set during Twilio webhook when call was initiated
 * - user_id comes from phone_numbers lookup using caller's phone number (From field)
 * - ALL call data (recordings, transcripts, analytics) must be stored with this user_id
 * 
 * FLOW:
 * 1. VAPI sends callback when call completes
 * 2. Extract metadata.user_id from callback
 * 3. Store recording URL, transcript, duration, analytics
 * 4. Update call record with user_id to ensure data isolation
 * 
 * SECURITY:
 * - Never trust user_id from client - it comes from our own metadata
 * - Always use metadata.user_id from VAPI callback
 * - Reject callbacks without valid metadata.user_id
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface VAPICallback {
  id: string; // VAPI call ID
  status: string;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  analysis?: any;
  metadata?: {
    user_id: string; // CRITICAL: User ID from Twilio webhook
    assistant_id?: string;
    phone_number_id?: string;
    caller_phone_number?: string;
    assistant_phone_number?: string;
    twilio_call_sid?: string;
    [key: string]: any;
  };
  startedAt?: string;
  endedAt?: string;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    const callback: VAPICallback = await req.json();

    console.log(`[VAPI Callback] Received callback for call: ${callback.id}`);

    // CRITICAL: Extract user_id from metadata
    // This was set during Twilio webhook and is the SINGLE source of truth
    const user_id = callback.metadata?.user_id;

    if (!user_id) {
      console.error(
        `[VAPI Callback] No user_id in metadata for call ${callback.id}. Rejecting callback.`
      );
      return NextResponse.json(
        { error: "Missing user_id in metadata" },
        { status: 400 }
      );
    }

    console.log(`[VAPI Callback] Processing call for user_id: ${user_id}`);

    // Extract other metadata
    const assistant_id = callback.metadata?.assistant_id;
    const phone_number_id = callback.metadata?.phone_number_id;
    const caller_phone_number = callback.metadata?.caller_phone_number;
    const assistant_phone_number = callback.metadata?.assistant_phone_number;

    // Calculate duration
    let duration_seconds: number | null = null;
    if (callback.duration) {
      duration_seconds = Math.floor(callback.duration / 1000); // Convert ms to seconds
    } else if (callback.startedAt && callback.endedAt) {
      const start = new Date(callback.startedAt).getTime();
      const end = new Date(callback.endedAt).getTime();
      duration_seconds = Math.floor((end - start) / 1000);
    }

    // Update or create call record
    // First, try to find existing call by vapi_call_id
    const { data: existingCall, error: findError } = await supabase
      .from("calls")
      .select("id")
      .eq("vapi_call_id", callback.id)
      .single();

    if (findError && findError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is OK
      console.error("[VAPI Callback] Error finding existing call:", findError);
    }

    const callData = {
      user_id: user_id, // CRITICAL: Always use user_id from metadata
      phone_number_id: phone_number_id || null,
      assistant_id: assistant_id || null,
      vapi_call_id: callback.id,
      caller_phone_number: caller_phone_number || null,
      assistant_phone_number: assistant_phone_number || null,
      call_status: callback.status || "completed",
      duration_seconds: duration_seconds,
      recording_url: callback.recordingUrl || null,
      transcript: callback.transcript || null,
      summary: callback.summary || null,
      analysis: callback.analysis || null,
      metadata: callback.metadata || {},
      started_at: callback.startedAt
        ? new Date(callback.startedAt).toISOString()
        : null,
      ended_at: callback.endedAt ? new Date(callback.endedAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existingCall) {
      // Update existing call record
      // CRITICAL: Always filter by user_id to prevent cross-user updates
      const { error: updateError } = await supabase
        .from("calls")
        .update(callData)
        .eq("id", existingCall.id)
        .eq("user_id", user_id); // Double-check user_id matches

      if (updateError) {
        console.error("[VAPI Callback] Error updating call:", updateError);
        return NextResponse.json(
          { error: "Failed to update call record" },
          { status: 500 }
        );
      }

      console.log(`[VAPI Callback] Updated call record: ${existingCall.id}`);
    } else {
      // Create new call record
      const { error: insertError } = await supabase.from("calls").insert(callData);

      if (insertError) {
        console.error("[VAPI Callback] Error creating call record:", insertError);
        return NextResponse.json(
          { error: "Failed to create call record" },
          { status: 500 }
        );
      }

      console.log(`[VAPI Callback] Created new call record for call: ${callback.id}`);
    }

    return NextResponse.json({ received: true, user_id: user_id });
  } catch (error: any) {
    console.error("[VAPI Callback] Error processing callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "VAPI webhook endpoint active" });
}

