import { useState, useCallback } from 'react';
import { WebLLMService } from '../services/webLLMService';

export const useWebLLM = () => {
  const [service, setService] = useState<WebLLMService | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const initialize = useCallback(async () => {
    if (service?.initialized) return service;

    try {
      setLoading(true);
      setError(null);
      
      const webllmService = new WebLLMService();
      await webllmService.initialize((info) => {
        setProgress(info.text || info.progress || 'Loading...');
      });
      
      setService(webllmService);
      setProgress('Ready!');
      setTimeout(() => setProgress(''), 2000);
      
      return webllmService;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize WebLLM';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const reset = useCallback(() => {
    setService(null);
    setError(null);
    setProgress('');
  }, []);

  return {
    service,
    initialize,
    reset,
    loading,
    error,
    progress,
    isInitialized: !!service?.initialized
  };
}; 