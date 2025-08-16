# Gemini API Proxy

A Next.js-based proxy server for Google's Gemini API with OpenAI compatibility, designed for deployment on Vercel with advanced features including rate limiting, caching, and anti-detection capabilities.

## Features

### 🔑 Core Functionality
- **OpenAI Compatible API**: Drop-in replacement for OpenAI API endpoints
- **API Key Management**: Automatic rotation and validation of multiple Gemini API keys
- **Rate Limiting**: Configurable per-minute and per-day rate limits
- **Streaming Support**: Both real and fake streaming responses

### 🚀 Advanced Features
- **Concurrent Requests**: Send multiple parallel requests for better reliability
- **Response Caching**: Cache successful responses for faster regeneration
- **Fake Streaming**: Maintain connection with keep-alive while making single requests
- **Request Disguising**: Add random context to avoid automated detection
- **Search Mode**: Enable Google Search integration with `-search` model suffix

### 🛡️ Security & Management
- **Password Protection**: Optional API key authentication
- **Admin Dashboard**: Web interface for monitoring and management
- **Error Handling**: Comprehensive error tracking and key failure management
- **CORS Support**: Proper cross-origin resource sharing configuration

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/gemini-proxy)

### 2. Environment Variables

Configure the following environment variables in your Vercel dashboard:

```bash
# Required
GEMINI_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3
BASE_URL=https://your-deployment.vercel.app

# Optional Authentication
PASSWORD=your-secure-password

# Rate Limiting (defaults shown)
MAX_REQUESTS_PER_MINUTE=30
MAX_REQUESTS_PER_DAY_PER_IP=600

# Feature Flags (defaults shown)
ENABLE_FAKE_STREAMING=true
ENABLE_CONCURRENT_REQUESTS=false
CONCURRENT_REQUESTS=1
ENABLE_DISGUISE_INFO=true
ENABLE_SEARCH_MODE=true
ENABLE_CACHE=true

# Database (for user authentication - optional)
POSTGRES_URL=your-postgres-connection-string
AUTH_SECRET=your-jwt-secret
```

### 3. Get Gemini API Keys

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API keys
3. Add them to `GEMINI_API_KEYS` (comma-separated)

## API Usage

### List Models

```bash
curl https://your-deployment.vercel.app/api/v1/models
```

### Chat Completions (Non-streaming)

```bash
curl -X POST https://your-deployment.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

### Chat Completions (Streaming)

```bash
curl -X POST https://your-deployment.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true
  }'
```

## Available Models

### Standard Models
- `gemini-2.5-pro` - Latest Gemini Pro model
- `gemini-2.5-flash` - Fast Gemini model
- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash

### Search-Enabled Models
- `gemini-2.5-pro-search` - Pro model with Google Search
- `gemini-2.5-flash-search` - Flash model with Google Search  
- `gemini-1.5-pro-search` - 1.5 Pro with Google Search
- `gemini-1.5-flash-search` - 1.5 Flash with Google Search

## Admin Dashboard

Access the admin dashboard at `https://your-deployment.vercel.app/admin`

Features:
- System status monitoring
- API key validation and management
- Rate limiting statistics
- Cache performance metrics
- Feature configuration display

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd gemini-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run development server:
```bash
npm run dev
```

5. Access the application:
- Homepage: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin`
- API Endpoints: `http://localhost:3000/api/v1/*`

## Configuration Options

### Rate Limiting
- `MAX_REQUESTS_PER_MINUTE`: Global rate limit per minute
- `MAX_REQUESTS_PER_DAY_PER_IP`: Per-IP daily limit

### Streaming Options
- `ENABLE_FAKE_STREAMING`: Use fake streaming (recommended for network stability)

### Concurrent Requests
- `ENABLE_CONCURRENT_REQUESTS`: Enable parallel requests
- `CONCURRENT_REQUESTS`: Number of concurrent requests (2-5 recommended)

### Anti-Detection
- `ENABLE_DISGUISE_INFO`: Add random context to requests

### Caching
- `ENABLE_CACHE`: Cache successful responses for faster regeneration

## Architecture

### Key Components

1. **API Key Manager** (`lib/gemini/key-manager.ts`)
   - Handles key rotation and validation
   - Tracks key health and error counts
   - Automatic failover to healthy keys

2. **Gemini Client** (`lib/gemini/client.ts`)
   - Interfaces with Google's Gemini API
   - Converts between OpenAI and Gemini formats
   - Handles streaming and non-streaming responses

3. **Rate Limiter** (`lib/api/rate-limiter.ts`)
   - Implements sliding window rate limiting
   - Separate limits for global and per-IP requests

4. **Concurrent Cache Manager** (`lib/api/concurrent-cache.ts`)
   - Manages parallel requests and response caching
   - Stores multiple response variants for regeneration

5. **Fake Streaming Manager** (`lib/api/fake-streaming.ts`)
   - Maintains connection with keep-alive chunks
   - Provides better network stability

## Deployment Notes

### Vercel Optimization
- Configured for edge functions
- Optimized cold start performance
- Proper CORS headers
- Security headers included

### Environment Considerations
- All sensitive data in environment variables
- No local file system dependencies
- Stateless design for serverless scaling

## Monitoring & Maintenance

### Health Checks
- API keys are automatically validated
- Failed keys are temporarily disabled
- Admin dashboard shows system health

### Logging
- Request/response logging
- Error tracking with context
- Performance monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the original [hajimi](https://github.com/wyeeeee/hajimi) project by wyeeeee
- Built with Next.js, Tailwind CSS, and Google Generative AI SDK
- Designed for Vercel serverless deployment

## Support

For issues and questions:
1. Check the admin dashboard for system status
2. Review environment variable configuration
3. Check Vercel function logs
4. Create an issue in the repository