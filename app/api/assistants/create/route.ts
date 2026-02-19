/**
 * Create a new assistant in VAPI for the current org.
 * Uses org name, assistant name, selected voice, and dashboard intents.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { setVapiPhoneNumberAssistant } from "@/lib/vapi-phone-number";
import { buildAssistantSystemPrompt, buildAssistantFirstMessage } from "@/lib/assistant-system-prompt";

const VAPI_BASE = "https://api.vapi.ai";

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, voiceId, voiceProvider = "vapi" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Assistant name is required" },
        { status: 400 }
      );
    }

    if (!voiceId || typeof voiceId !== "string") {
      return NextResponse.json(
        { error: "Voice selection is required" },
        { status: 400 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;
    if (!vapiApiKey || vapiApiKey === "your_vapi_api_key_here") {
      return NextResponse.json(
        { error: "VAPI API key not configured" },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("id, name")
      .eq("id", userAndOrg.organisationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organisation not found" },
        { status: 404 }
      );
    }

    const orgName = (org as { name?: string }).name ?? "Your Business";

    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", userAndOrg.organisationId)
      .order("created_at", { ascending: true });

    const intentRows = (intents ?? []).map((r) => ({
      intent_name: r.intent_name,
      example_user_phrases: r.example_user_phrases ?? [],
      english_responses: r.english_responses ?? [],
      russian_responses: r.russian_responses ?? [],
    }));

    const assistantName = name.trim();
    const systemPrompt = buildAssistantSystemPrompt(assistantName, orgName, intentRows);
    const firstMessage = buildAssistantFirstMessage(assistantName);

    const assistantPayload = {
      name: assistantName,
      firstMessage,
      model: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: {
        provider: voiceProvider,
        voiceId,
      },
    };

    const res = await fetch(`${VAPI_BASE}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assistantPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[assistants/create] VAPI create failed:", res.status, text);
      return NextResponse.json(
        { error: "Failed to create assistant in VAPI" },
        { status: 500 }
      );
    }

    const vapiAssistant = await res.json();
    const assistantId = vapiAssistant?.id;

    if (!assistantId) {
      return NextResponse.json(
        { error: "VAPI did not return assistant ID" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("organisations")
      .update({
        selected_voice_agent_id: assistantId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userAndOrg.organisationId);

    if (updateError) {
      console.error("[assistants/create] Org update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to save assistant to organisation" },
        { status: 500 }
      );
    }

    const { data: phones } = await supabase
      .from("phone_numbers")
      .select("vapi_phone_number_id")
      .eq("organisation_id", userAndOrg.organisationId);

    for (const p of phones ?? []) {
      const vid = (p as { vapi_phone_number_id?: string }).vapi_phone_number_id;
      if (vid) {
        await setVapiPhoneNumberAssistant(vid, assistantId, vapiApiKey);
      }
    }

    return NextResponse.json({
      assistant: {
        id: assistantId,
        name: assistantName,
        firstMessage,
        voice: { provider: voiceProvider, voiceId },
      },
      message: "Assistant created and linked to your phone numbers",
    });
  } catch (err) {
    console.error("[assistants/create] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
