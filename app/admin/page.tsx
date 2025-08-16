'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SystemStatus {
  timestamp: string;
  apiKeys: {
    total: number;
    valid: number;
    invalid: number;
    keys: Array<{
      key: string;
      isValid: boolean;
      errorCount: number;
      lastChecked: number;
      lastError?: string;
    }>;
  };
  rateLimit: {
    totalKeys: number;
    minuteKeys: number;
    dayKeys: number;
    cacheHits: number;
    cacheMisses: number;
  };
  cache: {
    totalKeys: number;
    hits: number;
    misses: number;
    hitRate: number;
    variantKeys: number;
    settings: {
      concurrentRequests: number;
      enableConcurrent: boolean;
      enableCache: boolean;
    };
  };
  disguise: {
    enabled: boolean;
    templates: number;
    phrases: number;
  };
  environment: {
    maxRequestsPerMinute: number;
    maxRequestsPerDayPerIP: number;
    enableFakeStreaming: boolean;
    enableConcurrentRequests: boolean;
    concurrentRequests: number;
    enableDisguiseInfo: boolean;
    enableSearchMode: boolean;
    enableCache: boolean;
  };
}

export default function AdminPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    if (!apiKey) {
      setError('Please enter admin API key');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/status', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data);
      setMessage('Status updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const manageKeys = async (action: string) => {
    if (!apiKey) {
      setError('Please enter admin API key');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMessage(data.message);
      
      // Refresh status after key management
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to manage keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to load API key from localStorage
    const savedKey = localStorage.getItem('admin_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    // Save API key to localStorage
    if (apiKey) {
      localStorage.setItem('admin_api_key', apiKey);
    }
  }, [apiKey]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gemini API Proxy Admin</h1>
        <div className="text-sm text-gray-500">
          {status?.timestamp && new Date(status.timestamp).toLocaleString()}
        </div>
      </div>

      {/* API Key Input */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Authentication</CardTitle>
          <CardDescription>Enter your admin API key to access management features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Admin API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter admin API key"
            />
          </div>
          <Button onClick={fetchStatus} disabled={loading || !apiKey}>
            {loading ? 'Loading...' : 'Refresh Status'}
          </Button>
        </CardContent>
      </Card>

      {/* Messages */}
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {message}
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      {/* System Status */}
      {status && (
        <>
          {/* Environment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Current system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Rate Limiting:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Max requests/minute: {status.environment.maxRequestsPerMinute}</li>
                    <li>Max requests/day/IP: {status.environment.maxRequestsPerDayPerIP}</li>
                  </ul>
                </div>
                <div>
                  <strong>Features:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Fake Streaming: {status.environment.enableFakeStreaming ? '✅' : '❌'}</li>
                    <li>Concurrent Requests: {status.environment.enableConcurrentRequests ? '✅' : '❌'} ({status.environment.concurrentRequests})</li>
                    <li>Disguise Info: {status.environment.enableDisguiseInfo ? '✅' : '❌'}</li>
                    <li>Search Mode: {status.environment.enableSearchMode ? '✅' : '❌'}</li>
                    <li>Cache: {status.environment.enableCache ? '✅' : '❌'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys Status */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys Status</CardTitle>
              <CardDescription>Gemini API keys management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.apiKeys.valid}</div>
                  <div className="text-sm text-gray-500">Valid Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{status.apiKeys.invalid}</div>
                  <div className="text-sm text-gray-500">Invalid Keys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.apiKeys.total}</div>
                  <div className="text-sm text-gray-500">Total Keys</div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => manageKeys('validate')} disabled={loading}>
                  Validate All Keys
                </Button>
                <Button onClick={() => manageKeys('removeInvalid')} disabled={loading} variant="destructive">
                  Remove Invalid Keys
                </Button>
                <Button onClick={() => manageKeys('getValid')} disabled={loading} variant="outline">
                  Show Valid Keys
                </Button>
              </div>

              {/* Key Details */}
              {status.apiKeys.keys.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Key Details:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {status.apiKeys.keys.map((key, index) => (
                      <div key={index} className={`p-2 rounded text-sm border ${ 
                        key.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono">{key.key}</span>
                          <span className={key.isValid ? 'text-green-600' : 'text-red-600'}>
                            {key.isValid ? '✅ Valid' : '❌ Invalid'}
                          </span>
                        </div>
                        {key.errorCount > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            Errors: {key.errorCount} | Last Error: {key.lastError}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rate Limiting Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Statistics</CardTitle>
              <CardDescription>Current rate limiting status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Cache Statistics:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Total Keys: {status.rateLimit.totalKeys}</li>
                    <li>Minute Keys: {status.rateLimit.minuteKeys}</li>
                    <li>Day Keys: {status.rateLimit.dayKeys}</li>
                  </ul>
                </div>
                <div>
                  <strong>Hit Statistics:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Cache Hits: {status.rateLimit.cacheHits}</li>
                    <li>Cache Misses: {status.rateLimit.cacheMisses}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Response Cache Statistics</CardTitle>
              <CardDescription>Concurrent requests and caching performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Cache Performance:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Total Keys: {status.cache.totalKeys}</li>
                    <li>Variant Keys: {status.cache.variantKeys}</li>
                    <li>Hit Rate: {(status.cache.hitRate * 100).toFixed(1)}%</li>
                  </ul>
                </div>
                <div>
                  <strong>Settings:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Concurrent Requests: {status.cache.settings.concurrentRequests}</li>
                    <li>Concurrent Enabled: {status.cache.settings.enableConcurrent ? '✅' : '❌'}</li>
                    <li>Cache Enabled: {status.cache.settings.enableCache ? '✅' : '❌'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disguise Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Disguise Information</CardTitle>
              <CardDescription>Anti-detection features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Status:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Enabled: {status.disguise.enabled ? '✅' : '❌'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Resources:</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>Templates: {status.disguise.templates}</li>
                    <li>Phrases: {status.disguise.phrases}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}