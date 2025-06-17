// API Configuration for different environments
export const getApiBaseUrl = () => {
  // You can set VITE_API_BASE_URL in your environment files:
  // .env.development: VITE_API_BASE_URL=/api
  // .env.production: VITE_API_BASE_URL=https://your-vercel-app.vercel.app/api/proxy
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

// Utility function to make API requests through the proxy
export const proxyFetch = async (url: string, options: RequestInit = {}) => {
  const apiBase = getApiBaseUrl();
  const proxyUrl = `${apiBase}/proxy?url=${encodeURIComponent(url)}`;
  
  return fetch(proxyUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// Example usage function
export const fetchExternalData = async (endpoint: string) => {
  try {
    const response = await proxyFetch(`https://your-external-api.com${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}; 