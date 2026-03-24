/**
 * Custom VAPI function tool definitions for appointment booking.
 *
 * These are type: "function" tools that call OUR OWN API endpoints.
 * No VAPI Google OAuth needed — we use the org's stored Google Calendar tokens directly.
 *
 * Usage: include these in model.tools when creating or patching a VAPI assistant.
 */

export function buildBookingTools(appUrl: string) {
  const base = appUrl.replace(/\/$/, "");

  return [
    {
      type: "function",
      function: {
        name: "checkAvailability",
        description:
          "Check available appointment slots for a given date. Call this when the customer wants to book an appointment or asks when you are available. Ask for their preferred date first.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description:
                "The date to check for available slots, in YYYY-MM-DD format (e.g. 2024-12-20).",
            },
          },
          required: ["date"],
        },
      },
      server: {
        url: `${base}/api/vapi-tools/check-availability`,
        // Allow up to 60 s — Google Calendar API calls can be slow
        timeoutSeconds: 60,
      },
    },
    {
      type: "function",
      function: {
        name: "scheduleAppointment",
        description:
          "Book an appointment for a customer on a specific date and time. Only call this after confirming availability with checkAvailability. Collect the customer's name, email, preferred date and time, and the purpose of the appointment before calling.",
        parameters: {
          type: "object",
          properties: {
            customerName: {
              type: "string",
              description: "The full name of the customer.",
            },
            customerEmail: {
              type: "string",
              description:
                "The customer's email address. A Google Calendar invite will be sent here.",
            },
            date: {
              type: "string",
              description: "Appointment date in YYYY-MM-DD format (e.g. 2024-12-20).",
            },
            time: {
              type: "string",
              description:
                "Appointment time in HH:MM 24-hour format (e.g. 14:30) or H:MM AM/PM format (e.g. 2:30 PM).",
            },
            purpose: {
              type: "string",
              description:
                "The purpose or reason for the appointment (e.g. 'dental cleaning', 'consultation', 'general checkup'). Used as the calendar event title.",
            },
            customerPhone: {
              type: "string",
              description: "Customer's phone number (optional).",
            },
          },
          required: ["customerName", "customerEmail", "date", "time", "purpose"],
        },
      },
      server: {
        url: `${base}/api/vapi-tools/book-appointment`,
        // Allow up to 60 s — token refresh + freeBusy + calendar event creation can stack up
        timeoutSeconds: 60,
      },
    },
  ] as const;
}

export type BookingTools = ReturnType<typeof buildBookingTools>;
