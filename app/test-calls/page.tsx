'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestCallsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCallsAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/calls');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to fetch calls');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const testVapiDirectly = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test different Vapi endpoints
      const endpoints = [
        'https://api.vapi.ai/calls',
        'https://api.vapi.ai/v1/calls', 
        'https://api.vapi.ai/assistants',
        'https://api.vapi.ai/v1/assistants'
      ];

      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_VAPI_API_KEY || 'test'}`,
              'Content-Type': 'application/json',
            },
          });
          
          results.push({
            endpoint,
            status: response.status,
            ok: response.ok,
            text: await response.text()
          });
        } catch (err: any) {
          results.push({
            endpoint,
            error: err.message
          });
        }
      }
      
      setResult(results);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Test Calls API</h1>
      
      <div className="flex gap-4">
        <Button onClick={testCallsAPI} disabled={loading}>
          {loading ? 'Testing...' : 'Test Calls API'}
        </Button>
        
        <Button onClick={testVapiDirectly} disabled={loading} variant="outline">
          {loading ? 'Testing...' : 'Test Vapi Endpoints'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-red-700">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Testing Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Browser Test</h3>
            <p className="text-sm text-gray-600 mb-2">
              Visit: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000/api/calls</code>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Terminal Test</h3>
            <p className="text-sm text-gray-600 mb-2">
              Run: <code className="bg-gray-100 px-2 py-1 rounded">curl -X GET http://localhost:3000/api/calls</code>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Environment Check</h3>
            <p className="text-sm text-gray-600 mb-2">
              Make sure <code className="bg-gray-100 px-2 py-1 rounded">VAPI_API_KEY</code> is set in your <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Vapi Documentation</h3>
            <p className="text-sm text-gray-600 mb-2">
              Check the correct endpoint at: <a href="https://docs.vapi.ai" className="text-blue-600 hover:underline">https://docs.vapi.ai</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 