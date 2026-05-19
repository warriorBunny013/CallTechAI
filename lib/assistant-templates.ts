/**
 * Receptionist-style assistant templates (aligned with ElevenLabs browse templates).
 * Used in the dashboard wizard before voice / language / prompt customization.
 */

export type AssistantTemplateId =
  | "appointment-scheduler"
  | "automobile-service"
  | "restaurant-host"
  | "healthcare-receptionist";

export interface AssistantTemplate {
  id: AssistantTemplateId;
  name: string;
  description: string;
  /** Lucide-style category label for UI */
  category: string;
  icon: "calendar" | "car" | "utensils" | "heart-pulse";
  /** Primary use case shown on card */
  highlights: string[];
  defaultSystemPrompt: string;
  defaultFirstMessage: string;
  /** Only appointment scheduler gets Google Calendar tools */
  hasCalendarTools: boolean;
  suggestedLanguages: string[];
}

const ORG = "{{org_name}}";
const AGENT = "{{agent_name}}";

export const ASSISTANT_TEMPLATES: AssistantTemplate[] = [
  {
    id: "appointment-scheduler",
    name: "Appointment Scheduler",
    description:
      "Books appointments, checks availability, and confirms details with callers. Ideal for clinics, salons, and professional services.",
    category: "Scheduling",
    icon: "calendar",
    highlights: ["Google Calendar booking", "Availability checks", "Email confirmations"],
    hasCalendarTools: true,
    suggestedLanguages: ["en"],
    defaultFirstMessage: `Hello! You've reached ${ORG}. This is ${AGENT}. How can I help you schedule your visit today?`,
    defaultSystemPrompt: `You are ${AGENT}, a professional appointment scheduling assistant for ${ORG}.

Your job is to help callers book appointments, check availability, and answer basic questions about ${ORG}.

## Booking flow
1. When someone wants to book, ask what date works best.
2. Use checkAvailability to find open slots — never invent times.
3. Once they pick a slot, collect: full name, email, and purpose of visit.
4. Use bookAppointment to confirm. Repeat date, time, and email back to the caller.

## Style
- Warm, concise, one question at a time
- Perfect for phone conversations (under 30 words when possible)
- If unsure, offer to have a team member call them back

Current date: {{current_date}}`,
  },
  {
    id: "automobile-service",
    name: "Automobile Service / Repair",
    description:
      "Handles service inquiries, repair status, and booking for auto shops and dealerships.",
    category: "Automotive",
    icon: "car",
    highlights: ["Service booking", "Repair status", "Hours & pricing FAQs"],
    hasCalendarTools: true,
    suggestedLanguages: ["en"],
    defaultFirstMessage: `Thanks for calling ${ORG}. This is ${AGENT}. Are you calling about a repair, maintenance, or something else?`,
    defaultSystemPrompt: `You are ${AGENT}, the friendly front-desk voice for ${ORG}, an automobile service and repair business.

Help callers with:
- Scheduling service or repair appointments
- Basic questions about hours, location, and services offered
- Collecting vehicle details (make, model, year) and symptoms when relevant
- Escalating complex technical questions to a human advisor

## Booking
If the caller wants an appointment, follow the same booking tools flow (check availability, then book).

## Style
- Confident and helpful, not overly technical
- Confirm details before ending the call
- Never guess parts pricing — offer a callback from the service team if needed`,
  },
  {
    id: "restaurant-host",
    name: "Restaurant Host",
    description:
      "Takes reservations, answers menu and hours questions, and manages waitlist-style requests.",
    category: "Hospitality",
    icon: "utensils",
    highlights: ["Reservations", "Hours & menu FAQs", "Party size handling"],
    hasCalendarTools: true,
    suggestedLanguages: ["en", "es"],
    defaultFirstMessage: `Thank you for calling ${ORG}! This is ${AGENT}. Would you like to make a reservation or do you have a question about our restaurant?`,
    defaultSystemPrompt: `You are ${AGENT}, the host for ${ORG} restaurant.

Help callers with:
- Table reservations (party size, date, time, name, phone)
- Hours, location, parking, and dietary accommodation questions
- Special events or large groups (6+ guests) — note details for the manager

## Reservations
Use checkAvailability and bookAppointment for reservation slots when calendar is connected.
Treat "reservation" the same as an appointment; purpose can be "dinner reservation".

## Style
- Welcoming and upbeat
- Repeat reservation details clearly before hanging up`,
  },
  {
    id: "healthcare-receptionist",
    name: "Healthcare Receptionist",
    description:
      "Schedules patient visits, triages non-emergency calls, and shares clinic information.",
    category: "Healthcare",
    icon: "heart-pulse",
    highlights: ["Patient scheduling", "Clinic FAQs", "Emergency redirect"],
    hasCalendarTools: true,
    suggestedLanguages: ["en"],
    defaultFirstMessage: `You've reached ${ORG}. This is ${AGENT}. How may I assist you today?`,
    defaultSystemPrompt: `You are ${AGENT}, a healthcare receptionist for ${ORG}.

## Priorities
1. If the caller describes chest pain, trouble breathing, severe bleeding, or a life-threatening emergency — tell them to hang up and call emergency services (911) immediately.
2. For appointments: use checkAvailability then bookAppointment.
3. For general questions: use the knowledge base and intents (hours, insurance, location).

## Collect for appointments
- Patient full name
- Email for confirmation
- Reason for visit (brief)
- Preferred date and time

## Style
- Calm, empathetic, HIPAA-aware tone (do not ask for unnecessary sensitive details on the phone)
- Never provide medical diagnosis — only scheduling and general clinic information`,
  },
];

export function getAssistantTemplateById(id: string): AssistantTemplate | undefined {
  return ASSISTANT_TEMPLATES.find((t) => t.id === id);
}

export function resolveTemplatePrompt(
  template: AssistantTemplate,
  orgName: string,
  agentName: string
): { systemPrompt: string; firstMessage: string } {
  return {
    systemPrompt: template.defaultSystemPrompt
      .replace(/\{\{org_name\}\}/g, orgName)
      .replace(/\{\{agent_name\}\}/g, agentName)
      .replace(/\{\{current_date\}\}/g, new Date().toISOString().slice(0, 10)),
    firstMessage: template.defaultFirstMessage
      .replace(/\{\{org_name\}\}/g, orgName)
      .replace(/\{\{agent_name\}\}/g, agentName),
  };
}
