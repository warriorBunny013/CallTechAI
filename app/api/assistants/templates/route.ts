import { NextResponse } from "next/server";
import { ASSISTANT_TEMPLATES } from "@/lib/assistant-templates";

export async function GET() {
  return NextResponse.json({
    templates: ASSISTANT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      highlights: t.highlights,
      hasCalendarTools: t.hasCalendarTools,
      suggestedLanguages: t.suggestedLanguages,
      defaultSystemPrompt: t.defaultSystemPrompt,
      defaultFirstMessage: t.defaultFirstMessage,
    })),
  });
}
