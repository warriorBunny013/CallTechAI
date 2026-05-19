import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { syncKnowledgeForAssistant } from "@/lib/assistant-knowledge";
import { deleteKnowledgeDocument } from "@/lib/elevenlabs-knowledge";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const assistantRowId = await deleteKnowledgeDocument(userAndOrg.organisationId, id);

    if (assistantRowId) {
      await syncKnowledgeForAssistant(userAndOrg.organisationId, assistantRowId);
    }

    return NextResponse.json({ message: "Removed from knowledge base" });
  } catch (err) {
    console.error("[knowledge/delete] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
