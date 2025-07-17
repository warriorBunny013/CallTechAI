
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.vapi.ai/v1/calls', {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch call records: ${response.status}`);
    }

    const data = await response.json();

    const formatted = data.map((call: any) => ({
      phone: call.to_number,
      datetime: new Date(call.started_at).toLocaleString(),
      duration: call.duration_seconds
        ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
        : 'N/A',
      recordingUrl: call.recording_url || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Call records API error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}