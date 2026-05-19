"use client";

/**
 * ElevenLabs Conversational AI – Browser Widget
 *
 * Provides an in-browser voice demo using ElevenLabs Conversational AI.
 * Connects to an ElevenLabs agent via WebSocket and streams audio in/out.
 *
 * Usage:
 *   <ElevenLabsWidget agentId="your_agent_id" />
 *
 * Optionally pass conversationInitData to override the agent's system prompt
 * or voice for this specific session (e.g. demo with org-specific intents).
 *
 * REQUIREMENTS:
 *   - Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in env (or pass agentId prop)
 *   - Agent must be configured in ElevenLabs dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, VolumeX, Volume2, Loader2 } from "lucide-react";

interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
}

interface ElevenLabsWidgetProps {
  agentId?: string;
  className?: string;
  inline?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
}

type Status = "idle" | "connecting" | "connected" | "error";

const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
  agentId,
  className = "",
  inline = false,
  onConnectionChange,
  onTranscriptUpdate,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string>("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // We lazy-import the ElevenLabs browser SDK to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef = useRef<any>(null);

  const resolvedAgentId = agentId ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startCall = useCallback(async () => {
    if (!resolvedAgentId) {
      setError("ElevenLabs agent ID not configured.");
      return;
    }
    try {
      setError("");
      setStatus("connecting");
      setTranscript([]);

      // Dynamic import to avoid SSR issues
      const { Conversation } = await import("@elevenlabs/client");

      const conversation = await Conversation.startSession({
        agentId: resolvedAgentId,
        onConnect: () => {
          setStatus("connected");
          onConnectionChange?.(true);
        },
        onDisconnect: () => {
          setStatus("idle");
          setIsSpeaking(false);
          onConnectionChange?.(false);
        },
        onError: (err: unknown) => {
          console.error("[ElevenLabs Widget] Error:", err);
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Call error: ${msg}`);
          setStatus("error");
        },
        onModeChange: (data: { mode: "speaking" | "listening" }) => {
          setIsSpeaking(data.mode === "speaking");
        },
        onMessage: (msg: { source: "user" | "ai"; message: string }) => {
          setTranscript((prev) => {
            const next: TranscriptEntry[] = [
              ...prev,
              { role: msg.source === "ai" ? "agent" : "user", text: msg.message },
            ];
            onTranscriptUpdate?.(next);
            return next;
          });
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("[ElevenLabs Widget] Failed to start session:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to start call: ${msg}`);
      setStatus("error");
    }
  }, [resolvedAgentId, onConnectionChange, onTranscriptUpdate]);

  const endCall = useCallback(async () => {
    try {
      await conversationRef.current?.endSession();
    } catch (err) {
      console.error("[ElevenLabs Widget] Error ending call:", err);
    }
    conversationRef.current = null;
    setStatus("idle");
    setIsSpeaking(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const toggleMute = useCallback(() => {
    if (!conversationRef.current) return;
    const newMuted = !isMuted;
    conversationRef.current.setMicMuted?.(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  if (!resolvedAgentId) return null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    inline ? (
      <div className={className}>{children}</div>
    ) : (
      <div className={`fixed bottom-6 right-6 z-50 font-sans ${className}`}>{children}</div>
    );

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <Wrapper>
      {!isConnected && !isConnecting ? (
        <div>
          <Button
            onClick={startCall}
            className="bg-lime-500 hover:bg-lime-600 text-black border-none rounded-full px-6 py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            disabled={isConnecting}
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Voice Demo
          </Button>
          {error && <p className="text-red-500 text-xs mt-2 max-w-xs">{error}</p>}
        </div>
      ) : isConnecting ? (
        <Button
          disabled
          className="bg-lime-400 text-black rounded-full px-6 py-4 text-base font-bold shadow-lg"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Connecting...
        </Button>
      ) : (
        <div className="bg-background rounded-2xl p-5 w-80 shadow-lg border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isSpeaking ? "bg-lime-400 animate-pulse" : "bg-lime-500"
                }`}
              />
              <span className="text-sm font-medium">
                {isSpeaking ? "Speaking..." : "Listening"}
              </span>
            </div>
            <Button
              onClick={endCall}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto mb-3 space-y-2 p-2 bg-muted/30 rounded-xl min-h-[80px]">
            {transcript.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Speak to see the conversation here
              </p>
            ) : (
              <>
                {transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-lime-500 text-black rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          <Button
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "outline"}
            size="sm"
            className="w-full"
          >
            {isMuted ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      )}
    </Wrapper>
  );
};

export default ElevenLabsWidget;
