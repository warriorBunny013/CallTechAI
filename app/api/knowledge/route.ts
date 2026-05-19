import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { resolveAssistantContext } from "@/lib/assistant-knowledge";
import { listAssistantKnowledgeDocuments } from "@/lib/elevenlabs-knowledge";

export async function GET(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assistantId = req.nextUrl.searchParams.get("assistantId");
    const ctx = await resolveAssistantContext(userAndOrg.organisationId, assistantId);
    const documents = await listAssistantKnowledgeDocuments(
      userAndOrg.organisationId,
      ctx.assistantRowId
    );
    return NextResponse.json({
      documents,
      assistantId: ctx.assistantRowId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load knowledge";
    const status = message.includes("No assistant") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
