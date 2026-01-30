'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AnalyticsCards({ from, to, assistantId }:{
  from: string; to: string; assistantId?: string;
}) {
  const qs = new URLSearchParams({ from, to, ...(assistantId ? {assistantId}: {}) });
  const { data, error, isLoading } = useSWR(`/api/analytics/summary?${qs}`, fetcher, { revalidateOnFocus:false });

  if (error) return <div className="text-red-600">Error: {error.message}</div>;
  if (isLoading || !data) return <div>Loading analytics…</div>;

  const { totals, kpis, buckets } = data;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card title="Total Calls" value={totals.totalCalls} />
        <Card title="Inbound" value={totals.inbound} />
        <Card title="Outbound" value={totals.outbound} />
        <Card title="Success Rate" value={`${kpis.successRate}%`} />
        <Card title="Avg Duration" value={`${kpis.averageCallDurationSec}s`} />
        <Card title="Drop Rate" value={`${kpis.dropRate}%`} />
      </div>

      {/* Простейший «спарклайн» без внешних либ */}
      <div className="p-4 border rounded">
        <div className="mb-2 font-medium">Daily calls</div>
        <MiniChart data={buckets.daily.map((p:any)=>p.count)} height={60} />
      </div>
    </div>
  );
}

function Card({ title, value }:{title:string; value:string|number}) {
  return (
    <div className="p-4 border rounded">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

// Мини-чарт на <svg>, чтобы не тащить библиотеку
function MiniChart({ data, height=60}:{data:number[]; height?:number}) {
  if (!data?.length) return <div className="text-sm text-gray-400">No data</div>;
  const max = Math.max(...data);
  const step = 100 / (data.length - 1 || 1);
  const points = data.map((y,i)=>{
    const px = (i*step).toFixed(2);
    const py = (max ? (100 - (y/max)*100) : 100).toFixed(2);
    return `${px},${py}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" width="100%" height={height} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}