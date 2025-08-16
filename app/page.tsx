'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [baseUrl, setBaseUrl] = useState('https://your-domain.vercel.app');
  
  useEffect(() => {
    // Auto-detect current domain
    if (typeof window !== 'undefined') {
      setBaseUrl(`${window.location.protocol}//${window.location.host}`);
    }
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          Gemini API 代理服务
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          基于 Next.js 的 Google Gemini API 代理服务，具有 OpenAI 兼容性、
          请求限制、缓存和高级功能，适用于 Vercel 生产环境部署。
        </p>
        <div className="flex gap-4 justify-center mb-12">
          <Link href="/admin">
            <Button size="lg">
              管理仪表板
            </Button>
          </Link>
          <Link href="#api-usage">
            <Button variant="outline" size="lg">
              API 文档
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <CardTitle>OpenAI 兼容</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              完全兼容 OpenAI API，支持 /v1/models 和 /v1/chat/completions 端点。
              支持流式和非流式响应。
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <CardTitle>高级功能</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              API 密钥轮换、请求限制、并发请求、缓存、虚拟流式传输和
              反检测伪装功能。
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <CardTitle>Vercel 优化</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              专为 Vercel 无服务器部署优化，支持边缘函数和
              自动扩展功能。
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* API Usage Documentation */}
      <div id="api-usage" className="mt-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">API 使用</CardTitle>
            <CardDescription>如何使用 Gemini API 代理服务的 OpenAI 兼容端点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Models Endpoint */}
            <div>
              <h3 className="text-lg font-semibold mb-2">获取可用模型列表</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <code className="text-sm">
                  GET {baseUrl}/api/v1/models
                </code>
              </div>
            </div>

            {/* Chat Completions */}
            <div>
              <h3 className="text-lg font-semibold mb-2">聊天完成</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <code className="text-sm whitespace-pre-wrap">
{`POST ${baseUrl}/api/v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_PASSWORD

{
  "model": "gemini-2.5-pro",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "stream": false
}`}
                </code>
              </div>
            </div>

            {/* Available Models */}
            <div>
              <h3 className="text-lg font-semibold mb-2">可用模型</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">标准模型：</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• gemini-2.5-pro</li>
                    <li>• gemini-2.5-flash</li>
                    <li>• gemini-1.5-pro</li>
                    <li>• gemini-1.5-flash</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">搬索增强模型：</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• gemini-2.5-pro-search</li>
                    <li>• gemini-2.5-flash-search</li>
                    <li>• gemini-1.5-pro-search</li>
                    <li>• gemini-1.5-flash-search</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Environment Configuration</h3>
              <div className="text-sm space-y-1 text-gray-600">
                <p>Configure the following environment variables:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><code>GEMINI_API_KEYS</code> - Comma-separated list of Gemini API keys</li>
                  <li><code>PASSWORD</code> - Optional password for API access (default: "123")</li>
                  <li><code>MAX_REQUESTS_PER_MINUTE</code> - Rate limit per minute (default: 30)</li>
                  <li><code>MAX_REQUESTS_PER_DAY_PER_IP</code> - Rate limit per day per IP (default: 600)</li>
                  <li><code>ENABLE_FAKE_STREAMING</code> - Enable fake streaming (default: true)</li>
                  <li><code>ENABLE_CONCURRENT_REQUESTS</code> - Enable concurrent requests (default: false)</li>
                  <li><code>ENABLE_DISGUISE_INFO</code> - Enable request disguising (default: true)</li>
                  <li><code>ENABLE_CACHE</code> - Enable response caching (default: true)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}