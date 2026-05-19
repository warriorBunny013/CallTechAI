import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { resolveAssistantContext, syncKnowledgeForAssistant } from "@/lib/assistant-knowledge";
import { createFileKnowledgeDocument } from "@/lib/elevenlabs-knowledge";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const assistantIdParam = formData.get("assistantId");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
    }

    const assistantId =
      typeof assistantIdParam === "string" && assistantIdParam.trim()
        ? assistantIdParam.trim()
        : undefined;

    const ctx = await resolveAssistantContext(userAndOrg.organisationId, assistantId);

    const docId = await createFileKnowledgeDocument(
      userAndOrg.organisationId,
      ctx.assistantRowId,
      file,
      file.name
    );

    // File upload is synchronous — sync in background so response is immediate.
    void syncKnowledgeForAssistant(userAndOrg.organisationId, ctx.assistantRowId).catch((e) =>
      console.warn("[knowledge/files] Agent sync failed:", e)
    );

    return NextResponse.json(
      {
        documentId: docId,
        assistantId: ctx.assistantRowId,
        message: "File added to this assistant's knowledge base",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[knowledge/files] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}
