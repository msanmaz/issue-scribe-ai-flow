# Vercel Serverless Functions API Proxy Setup

This project uses Vercel serverless functions to handle API requests and resolve CORS issues when calling external APIs.

## Project Structure

```
your-project/
├── src/
│   ├── utils/
│   │   └── api-config.ts       # API configuration utilities
│   └── components/
│       └── ApiUsageExample.tsx # Example usage component
├── api/                        # Serverless functions
│   └── proxy.js               # Main proxy function
├── docs/
│   └── API_PROXY_SETUP.md     # This documentation
├── vercel.json                # Vercel configuration
├── vite.config.ts             # Updated with dev proxy
└── package.json
```

## Setup Instructions

### 1. Environment Configuration

Create environment files for different deployment targets:

**`.env.development`** (for local development):
```
VITE_API_BASE_URL=/api
```

**`.env.production`** (for Vercel deployment):
```
VITE_API_BASE_URL=https://your-vercel-app.vercel.app/api/proxy
```

### 2. Development vs Production

#### Development Mode
- Uses Vite's built-in proxy (configured in `vite.config.ts`)
- Requests to `/api/external/*` are proxied to your external API
- No serverless functions needed locally

#### Production Mode
- Uses Vercel serverless functions in the `/api` folder
- All requests go through the proxy function for CORS handling
- Deployed automatically with your Vercel app

### 3. Usage Examples

#### Option 1: Using Utility Functions
```typescript
import { fetchExternalData } from '@/utils/api-config';

const data = await fetchExternalData('/users');
```

#### Option 2: Using proxyFetch
```typescript
import { proxyFetch } from '@/utils/api-config';

const response = await proxyFetch('https://api.example.com/data');
const data = await response.json();
```

#### Option 3: Direct Proxy Call
```typescript
const response = await fetch(`/api/proxy?url=${encodeURIComponent('https://api.example.com/data')}`);
const data = await response.json();
```

## Configuration Files

### vercel.json
Configures serverless functions and optional rewrites:
- Sets Node.js 18 runtime for API functions
- Optional: Direct rewrites for specific API endpoints

### vite.config.ts
Development proxy configuration:
- Proxies `/api/external/*` to your external API
- Maintains existing Intercom proxy
- Handles CORS and headers automatically

## Features

### CORS Handling
- Automatic CORS headers for cross-origin requests
- Supports all HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
- Configurable allowed origins and headers

### Authentication Support
- Forwards Authorization headers from client
- Easy to extend for API key handling
- Secure token management

### Error Handling
- Comprehensive error responses
- Detailed error messages for debugging
- Graceful fallbacks for failed requests

### Development Experience
- Hot reload support in development
- Consistent API interface across environments
- TypeScript support with proper typing

## Deployment

### Automatic Deployment
1. Push to your connected Git repository
2. Vercel automatically builds and deploys
3. Serverless functions are deployed to `/api/*` endpoints

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

## Customization

### Adding API Keys
Update the proxy function to include your API keys:

```javascript
// In api/proxy.js
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.YOUR_API_KEY}`,
  ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
}
```

### Custom Headers
Modify the proxy function to add custom headers:

```javascript
// Add custom headers for specific APIs
if (url.includes('specific-api.com')) {
  headers['X-Custom-Header'] = 'custom-value';
}
```

### Response Transformation
Transform responses before sending to client:

```javascript
// In api/proxy.js, after fetching data
let data = await response.json();

// Transform data if needed
if (url.includes('transform-this-api.com')) {
  data = transformData(data);
}

res.status(response.status).json(data);
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your proxy is properly configured
2. **404 on API Routes**: Check vercel.json configuration
3. **Environment Variables**: Verify VITE_API_BASE_URL is set correctly
4. **Development Proxy**: Ensure Vite proxy configuration matches your API

### Debug Mode
Add logging to the proxy function for debugging:

```javascript
console.log('Proxy request:', { url: decodeURIComponent(url), method: req.method });
```

## Security Considerations

- Never expose sensitive API keys in client-side code
- Use environment variables for all secrets
- Validate and sanitize URL parameters
- Consider rate limiting for production use
- Implement proper authentication checks 