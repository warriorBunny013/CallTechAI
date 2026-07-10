import AnalyticsCards from '@/components/AnalyticsCards';

export default function AnalyticsPage() {
  const from = new Date(Date.now()-30*24*3600*1000).toISOString().slice(0,10); // last 30 days
  const to = new Date().toISOString().slice(0,10);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
      <AnalyticsCards from={from} to={to} />
    </main>
  );
}