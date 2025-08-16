'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Key, 
  Activity, 
  BarChart3, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Server,
  Zap
} from 'lucide-react';

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

export default function AdminDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // 配置状态
  const [config, setConfig] = useState({
    maxRequestsPerMinute: 30,
    maxRequestsPerDayPerIP: 600,
    enableFakeStreaming: true,
    enableConcurrentRequests: false,
    concurrentRequests: 1,
    enableDisguiseInfo: true,
    enableSearchMode: true,
    enableCache: true,
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 30000,
  });

  const fetchStatus = async () => {
    if (!password) {
      setError('请输入管理员密码');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/status', {
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus(data);
      setConfig({
        ...config,
        ...data.environment
      });
      setMessage('状态更新成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取状态失败');
    } finally {
      setLoading(false);
    }
  };

  const manageKeys = async (action: string, keyData?: string) => {
    if (!password) {
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
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, key: keyData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMessage(data.message);
      
      // 刷新状态
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('请输入API密钥');
      return;
    }
    await manageKeys('add', newApiKey);
    setNewApiKey('');
  };

  const saveConfig = async () => {
    if (!password) {
      setError('请输入管理员密码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('保存配置失败');
      }

      setMessage('配置保存成功');
      fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  useEffect(() => {
    if (password) {
      localStorage.setItem('admin_password', password);
    }
  }, [password]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Gemini API 代理服务</h1>
                <p className="text-white/70">管理面板</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={loading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新状态
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm">服务运行中</span>
              </div>
            </div>
          </div>
        </div>

        {/* 登录区域 */}
        {!status && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>管理员认证</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">管理员密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  onKeyPress={(e) => e.key === 'Enter' && fetchStatus()}
                />
              </div>
              <Button onClick={fetchStatus} disabled={loading || !password} className="w-full">
                {loading ? '登录中...' : '登录'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 消息显示 */}
        {message && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-6 text-green-800">
            {message}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {/* 主要内容 */}
        {status && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-md border border-white/20">
              <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
                <Activity className="w-4 h-4 mr-2" />
                运行状态
              </TabsTrigger>
              <TabsTrigger value="keys" className="text-white data-[state=active]:bg-white/20">
                <Key className="w-4 h-4 mr-2" />
                API调用统计
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-white data-[state=active]:bg-white/20">
                <Settings className="w-4 h-4 mr-2" />
                环境配置
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
                <BarChart3 className="w-4 h-4 mr-2" />
                分析统计
              </TabsTrigger>
            </TabsList>

            {/* 运行状态 */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-2">
                        {status.apiKeys.valid}
                      </div>
                      <div className="text-white/70">可用密钥数量</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {status.apiKeys.valid}
                      </div>
                      <div className="text-white/70">可用模型数量</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-2">
                        {status.cache.settings.concurrentRequests}
                      </div>
                      <div className="text-white/70">最大重试次数</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* API Key 管理 */}
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">API调用统计</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => manageKeys('add')}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加API密钥
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => manageKeys('validate')}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      检查API密钥
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => manageKeys('removeInvalid')}
                    >
                      清除失效密钥
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      导出有效密钥
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">0</div>
                      <div className="text-white/70">24小时调用次数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">0</div>
                      <div className="text-white/70">小时调用次数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-2">0</div>
                      <div className="text-white/70">分钟调用次数</div>
                    </div>
                  </div>

                  {/* 添加新密钥 */}
                  <div className="flex space-x-2 mb-4">
                    <Input
                      placeholder="输入新的API密钥"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Button onClick={addApiKey} disabled={loading}>
                      添加
                    </Button>
                  </div>

                  {/* API Keys 列表 */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {status.apiKeys.keys.map((key, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          key.isValid 
                            ? 'bg-green-900/20 border-green-500/30' 
                            : 'bg-red-900/20 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {key.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <div>
                            <div className="font-mono text-white">{key.key}</div>
                            {key.lastError && (
                              <div className="text-xs text-red-400 mt-1">
                                错误: {key.lastError}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={key.isValid ? "default" : "destructive"}>
                            {key.isValid ? '有效' : '无效'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => manageKeys('remove', key.key)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 环境配置 */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">基本配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-white mb-2 block">每分钟请求限制</Label>
                      <Input
                        type="number"
                        value={config.maxRequestsPerMinute}
                        onChange={(e) => setConfig({...config, maxRequestsPerMinute: parseInt(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">每IP每日请求限制</Label>
                      <Input
                        type="number"
                        value={config.maxRequestsPerDayPerIP}
                        onChange={(e) => setConfig({...config, maxRequestsPerDayPerIP: parseInt(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">功能配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-white">联网搜索</Label>
                      <Switch
                        checked={config.enableSearchMode}
                        onCheckedChange={(checked) => setConfig({...config, enableSearchMode: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">流式传输</Label>
                      <Switch
                        checked={config.enableFakeStreaming}
                        onCheckedChange={(checked) => setConfig({...config, enableFakeStreaming: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-white">伪装信息</Label>
                      <Switch
                        checked={config.enableDisguiseInfo}
                        onCheckedChange={(checked) => setConfig({...config, enableDisguiseInfo: checked})}
                      />
                    </div>
                  </div>

                  <div className="text-white/70 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
                    联网搜索提示：使用搜索工具连联网搜索，需要在content中结合搜索内容
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-white mb-2 block">最大重试次数</Label>
                      <Input
                        type="number"
                        value={config.maxRetries || 15}
                        onChange={(e) => setConfig({...config, maxRetries: parseInt(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">流式传输间隔(秒)</Label>
                      <Input
                        type="number"
                        value={1}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">伪装信息长度</Label>
                      <Input
                        type="number"
                        value={5}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-white mb-2 block">数据并发请求</Label>
                      <Input
                        type="number"
                        value={config.concurrentRequests}
                        onChange={(e) => setConfig({...config, concurrentRequests: parseInt(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">失败时增加密钥数</Label>
                      <Input
                        type="number"
                        value={0}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">最大并发请求</Label>
                      <Input
                        type="number"
                        value={3}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">空闲应急试限制</Label>
                    <Input
                      type="number"
                      value={5}
                      className="bg-white/10 border-white/20 text-white w-32"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">管理密码</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">请输入管理密码以保存更改</p>
                  <Button 
                    onClick={saveConfig} 
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {loading ? '保存中...' : '保存基本与功能配置'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 其他标签页内容... */}
            <TabsContent value="keys">
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardContent className="p-6">
                  <div className="text-white text-center">API调用统计功能开发中...</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="bg-white/10 backdrop-blur-md border border-white/20">
                <CardContent className="p-6">
                  <div className="text-white text-center">分析统计功能开发中...</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}