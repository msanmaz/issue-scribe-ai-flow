import React, { useState, useEffect } from 'react';
import { proxyFetch, fetchExternalData } from '../utils/api-config';

interface ApiData {
  id: number;
  title: string;
  body: string;
}

export const ApiUsageExample: React.FC = () => {
  const [data, setData] = useState<ApiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example 1: Using the utility function
  const fetchDataWithUtility = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchExternalData('/posts');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Using proxyFetch directly
  const fetchDataDirectly = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await proxyFetch('https://jsonplaceholder.typicode.com/posts');
      const result = await response.json();
      setData(result.slice(0, 5)); // Limit to 5 items for demo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Direct fetch to the proxy endpoint
  const fetchDataWithDirectProxy = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent('https://jsonplaceholder.typicode.com/posts')}`);
      const result = await response.json();
      setData(result.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">API Proxy Usage Examples</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={fetchDataWithUtility}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
          disabled={loading}
        >
          Fetch with Utility Function
        </button>
        
        <button
          onClick={fetchDataDirectly}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
          disabled={loading}
        >
          Fetch with proxyFetch
        </button>
        
        <button
          onClick={fetchDataWithDirectProxy}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          disabled={loading}
        >
          Fetch with Direct Proxy
        </button>
      </div>

      {loading && <div className="text-blue-500">Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {data.length > 0 && (
        <div className="grid gap-4">
          <h3 className="text-xl font-semibold">Results:</h3>
          {data.map((item) => (
            <div key={item.id} className="border p-4 rounded">
              <h4 className="font-semibold">{item.title}</h4>
              <p className="text-gray-600">{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 