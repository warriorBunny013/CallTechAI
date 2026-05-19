import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { resolveAssistantContext, syncKnowledgeForAssistant } from "@/lib/assistant-knowledge";
import { createUrlKnowledgeDocument } from "@/lib/elevenlabs-knowledge";

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { url, name, assistantId } = body as {
      url?: string;
      name?: string;
      assistantId?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const ctx = await resolveAssistantContext(userAndOrg.organisationId, assistantId);

    const docId = await createUrlKnowledgeDocument(
      userAndOrg.organisationId,
      ctx.assistantRowId,
      parsed.toString(),
      name
    );

    // URL documents are crawled asynchronously by ElevenLabs — sync is best-effort.
    // The document is already saved to ElevenLabs KB; it will be available for
    // agent attachment once ElevenLabs finishes processing the URL.
    void syncKnowledgeForAssistant(userAndOrg.organisationId, ctx.assistantRowId).catch((e) =>
      console.warn("[knowledge/website] Agent sync failed (URL may still be processing):", e)
    );

    return NextResponse.json(
      {
        documentId: docId,
        assistantId: ctx.assistantRowId,
        message: "Website added to this assistant's knowledge base",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[knowledge/website] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add website" },
      { status: 500 }
    );
  }
}
