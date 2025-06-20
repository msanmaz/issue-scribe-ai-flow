import type { GitHubIssue } from '../services/githubSearch';

export interface MCPConfig {
  githubToken: string;
  openaiKey?: string;
  useLocalAI: boolean;
  repositories: string[];
  maxResults?: number;
}

export interface AIAnalyzedIssue {
  issue: GitHubIssue;
  similarity_score: number;
  relationship_type: 'duplicate' | 'related' | 'dependency' | 'follow-up';
  reasoning: string;
  suggested_action: 'reference' | 'merge' | 'update_existing' | 'create_new';
}

export interface MCPTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
  handler: (params: any) => Promise<any>;
}

export interface MCPAnalysisResult {
  analyzed_issues: AIAnalyzedIssue[];
  total_searched: number;
  search_time_ms: number;
  ai_model_used: string;
} 