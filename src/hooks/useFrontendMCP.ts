import { useState, useCallback } from 'react';
import { FrontendMCPClient } from '../services/frontendMCP';
import { GitHubSearchService } from '../services/githubSearch';
import type { MCPConfig, AIAnalyzedIssue, MCPAnalysisResult } from '../types/mcp';
import type { ProcessedConversation, GitHubIssueTemplate, EnhancedIssueContext } from '../types/conversation';

export const useFrontendMCP = () => {
  const [client, setClient] = useState<FrontendMCPClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState<string>('');

  const validateConfiguration = useCallback(async (config: MCPConfig): Promise<{
    valid: boolean;
    errors: string[];
    githubUser?: string;
  }> => {
    const errors: string[] = [];
    let githubUser: string | undefined;

    // Validate GitHub token
    if (!config.githubToken) {
      errors.push('GitHub token is required');
    } else {
      try {
        const githubService = new GitHubSearchService(config.githubToken);
        const validation = await githubService.validateToken();
        
        if (!validation.valid) {
          errors.push('Invalid GitHub token');
        } else {
          githubUser = validation.user;
          
          // Check if we can actually search issues
          if (validation.canSearchIssues === false) {
            errors.push('GitHub token cannot search issues. Please ensure it has proper permissions.');
          }
        }
      } catch (err) {
        errors.push('Failed to validate GitHub token: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }

    // Validate OpenAI key if not using local AI
    if (!config.useLocalAI && !config.openaiKey) {
      errors.push('OpenAI API key is required when not using local AI');
    }

    // Validate repositories
    if (!config.repositories || config.repositories.length === 0) {
      errors.push('At least one repository must be configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      githubUser
    };
  }, []);

  const initialize = useCallback(async (config: MCPConfig): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setInitProgress('Validating configuration...');

      const validation = await validateConfiguration(config);
      if (!validation.valid) {
        throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
      }

      setInitProgress('Initializing MCP client...');
      const mcpClient = new FrontendMCPClient(config);
      setClient(mcpClient);
      
      setInitProgress('Ready!');
      setTimeout(() => setInitProgress(''), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MCP';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateConfiguration]);

  const analyzeForDuplicates = useCallback(async (
    conversation: ProcessedConversation,
    template: GitHubIssueTemplate,
    context: EnhancedIssueContext
  ): Promise<MCPAnalysisResult> => {
    if (!client) {
      throw new Error('MCP client not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const analyzedIssues = await client.analyzeForDuplicates(conversation, template, context);
      const endTime = Date.now();

      return {
        analyzed_issues: analyzedIssues,
        total_searched: analyzedIssues.length,
        search_time_ms: endTime - startTime,
        ai_model_used: client['config'].useLocalAI ? 'WebLLM (Local)' : 'OpenAI GPT-4'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const testGitHubSearch = useCallback(async (): Promise<void> => {
    if (!client) {
      throw new Error('MCP client not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      await client.testGitHubSearch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GitHub test failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const reset = useCallback(() => {
    setClient(null);
    setError(null);
    setInitProgress('');
  }, []);

  return {
    initialize,
    analyzeForDuplicates,
    validateConfiguration,
    testGitHubSearch,
    reset,
    loading,
    error,
    initProgress,
    isInitialized: !!client
  };
}; 