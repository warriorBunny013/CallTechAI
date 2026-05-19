"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Loader2,
  Mic,
  Pencil,
  Play,
  Plus,
  Square,
  Utensils,
} from "lucide-react";
import type { VoiceOption } from "@/lib/voice-options";
import { LanguageMultiSelect } from "@/components/dashboard/language-multi-select";

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  icon: string;
  highlights: string[];
  suggestedLanguages?: string[];
  defaultSystemPrompt: string;
  defaultFirstMessage: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  car: Car,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
};

type Props = {
  templates: TemplateMeta[];
  voices: VoiceOption[];
  voicesLoading: boolean;
  voiceLabels: Record<string, string>;
  onRenameVoice: (voiceId: string, name: string) => void;
  playingVoiceId: string | null;
  onPlayPreview: (e: React.MouseEvent, voice: VoiceOption) => void;
  creating: boolean;
  onCancel?: () => void;
  onCreate: (payload: {
    name: string;
    voiceId: string;
    templateId: string;
    languages: string[];
    systemPrompt: string;
    firstMessage: string;
  }) => void;
};

function VoiceCard({
  voice,
  displayName,
  selected,
  playing,
  onSelect,
  onPlay,
  onRename,
}: {
  voice: VoiceOption;
  displayName: string;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onPlay: (e: React.MouseEvent) => void;
  onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !editing && onSelect()}
      className={`relative flex flex-col gap-2 rounded-2xl border p-4 cursor-pointer transition-all ${
        selected
          ? "border-[#84CC16] bg-[#84CC16]/10 ring-2 ring-[#84CC16]/25"
          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-[#84CC16]/40"
      }`}
    >
      <div className="flex justify-between items-center">
        <Mic className="h-5 w-5 text-gray-400" />
        <button
          type="button"
          onClick={onPlay}
          className={`p-2 rounded-lg ${playing ? "bg-[#84CC16] text-black" : "bg-gray-100 dark:bg-white/10"}`}
        >
          {playing ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
        </button>
      </div>
      {editing ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onRename(draft.trim() || voice.name);
            setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-8 text-sm"
          autoFocus
        />
      ) : (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="font-bold text-sm truncate">{displayName}</span>
          <button type="button" onClick={() => setEditing(true)} aria-label="Rename voice">
            <Pencil className="h-3 w-3 text-gray-400 hover:text-[#84CC16]" />
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500 line-clamp-2">{voice.description}</p>
      <Badge variant="outline" className="w-fit text-[10px] capitalize">
        {voice.gender}
      </Badge>
    </div>
  );
}

export function CreateAssistantWizard({
  templates,
  voices,
  voicesLoading,
  voiceLabels,
  onRenameVoice,
  playingVoiceId,
  onPlayPreview,
  creating,
  onCancel,
  onCreate,
}: Props) {
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSystemPrompt(t.defaultSystemPrompt);
      setFirstMessage(t.defaultFirstMessage);
      if (t.suggestedLanguages?.length) setLanguages(t.suggestedLanguages);
    }
  };

  const females = voices.filter((v) => v.gender === "female");
  const males = voices.filter((v) => v.gender === "male");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm font-semibold text-gray-500">
        {["Template", "Voice", "Settings", "Prompts"].map((label, i) => (
          <span key={label} className={step === i + 1 ? "text-[#84CC16]" : ""}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Choose a template</h2>
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="shrink-0">
                Cancel
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Receptionist templates (Appointment Scheduler, Auto Service, Restaurant Host, Healthcare).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((t) => {
              const Icon = ICONS[t.icon] ?? Bot;
              const sel = templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    sel
                      ? "border-[#84CC16] bg-[#84CC16]/10 ring-2 ring-[#84CC16]/20"
                      : "border-gray-200 dark:border-white/10 hover:border-[#84CC16]/40"
                  }`}
                >
                  <Icon className={`h-7 w-7 mb-3 ${sel ? "text-[#84CC16]" : "text-gray-400"}`} />
                  <p className="font-bold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.highlights.slice(0, 2).map((h) => (
                      <Badge key={h} variant="outline" className="text-[10px]">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <Button
            disabled={!templateId}
            onClick={() => setStep(2)}
            className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold"
          >
            Next: Voice <ChevronRight className="h-4 w-4 ml-1 inline" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
          <h2 className="font-bold text-lg">Select voice (20 curated)</h2>
          <p className="text-sm text-gray-500">Preview with play — pencil icon renames the label (saved locally).</p>
          {voicesLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-gray-400">Female ({females.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {females.map((v) => (
                  <VoiceCard
                    key={v.id}
                    voice={v}
                    displayName={voiceLabels[v.id] ?? v.name}
                    selected={voiceId === v.id}
                    playing={playingVoiceId === v.id}
                    onSelect={() => setVoiceId(v.id)}
                    onPlay={(e) => onPlayPreview(e, v)}
                    onRename={(n) => onRenameVoice(v.id, n)}
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase text-gray-400 pt-2">Male ({males.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {males.map((v) => (
                  <VoiceCard
                    key={v.id}
                    voice={v}
                    displayName={voiceLabels[v.id] ?? v.name}
                    selected={voiceId === v.id}
                    playing={playingVoiceId === v.id}
                    onSelect={() => setVoiceId(v.id)}
                    onPlay={(e) => onPlayPreview(e, v)}
                    onRename={(n) => onRenameVoice(v.id, n)}
                  />
                ))}
              </div>
            </>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              disabled={!voiceId}
              onClick={() => setStep(3)}
              className="bg-[#84CC16] text-black font-bold"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
          <div className="space-y-2">
            <Label>Assistant name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              className="max-w-md"
            />
          </div>
          <LanguageMultiSelect value={languages} onChange={setLanguages} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => setStep(4)}
              className="bg-[#84CC16] text-black font-bold"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-5">
          <div className="space-y-2">
            <Label>First message</Label>
            <Textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} rows={3} />
            <p className="text-xs text-gray-500">
              Placeholders: {"{{org_name}}"}, {"{{agent_name}}"} — replaced per call.
            </p>
          </div>
          <div className="space-y-2">
            <Label>System prompt</Label>
            <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={12} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              disabled={creating || !templateId || !voiceId || !name.trim()}
              onClick={() =>
                templateId &&
                voiceId &&
                onCreate({
                  name: name.trim(),
                  voiceId,
                  templateId,
                  languages,
                  systemPrompt,
                  firstMessage,
                })
              }
              className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Create assistant
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
