export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
}

export class GitHubSearchService {
  constructor(private token: string) {}

  async searchIssues(
    query: string,
    repositories: string[],
    filters?: { state?: string; labels?: string[] }
  ): Promise<GitHubIssue[]> {
    const repoFilter = repositories.map(repo => `repo:${repo}`).join(' ');
    
    // GitHub Search API doesn't support state:all, so we handle it differently
    let stateFilter = '';
    if (filters?.state && filters.state !== 'all') {
      stateFilter = `state:${filters.state}`;
    }
    // If state is 'all' or not specified, we don't add a state filter (searches both open and closed)
    
    const labelFilter = filters?.labels ? 
      filters.labels.map(l => `label:"${l}"`).join(' ') : '';
    
    const searchQuery = `${query} ${repoFilter} ${stateFilter} ${labelFilter} is:issue`.trim();
    
    // Debug logging
    console.log('🔍 GitHub Search Debug:', {
      originalQuery: query,
      repositories,
      filters,
      repoFilter,
      stateFilter,
      labelFilter,
      finalSearchQuery: searchQuery
    });

    try {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=20&sort=updated`;
      console.log('📡 Making request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      console.log('📊 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GitHub API error response:', errorText);
        
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        if (response.status === 422) {
          throw new Error(`GitHub search query invalid: ${errorText}`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ GitHub API response:', {
        total_count: data.total_count,
        items_returned: data.items?.length || 0,
        incomplete_results: data.incomplete_results
      });
      
      if (data.items && data.items.length > 0) {
        console.log('📝 Sample issues found:', data.items.slice(0, 3).map(item => ({
          number: item.number,
          title: item.title,
          state: item.state,
          url: item.html_url
        })));
      }
      
      return data.items || [];
    } catch (error) {
      console.error('❌ GitHub search failed:', error);
      throw error;
    }
  }

  async getIssue(repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get issue details:', error);
      return null;
    }
  }

  async validateToken(): Promise<{ valid: boolean; user?: string; canSearchIssues?: boolean }> {
    try {
      // First, validate the token by getting user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        return { valid: false };
      }

      const user = await userResponse.json();

      // Test if we can actually search issues by making a minimal search
      let canSearchIssues = false;
      try {
        const testSearchResponse = await fetch(
          'https://api.github.com/search/issues?q=test&per_page=1',
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          }
        );
        
        // If we get 200 or 422 (validation error but auth works), token can search
        canSearchIssues = testSearchResponse.status === 200 || testSearchResponse.status === 422;
      } catch (error) {
        console.warn('Could not test search capability:', error);
      }

      return {
        valid: true,
        user: user.login,
        canSearchIssues
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return { valid: false };
    }
  }

  async listIssues(repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<GitHubIssue[]> {
    try {
      const url = `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=20&sort=updated`;
      console.log('📡 Listing issues directly from repo:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      console.log('📊 List issues response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ List issues API error:', errorText);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      console.log('✅ Issues found in repo:', {
        repo,
        count: issues.length,
        issues: issues.slice(0, 5).map((issue: any) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url
        }))
      });
      
      return issues;
    } catch (error) {
      console.error('❌ Failed to list issues:', error);
      throw error;
    }
  }
} 