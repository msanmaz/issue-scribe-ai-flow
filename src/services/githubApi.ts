import axios from 'axios';
import type { ApiResponse } from '../types/conversation';

const GITHUB_API_BASE_URL = 'https://api.github.com';

// Create axios instance for GitHub API
const githubClient = axios.create({
  baseURL: GITHUB_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  },
});

// Add authorization header
githubClient.interceptors.request.use(
  (config) => {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
githubClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid GitHub token. Please check your VITE_GITHUB_TOKEN environment variable.');
    }
    if (error.response?.status === 403) {
      throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
    }
    if (error.response?.status === 404) {
      throw new Error('Repository not found. Please check the owner and repository name.');
    }
    if (error.response?.status === 422) {
      throw new Error('Invalid request data. Please check the issue template.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'GitHub API request failed');
  }
);

export interface GitHubIssueData {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface CreatedGitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description: string | null;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

/**
 * Validates GitHub repository configuration
 */
export const validateGitHubConfiguration = (): { isValid: boolean; missingVars: string[] } => {
  const requiredVars = [
    'VITE_GITHUB_TOKEN',
    'VITE_GITHUB_OWNER',
    'VITE_GITHUB_REPO'
  ];
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

/**
 * Creates a new GitHub issue
 */
export const createGitHubIssue = async (issueData: GitHubIssueData): Promise<ApiResponse<CreatedGitHubIssue>> => {
  try {
    const owner = import.meta.env.VITE_GITHUB_OWNER;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    
    if (!owner || !repo) {
      return {
        success: false,
        error: {
          code: 'MISSING_CONFIG',
          message: 'GitHub owner and repository must be configured in environment variables',
        },
      };
    }

    console.log(`Creating GitHub issue in ${owner}/${repo}...`);
    
    const response = await githubClient.post(`/repos/${owner}/${repo}/issues`, {
      title: issueData.title,
      body: issueData.body,
      labels: issueData.labels || [],
      assignees: issueData.assignees || [],
      milestone: issueData.milestone,
    });

    console.log('GitHub issue created successfully:', response.data.html_url);
    
    return {
      success: true,
      data: response.data as CreatedGitHubIssue,
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    
    return {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create GitHub issue',
        details: error,
      },
    };
  }
};

/**
 * Gets repository information
 */
export const getRepositoryInfo = async (): Promise<ApiResponse<{ name: string; full_name: string; html_url: string; description: string }>> => {
  try {
    const owner = import.meta.env.VITE_GITHUB_OWNER;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    
    if (!owner || !repo) {
      return {
        success: false,
        error: {
          code: 'MISSING_CONFIG',
          message: 'GitHub owner and repository must be configured',
        },
      };
    }

    const response = await githubClient.get(`/repos/${owner}/${repo}`);
    
    return {
      success: true,
      data: {
        name: response.data.name,
        full_name: response.data.full_name,
        html_url: response.data.html_url,
        description: response.data.description || '',
      },
    };
  } catch (error) {
    console.error('Error fetching repository info:', error);
    
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch repository information',
        details: error,
      },
    };
  }
}; 