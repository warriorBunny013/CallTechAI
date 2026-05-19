/**
 * ElevenLabs Knowledge Base — websites and files scoped per organisation assistant.
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getSupabaseService } from "@/lib/supabase/service";

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
  return new ElevenLabsClient({ apiKey });
}

export type KnowledgeDocType = "text" | "url" | "file" | "intent";

export interface OrgKnowledgeRow {
  id: string;
  organisation_id: string;
  organisation_assistant_id: string | null;
  elevenlabs_document_id: string;
  document_type: KnowledgeDocType;
  name: string;
  source_ref: string | null;
  created_at: string;
}

/** Create a text document in ElevenLabs KB and store mapping in Supabase */
export async function createTextKnowledgeDocument(
  orgId: string,
  assistantRowId: string,
  name: string,
  text: string,
  documentType: KnowledgeDocType = "text",
  sourceRef?: string
): Promise<string> {
  const client = getClient();
  const result = await client.conversationalAi.knowledgeBase.documents.createFromText({
    text,
    name,
  });
  const docId = (result as { id?: string }).id;
  if (!docId) throw new Error("ElevenLabs did not return document id");

  const supabase = getSupabaseService();
  await supabase.from("organisation_knowledge_documents").insert({
    organisation_id: orgId,
    organisation_assistant_id: assistantRowId,
    elevenlabs_document_id: docId,
    document_type: documentType,
    name,
    source_ref: sourceRef ?? null,
  } as never);

  return docId;
}

/** Add URL to ElevenLabs KB */
export async function createUrlKnowledgeDocument(
  orgId: string,
  assistantRowId: string,
  url: string,
  name?: string
): Promise<string> {
  const client = getClient();
  const result = await client.conversationalAi.knowledgeBase.documents.createFromUrl({
    url,
    name: name ?? url,
    enableAutoSync: true,
  });
  const docId = (result as { id?: string }).id;
  if (!docId) throw new Error("ElevenLabs did not return document id");

  const supabase = getSupabaseService();
  await supabase.from("organisation_knowledge_documents").insert({
    organisation_id: orgId,
    organisation_assistant_id: assistantRowId,
    elevenlabs_document_id: docId,
    document_type: "url",
    name: name ?? url,
    source_ref: url,
  } as never);

  return docId;
}

/** Upload file to ElevenLabs KB */
export async function createFileKnowledgeDocument(
  orgId: string,
  assistantRowId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const client = getClient();
  const result = await client.conversationalAi.knowledgeBase.documents.createFromFile({
    file,
    name: fileName,
  });
  const docId = (result as { id?: string }).id;
  if (!docId) throw new Error("ElevenLabs did not return document id");

  const supabase = getSupabaseService();
  await supabase.from("organisation_knowledge_documents").insert({
    organisation_id: orgId,
    organisation_assistant_id: assistantRowId,
    elevenlabs_document_id: docId,
    document_type: "file",
    name: fileName,
    source_ref: fileName,
  } as never);

  return docId;
}

/** List knowledge documents for one assistant (excludes legacy intent KB rows). */
export async function listAssistantKnowledgeDocuments(
  orgId: string,
  assistantRowId: string
): Promise<OrgKnowledgeRow[]> {
  const supabase = getSupabaseService();
  const { data } = await supabase
    .from("organisation_knowledge_documents")
    .select("*")
    .eq("organisation_id", orgId)
    .eq("organisation_assistant_id", assistantRowId)
    .neq("document_type", "intent")
    .order("created_at", { ascending: false });
  return (data ?? []) as OrgKnowledgeRow[];
}

/** ElevenLabs document IDs for one assistant (websites + files only). */
export async function getAssistantKnowledgeDocumentIds(
  orgId: string,
  assistantRowId: string
): Promise<string[]> {
  const rows = await listAssistantKnowledgeDocuments(orgId, assistantRowId);
  return rows.map((r) => r.elevenlabs_document_id);
}

/** @deprecated Use listAssistantKnowledgeDocuments */
export async function listOrgKnowledgeDocuments(orgId: string): Promise<OrgKnowledgeRow[]> {
  const supabase = getSupabaseService();
  const { data } = await supabase
    .from("organisation_knowledge_documents")
    .select("*")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as OrgKnowledgeRow[];
}

/** @deprecated Use getAssistantKnowledgeDocumentIds */
export async function getOrgKnowledgeDocumentIds(orgId: string): Promise<string[]> {
  const rows = await listOrgKnowledgeDocuments(orgId);
  return rows
    .filter((r) => r.document_type !== "intent")
    .map((r) => r.elevenlabs_document_id);
}

/** Remove legacy intent rows from the global ElevenLabs knowledge base. */
export async function deleteOrgIntentKnowledgeDocuments(orgId: string): Promise<void> {
  const rows = await listOrgKnowledgeDocuments(orgId);
  for (const row of rows.filter((r) => r.document_type === "intent")) {
    await deleteKnowledgeDocument(orgId, row.id);
  }
}

/**
 * Attach knowledge base documents to an ElevenLabs agent.
 * Uses type:"file" which is what ElevenLabs expects for pre-uploaded documents.
 * Documents are cleared (empty list) when documentIds is empty.
 */
export async function syncKnowledgeBaseToAgent(
  agentId: string,
  documentIds: string[],
  orgId?: string
): Promise<void> {
  const client = getClient();

  const knowledgeBase = documentIds.map((id) => ({
    type: "file" as const,
    id,
    name: id,
  }));

  try {
    await client.conversationalAi.agents.update(agentId, {
      conversationConfig: {
        agent: {
          prompt: {
            knowledgeBase: knowledgeBase as never,
          },
        },
      },
    } as never);
  } catch (err: unknown) {
    // If ElevenLabs says a document doesn't exist (404), it may be:
    // 1. Still processing (URL crawl in progress) — will succeed on next sync
    // 2. Stale — was deleted from ElevenLabs but still in Supabase
    const isDocNotFound =
      err instanceof Error &&
      (err as { statusCode?: number }).statusCode === 404 &&
      err.message?.includes("document");

    if (isDocNotFound && orgId && documentIds.length > 0) {
      // Try attaching each doc individually to identify and clean up stale ones
      const supabase = getSupabaseService();
      for (const docId of documentIds) {
        try {
          await client.conversationalAi.agents.update(agentId, {
            conversationConfig: {
              agent: {
                prompt: {
                  knowledgeBase: [{ type: "file" as const, id: docId, name: docId }] as never,
                },
              },
            },
          } as never);
        } catch (innerErr: unknown) {
          const is404 =
            innerErr instanceof Error &&
            (innerErr as { statusCode?: number }).statusCode === 404;
          if (is404) {
            // Stale Supabase row — clean it up
            await supabase
              .from("organisation_knowledge_documents")
              .delete()
              .eq("elevenlabs_document_id", docId)
              .eq("organisation_id", orgId);
            console.warn(`[knowledge] Cleaned up stale doc ${docId} for org ${orgId}`);
          }
        }
      }
      // Final sync with whatever remains
      const validIds = documentIds.filter(async (id) => {
        const { data } = await supabase
          .from("organisation_knowledge_documents")
          .select("id")
          .eq("elevenlabs_document_id", id)
          .eq("organisation_id", orgId)
          .maybeSingle();
        return !!data;
      });
      // Best-effort — ignore errors here
      await client.conversationalAi.agents.update(agentId, {
        conversationConfig: {
          agent: {
            prompt: {
              knowledgeBase: validIds.map((id) => ({
                type: "file" as const,
                id,
                name: id,
              })) as never,
            },
          },
        },
      } as never).catch(() => {/* ignore */});
      return;
    }

    throw err;
  }
}

/** Delete document from ElevenLabs and Supabase; returns assistant row id for resync. */
export async function deleteKnowledgeDocument(
  orgId: string,
  rowId: string
): Promise<string | null> {
  const supabase = getSupabaseService();
  const { data: row } = await supabase
    .from("organisation_knowledge_documents")
    .select("elevenlabs_document_id, organisation_assistant_id")
    .eq("id", rowId)
    .eq("organisation_id", orgId)
    .maybeSingle();

  if (!row) return null;
  const docId = (row as { elevenlabs_document_id: string }).elevenlabs_document_id;
  const assistantRowId =
    (row as { organisation_assistant_id?: string | null }).organisation_assistant_id ?? null;

  const client = getClient();
  try {
    await client.conversationalAi.knowledgeBase.documents.delete(docId);
  } catch (e) {
    console.warn("[knowledge] ElevenLabs delete failed:", e);
  }

  await supabase.from("organisation_knowledge_documents").delete().eq("id", rowId);
  return assistantRowId;
}

/** Build a single text blob from an intent for KB (legacy) */
export function intentToKnowledgeText(intent: {
  intent_name: string;
  example_user_phrases: string[];
  english_responses: string[];
  russian_responses?: string[];
}): string {
  return [
    `# Intent: ${intent.intent_name}`,
    "",
    "## Example questions callers might ask",
    ...(intent.example_user_phrases ?? []).map((p) => `- ${p}`),
    "",
    "## How to respond (English)",
    ...(intent.english_responses ?? []).map((r) => `- ${r}`),
    "",
    "## How to respond (Russian)",
    ...((intent.russian_responses ?? []).map((r) => `- ${r}`) || ["- (none)"]),
  ].join("\n");
}
