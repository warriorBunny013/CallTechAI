"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  FileText,
  Globe,
  Loader2,
  Trash2,
  Upload,
  BookOpen,
} from "lucide-react";

type KnowledgeDoc = {
  id: string;
  document_type: string;
  name: string;
  source_ref: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  url: "Website",
  file: "File",
  intent: "Intent",
  text: "Text",
};

type PanelMode = "all" | "website" | "files";

type IntentKnowledgePanelProps = {
  mode?: PanelMode;
  /** organisation_assistants.id — required for per-agent knowledge */
  assistantId: string | null;
  assistantName?: string;
};

export function IntentKnowledgePanel({
  mode = "all",
  assistantId,
  assistantName,
}: IntentKnowledgePanelProps) {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!assistantId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/knowledge?assistantId=${encodeURIComponent(assistantId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load knowledge");
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Could not load knowledge base documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assistantId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim() || !assistantId) return;
    setAddingUrl(true);
    try {
      const res = await fetch("/api/knowledge/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: websiteUrl.trim(),
          name: websiteName.trim() || undefined,
          assistantId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add website");
      toast({
        title: "Website added",
        description: `Synced to ${assistantName ?? "your assistant"} in ElevenLabs.`,
      });
      setWebsiteUrl("");
      setWebsiteName("");
      await fetchDocuments();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add website",
        variant: "destructive",
      });
    } finally {
      setAddingUrl(false);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!assistantId) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        form.append("assistantId", assistantId);
        const res = await fetch("/api/knowledge/files", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}`);
      }
      toast({
        title: "Files uploaded",
        description: `${list.length} file(s) added to ${assistantName ?? "your assistant"}.`,
      });
      await fetchDocuments();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Removed", description: "Document removed from this assistant." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const showWebsite = mode === "all" || mode === "website";
  const showFiles = mode === "all" || mode === "files";
  const showList = mode === "all" || mode === "website" || mode === "files";

  const filteredDocs =
    mode === "website"
      ? documents.filter((d) => d.document_type === "url")
      : mode === "files"
        ? documents.filter((d) => d.document_type === "file")
        : documents;

  if (!assistantId) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create an assistant on the Assistants page before adding websites or files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assistantName && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Knowledge for <span className="font-semibold text-gray-900 dark:text-white">{assistantName}</span> only — other assistants will not use these documents.
        </p>
      )}

      {showWebsite && (
        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#84CC16]/10">
              <Globe className="h-5 w-5 text-[#84CC16]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add website</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We crawl the URL and attach it to this assistant in ElevenLabs.
              </p>
            </div>
          </div>
          <form onSubmit={handleAddWebsite} className="flex flex-col sm:flex-row gap-3 max-w-3xl">
            <div className="flex-1 space-y-1">
              <Label htmlFor="kb-url">Website URL</Label>
              <Input
                id="kb-url"
                type="url"
                placeholder="https://yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="sm:w-48 space-y-1">
              <Label htmlFor="kb-name">Label (optional)</Label>
              <Input
                id="kb-name"
                placeholder="Main site"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={addingUrl || !websiteUrl.trim()}
                className="bg-[#84CC16] text-black font-bold rounded-xl h-10"
              >
                {addingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add website"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {showFiles && (
        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#84CC16]/10">
              <Upload className="h-5 w-5 text-[#84CC16]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload files</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                PDF, TXT, DOCX — drag and drop or click to browse (max 10 MB each).
              </p>
            </div>
          </div>
          <label
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
              dragOver
                ? "border-[#84CC16] bg-[#84CC16]/10"
                : "border-gray-200 dark:border-white/10 hover:border-[#84CC16]/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.txt,.doc,.docx,.md,.csv"
              disabled={uploading}
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#84CC16]" />
            ) : (
              <FileText className="h-8 w-8 text-gray-400" />
            )}
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Drop files here or click to upload
            </span>
          </label>
        </div>
      )}

      {showList && (
        <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#84CC16]" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Knowledge base</h3>
            </div>
            <Badge className="bg-[#84CC16]/10 text-[#84CC16] border border-[#84CC16]/20">
              {filteredDocs.length} items
            </Badge>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#84CC16]" />
              Loading...
            </div>
          ) : filteredDocs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No documents for this assistant yet. Add a website or file above.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {TYPE_LABEL[doc.document_type] ?? doc.document_type}
                      {doc.source_ref ? ` · ${doc.source_ref}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 shrink-0"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
