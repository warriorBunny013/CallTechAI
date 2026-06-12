"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, ChevronLeft, Phone } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

type Props = {
  linking: boolean;
  onLink: (payload: { elevenlabsAgentId: string; name: string }) => Promise<void>;
  onCancel?: () => void;
};

export function LinkExistingAgentForm({ linking, onLink, onCancel }: Props) {
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = agentId.trim();
    const trimmedName = name.trim();

    if (!trimmedId.startsWith("agent_")) {
      toast({
        title: "Invalid agent ID",
        description: 'Paste the full ID from ElevenLabs (starts with "agent_").',
        variant: "destructive",
      });
      return;
    }

    await onLink({
      elevenlabsAgentId: trimmedId,
      name: trimmedName,
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-[#84CC16]/15 shrink-0">
            <Link2 className="h-6 w-6 text-[#84CC16]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Link existing ElevenLabs agent
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect an agent you already built in ElevenLabs (e.g. via Make.com) so
              calls and minutes show up in this dashboard.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="el-agent-id">ElevenLabs Agent ID *</Label>
            <Input
              id="el-agent-id"
              placeholder="agent_2301kqttskbjftttny8kd80wvbmc"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={linking}
              className="font-mono text-sm rounded-xl h-11"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ElevenLabs → Conversational AI → your agent → copy Agent ID from settings.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="el-agent-name">Display name (optional)</Label>
            <Input
              id="el-agent-name"
              placeholder="360 Tint Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={linking}
              className="rounded-xl h-11"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave blank to use the name from ElevenLabs.
            </p>
          </div>

          <div className="rounded-xl border border-[#84CC16]/20 bg-[#84CC16]/5 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#84CC16]" />
              After linking
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>
                Go to{" "}
                <Link href="/dashboard/phone-numbers" className="text-[#84CC16] font-semibold hover:underline">
                  Phone Numbers
                </Link>{" "}
                and add your business line
              </li>
              <li>Assign this agent to that number</li>
              <li>
                Ensure ElevenLabs post-call webhook points to your app (set automatically on link)
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={linking}
              className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold rounded-xl h-11 flex-1"
            >
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking…
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Link agent
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={linking}
                className="rounded-xl h-11 font-semibold"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
