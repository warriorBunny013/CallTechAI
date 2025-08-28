// app/api/analytics/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';

const VAPI_BASE = 'https://api.vapi.ai/v1';

// ----------------- cache (60s) -----------------
type CacheItem = { ts: number; payload: any };
const cache = new Map<string, CacheItem>();
const cacheKey = (o: unknown) => JSON.stringify(o);
const now = () => Date.now();

// ----------------- HTTP to Vapi ----------------
type ListCallsOpts = {
  from?: string;
  to?: string;
  assistantId?: string;
  limit?: number;
  cursor?: string | null;
};

type VapiCall = Record<string, any>;

async function listCalls(opts: ListCallsOpts = {}) {
  const { from, to, assistantId, limit = 100, cursor } = opts;
  const p = new URLSearchParams();
  if (from) p.set('from', new Date(from).toISOString());
  if (to) p.set('to', new Date(to).toISOString());
  if (assistantId) p.set('assistantId', assistantId);
  p.set('limit', String(limit));
  if (cursor) p.set('cursor', cursor ?? '');

  const res = await fetch(`${VAPI_BASE}/calls?${p.toString()}`, {
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi listCalls failed ${res.status}: ${text}`);
  }
  return (await res.json()) as { items: VapiCall[]; nextCursor?: string | null };
}

async function listAllCalls(opts: ListCallsOpts = {}) {
  let cursor: string | null | undefined = null;
  const all: VapiCall[] = [];
  do {
    const page = await listCalls({ ...opts, cursor });
    if (page.items?.length) all.push(...page.items);
    cursor = page.nextCursor ?? null;
  } while (cursor);
  return all;
}

// ----------------- normalize & metrics ----------
type Call = {
  startedAt: string;
  direction: 'inbound' | 'outbound' | string;
  status: string;
  durationSec: number;
  transferred: boolean;
  dropped: boolean;
  success: boolean;
  fallbackUsed: boolean;
};

function normalizeCall(r: VapiCall): Call | null {
  const startedAt: string | undefined = r.startedAt || r.startTime || r.createdAt;
  if (!startedAt) return null;

  const endedAt: string | undefined = r.endedAt || r.endTime || r.completedAt;
  const direction: Call['direction'] = r.direction || r.type || 'inbound';
  const status: string = r.status || 'completed';

  const durationSec: number =
    r.durationSec ??
    (endedAt ? Math.max(0, Math.round((+new Date(endedAt) - +new Date(startedAt)) / 1000)) : 0);

  const transferred = Boolean(r.transferred || r.transferTarget || status === 'transferred');
  const dropped = Boolean(
    r.dropped || status === 'dropped' || status === 'no_answer' || status === 'canceled',
  );
  const success = status === 'completed';
  const tags: string[] = r.tags || r.metadata?.tags || [];
  const fallbackUsed = Boolean(r.fallbackUsed || tags.includes('fallback'));

  return { startedAt, direction, status, durationSec, transferred, dropped, success, fallbackUsed };
}

// ---- bucketing utils (без внешних либ) ----
const dateKey = (iso: string) => new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD
const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const weekKey = (d: Date) => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (copy.getUTCDay() + 6) % 7; // Monday=0
  copy.setUTCDate(copy.getUTCDate() - dow);
  const y = copy.getUTCFullYear();
  const oneJan = new Date(Date.UTC(y, 0, 1));
  const week = Math.floor((+copy - +oneJan) / 86400000 / 7) + 1;
  return `${y}-W${String(week).padStart(2, '0')}`;
};

type BucketDay = { date: string; count: number };
type BucketWeek = { week: string; count: number };
type BucketMonth = { month: string; count: number };

function bucketDaily(calls: Call[]): BucketDay[] {
  const m = new Map<string, BucketDay>();
  for (const c of calls) {
    const k = dateKey(c.startedAt);
    const prev = m.get(k) ?? { date: k, count: 0 };
    prev.count++;
    m.set(k, prev);
  }
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function bucketWeekly(calls: Call[]): BucketWeek[] {
  const m = new Map<string, BucketWeek>();
  for (const c of calls) {
    const wk = weekKey(new Date(c.startedAt));
    const prev = m.get(wk) ?? { week: wk, count: 0 };
    prev.count++;
    m.set(wk, prev);
  }
  return [...m.values()].sort((a, b) => a.week.localeCompare(b.week));
}

function bucketMonthly(calls: Call[]): BucketMonth[] {
  const m = new Map<string, BucketMonth>();
  for (const c of calls) {
    const mk = monthKey(new Date(c.startedAt));
    const prev = m.get(mk) ?? { month: mk, count: 0 };
    prev.count++;
    m.set(mk, prev);
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function calcKpis(calls: Call[]) {
  const total = Math.max(1, calls.length);
  const pct = (n: number) => +((n / total) * 100).toFixed(1);
  const sumDur = calls.reduce((s, c) => s + (c.durationSec || 0), 0);
  return {
    successRate: pct(calls.filter((c) => c.success).length),
    transferRate: pct(calls.filter((c) => c.transferred).length),
    dropRate: pct(calls.filter((c) => c.dropped).length),
    fallbackRate: pct(calls.filter((c) => c.fallbackUsed).length),
    averageCallDurationSec: Math.round(sumDur / total),
  };
}

// ----------------- GET handler -----------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const assistantId = searchParams.get('assistantId') || process.env.VAPI_ASSISTANT_ID || undefined;

    // cache
    const key = cacheKey({ from, to, assistantId });
    const hit = cache.get(key);
    if (hit && now() - hit.ts < 60_000) {
      return NextResponse.json(hit.payload);
    }

    const raw = await listAllCalls({ from, to, assistantId });
    const calls = raw.map(normalizeCall).filter((c): c is Call => Boolean(c));

    const payload = {
      totals: {
        totalCalls: calls.length,
        inbound: calls.filter((c) => c.direction === 'inbound').length,
        outbound: calls.filter((c) => c.direction === 'outbound').length,
      },
      kpis: calcKpis(calls),
      buckets: {
        daily: bucketDaily(calls),
        weekly: bucketWeekly(calls),
        monthly: bucketMonthly(calls),
      },
    };

    cache.set(key, { ts: now(), payload });
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error('Analytics API error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}