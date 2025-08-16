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
      setError('请输入管理员密码');
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
      setError('请输入管理员密码');
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
        <h1 className="text-3xl font-bold">Gemini API 代理管理</h1>
        <div className="text-sm text-gray-500">
          {status?.timestamp && new Date(status.timestamp).toLocaleString()}
        </div>
      </div>

      {/* API Key Input */}
      <Card>
        <CardHeader>
          <CardTitle>管理员身份验证</CardTitle>
          <CardDescription>输入管理员密码访问管理功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">管理员密码</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入管理员密码"
            />
          </div>
          <Button onClick={fetchStatus} disabled={loading || !apiKey}>
            {loading ? '加载中...' : '刷新状态'}
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
              <CardTitle>环境配置</CardTitle>
              <CardDescription>当前系统设置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>请求限制：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>每分钟最大请求数: {status.environment.maxRequestsPerMinute}</li>
                    <li>每 IP 每日最大请求数: {status.environment.maxRequestsPerDayPerIP}</li>
                  </ul>
                </div>
                <div>
                  <strong>功能特性：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>虚拟流式传输: {status.environment.enableFakeStreaming ? '✅' : '❌'}</li>
                    <li>并发请求: {status.environment.enableConcurrentRequests ? '✅' : '❌'} ({status.environment.concurrentRequests})</li>
                    <li>伪装信息: {status.environment.enableDisguiseInfo ? '✅' : '❌'}</li>
                    <li>搜索模式: {status.environment.enableSearchMode ? '✅' : '❌'}</li>
                    <li>缓存: {status.environment.enableCache ? '✅' : '❌'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys Status */}
          <Card>
            <CardHeader>
              <CardTitle>API 密钥状态</CardTitle>
              <CardDescription>Gemini API 密钥管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.apiKeys.valid}</div>
                  <div className="text-sm text-gray-500">有效密钥</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{status.apiKeys.invalid}</div>
                  <div className="text-sm text-gray-500">无效密钥</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.apiKeys.total}</div>
                  <div className="text-sm text-gray-500">总密钥数</div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => manageKeys('validate')} disabled={loading}>
                  验证所有密钥
                </Button>
                <Button onClick={() => manageKeys('removeInvalid')} disabled={loading} variant="destructive">
                  删除无效密钥
                </Button>
                <Button onClick={() => manageKeys('getValid')} disabled={loading} variant="outline">
                  显示有效密钥
                </Button>
              </div>

              {/* Key Details */}
              {status.apiKeys.keys.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">密钥详情：</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {status.apiKeys.keys.map((key, index) => (
                      <div key={index} className={`p-2 rounded text-sm border ${ 
                        key.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono">{key.key}</span>
                          <span className={key.isValid ? 'text-green-600' : 'text-red-600'}>
                            {key.isValid ? '✅ 有效' : '❌ 无效'}
                          </span>
                        </div>
                        {key.errorCount > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            错误数: {key.errorCount} | 最后错误: {key.lastError}
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
              <CardTitle>请求限制统计</CardTitle>
              <CardDescription>当前请求限制状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>缓存统计：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>总缓存键: {status.rateLimit.totalKeys}</li>
                    <li>分钟缓存键: {status.rateLimit.minuteKeys}</li>
                    <li>日缓存键: {status.rateLimit.dayKeys}</li>
                  </ul>
                </div>
                <div>
                  <strong>命中统计：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>缓存命中: {status.rateLimit.cacheHits}</li>
                    <li>缓存未命中: {status.rateLimit.cacheMisses}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>响应缓存统计</CardTitle>
              <CardDescription>并发请求和缓存性能</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>缓存性能：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>总缓存键: {status.cache.totalKeys}</li>
                    <li>变体缓存键: {status.cache.variantKeys}</li>
                    <li>命中率: {(status.cache.hitRate * 100).toFixed(1)}%</li>
                  </ul>
                </div>
                <div>
                  <strong>设置：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>并发请求数: {status.cache.settings.concurrentRequests}</li>
                    <li>并发已启用: {status.cache.settings.enableConcurrent ? '✅' : '❌'}</li>
                    <li>缓存已启用: {status.cache.settings.enableCache ? '✅' : '❌'}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disguise Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>伪装信息</CardTitle>
              <CardDescription>反检测功能</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>状态：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>已启用: {status.disguise.enabled ? '✅' : '❌'}</li>
                  </ul>
                </div>
                <div>
                  <strong>资源：</strong>
                  <ul className="text-sm space-y-1 mt-1">
                    <li>模板数: {status.disguise.templates}</li>
                    <li>短语数: {status.disguise.phrases}</li>
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