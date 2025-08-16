# Next Gemini API Proxy

现代化的 Gemini API 代理服务，具有完整的管理功能。

## 功能特性

- 🔐 简化的密码登录系统
- 🌏 完全中文化界面
- 📊 实时统计和监控
- 🔑 API 密钥管理
- ⚙️ 系统配置管理
- 🎨 现代化响应式设计

## 快速开始

1. 设置环境变量：
   - `GEMINI_API_KEYS`: 你的 Gemini API 密钥（多个用逗号分隔）
   - `PASSWORD`: 管理员密码
   - `POSTGRES_URL`: PostgreSQL 数据库连接字符串
   - `AUTH_SECRET`: JWT 密钥

2. 访问管理界面：
   - 登录：`/login`
   - 管理仪表板：`/admin/dashboard`

## API 使用

兼容 OpenAI API 格式：

```
POST /v1/chat/completions
```

更新时间：Sat Aug 16 06:04:58 AM EDT 2025

