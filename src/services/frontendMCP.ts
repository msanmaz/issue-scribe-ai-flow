import OpenAI from 'openai';
import { GitHubSearchService } from './githubSearch';
import { WebLLMService } from './webLLMService';
// import { calculateSemanticSimilarity } from '../utils/similarity'; // Temporarily disabled for testing
import type { ProcessedConversation, GitHubIssueTemplate, EnhancedIssueContext } from '../types/conversation';
import type { MCPConfig, AIAnalyzedIssue, MCPTool } from '../types/mcp';

export class FrontendMCPClient {
  private openai: OpenAI | null = null;
  private webllm: WebLLMService | null = null;
  private githubService: GitHubSearchService;
  private tools: Map<string, MCPTool> = new Map();
  private debugMode: boolean = true; // Enable debugging

  constructor(private config: MCPConfig) {
    this.githubService = new GitHubSearchService(config.githubToken);
    this.initializeAI();
    this.registerTools();
  }

  private async initializeAI() {
    if (this.config.useLocalAI) {
      this.webllm = new WebLLMService();
      await this.webllm.initialize();
    } else {
      this.openai = new OpenAI({
        apiKey: this.config.openaiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  private registerTools() {
    this.tools.set('search_github_issues', {
      type: 'function',
      function: {
        name: 'search_github_issues',
        description: 'Search GitHub issues across configured repositories',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for GitHub issues'
            },
            filters: {
              type: 'object',
              properties: {
                state: { type: 'string', enum: ['open', 'closed', 'all'] },
                labels: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['query']
        }
      },
      handler: this.searchGitHubIssues.bind(this)
    });

    this.tools.set('get_issue_details', {
      type: 'function',
      function: {
        name: 'get_issue_details',
        description: 'Get detailed information about a specific GitHub issue',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository in format owner/repo' },
            issueNumber: { type: 'number', description: 'Issue number' }
          },
          required: ['repo', 'issueNumber']
        }
      },
      handler: this.getIssueDetails.bind(this)
    });
  }

  async analyzeForDuplicates(
    conversation: ProcessedConversation,
    template: GitHubIssueTemplate,
    context: EnhancedIssueContext
  ): Promise<AIAnalyzedIssue[]> {
    console.log('🔍 Starting MCP duplicate analysis...');
    console.log('📊 Context:', { 
      title: template.title, 
      appId: context.appId, 
      customerImpact: context.customerImpact,
      repositories: this.config.repositories 
    });

    const systemPrompt = `You are a GitHub issue analysis assistant. Your task is to find semantically similar existing issues that might be duplicates or related to a new customer support issue.

Available tools:
- search_github_issues: Search for issues using keywords and filters
- get_issue_details: Get detailed information about specific issues

Analyze the customer conversation and proposed issue to find similar existing issues. Focus on:
1. Same underlying technical problem
2. Similar error messages or symptoms  
3. Same App ID or similar configuration
4. Related functionality or user workflows

Search Strategy:
1. Start with specific error messages or App ID if available
2. Then search for broader technical terms
3. Look for similar functionality keywords
4. Check both open and closed issues

For each similar issue found, provide:
- similarity_score (0-1): How similar is this issue
- relationship_type: 'duplicate', 'related', 'dependency', or 'follow-up'
- reasoning: Why you think this issue is similar
- suggested_action: 'reference', 'merge', 'update_existing', or 'create_new'`;

    const userPrompt = this.buildAnalysisPrompt(conversation, template, context);

    if (this.config.useLocalAI && this.webllm) {
      console.log('🤖 Using WebLLM for analysis...');
      return this.webllm.analyzeWithTools(systemPrompt, userPrompt, this.tools);
    } else if (this.openai) {
      console.log('🤖 Using OpenAI for analysis...');
      return this.analyzeWithOpenAI(systemPrompt, userPrompt, template, context);
    } else {
      throw new Error('No AI service initialized');
    }
  }

  private async analyzeWithOpenAI(
    systemPrompt: string, 
    userPrompt: string,
    template: GitHubIssueTemplate,
    context: EnhancedIssueContext
  ): Promise<AIAnalyzedIssue[]> {
    // First, let's do our own search to get results
    const searchQueries = this.generateSearchQueries(template, context);
    console.log('🔍 Generated search queries:', searchQueries);
    
    let allFoundIssues: any[] = [];
    
    for (const query of searchQueries) {
      try {
        console.log(`🔎 Searching GitHub for: "${query}"`);
        const issues = await this.searchGitHubIssues({ query, filters: { state: 'all' } });
        console.log(`📋 Found ${issues.length} issues for query "${query}"`);
        if (issues.length > 0) {
          console.log('📝 Sample results:', issues.slice(0, 3).map(i => ({ 
            number: i.number, 
            title: i.title.substring(0, 100) 
          })));
        }
        allFoundIssues = [...allFoundIssues, ...issues];
      } catch (error) {
        console.error(`❌ Search failed for query "${query}":`, error);
      }
    }

    // Remove duplicates based on issue ID
    const uniqueIssues = allFoundIssues.filter((issue, index, arr) => 
      arr.findIndex(i => i.id === issue.id) === index
    );

    console.log(`🎯 Total unique issues found: ${uniqueIssues.length}`);

    // Calculate semantic similarity for each issue using AI
    console.log('🧠 Calculating semantic similarity using AI...');
    const analyzedIssues: AIAnalyzedIssue[] = [];
    
    for (const issue of uniqueIssues) {
      try {
        const semanticAnalysis = await this.calculateSemanticSimilarity(
          {
            title: template.title,
            body: template.body,
            errorMessages: context.errorMessages,
            appId: context.appId
          },
          {
            title: issue.title,
            body: issue.body || '',
            labels: issue.labels
          },
          !this.config.useLocalAI // Use AI if we have OpenAI configured
        );

        let relationshipType: 'duplicate' | 'related' | 'dependency' | 'follow-up' = 'related';
        let suggestedAction: 'reference' | 'merge' | 'update_existing' | 'create_new' = 'reference';

        if (semanticAnalysis.score >= 0.8) {
          relationshipType = 'duplicate';
          suggestedAction = 'merge';
        } else if (semanticAnalysis.score >= 0.6) {
          relationshipType = 'related';
          suggestedAction = 'reference';
        }

        analyzedIssues.push({
          issue,
          similarity_score: semanticAnalysis.score,
          relationship_type: relationshipType,
          reasoning: semanticAnalysis.reasoning,
          suggested_action: suggestedAction
        });

        console.log(`📊 Issue #${issue.number}: ${Math.round(semanticAnalysis.score * 100)}% similar - ${semanticAnalysis.reasoning}`);
        
      } catch (error) {
        console.error(`❌ Failed to analyze similarity for issue #${issue.number}:`, error);
        // Fallback to basic analysis
        const basicSimilarity = this.calculateBasicSimilarity(issue, template, context);
        analyzedIssues.push({
          issue,
          similarity_score: basicSimilarity,
          relationship_type: 'related',
          reasoning: 'Basic similarity calculation (AI analysis failed)',
          suggested_action: 'reference'
        });
      }
    }

    // Sort by similarity and limit results
    const sortedResults = analyzedIssues
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, this.config.maxResults || 10);

    console.log('🏆 Top results:', sortedResults.map(r => ({
      issue: r.issue.number,
      similarity: Math.round(r.similarity_score * 100) + '%',
      type: r.relationship_type
    })));

    return sortedResults;
  }

  private generateSearchQueries(template: GitHubIssueTemplate, context: EnhancedIssueContext): string[] {
    const queries: string[] = [];

    // 1. Core problem extraction - look for the main issue symptoms
    const problemPatterns = {
      'loading_issues': ['not loading', 'not showing', 'not displaying', 'not appearing', 'missing', 'blank'],
      'error_patterns': ['error', 'failed', 'failure', 'broken', 'issue', 'problem'],
      'server_issues': ['server error', 'internal error', '500', '502', '503', '504', 'backend', 'api error'],
      'auth_issues': ['authentication', 'login', 'signin', 'unauthorized', '401', '403'],
      'ui_components': ['messenger', 'widget', 'chat', 'popup', 'modal', 'button', 'form']
    };

    const titleLower = template.title.toLowerCase();
    const bodyLower = template.body.toLowerCase();
    const fullText = `${titleLower} ${bodyLower}`;

    // 2. Identify main problem categories
    const detectedCategories: string[] = [];
    for (const [category, patterns] of Object.entries(problemPatterns)) {
      if (patterns.some(pattern => fullText.includes(pattern))) {
        detectedCategories.push(category);
      }
    }

    // 3. Generate primary search queries based on detected patterns
    if (detectedCategories.includes('loading_issues') && detectedCategories.includes('ui_components')) {
      // UI component not loading
      queries.push('not showing');
      queries.push('not loading');
      queries.push('not displaying');
      queries.push('not appearing');
    }

    if (detectedCategories.includes('server_issues')) {
      // Server-related issues
      queries.push('server error');
      queries.push('internal error');
      queries.push('500 error');
      queries.push('backend error');
      queries.push('api error');
    }

    if (detectedCategories.includes('auth_issues')) {
      // Authentication issues
      queries.push('authentication');
      queries.push('login');
      queries.push('unauthorized');
      queries.push('401');
    }

    // 4. Extract key technical terms (broader than before)
    const technicalTerms = fullText.match(/\b(api|widget|messenger|chat|authentication|login|webhook|integration|popup|modal|iframe|script|cdn|cors|ssl|tls|oauth|jwt|session|cookie|token)\b/gi);
    if (technicalTerms) {
      const uniqueTerms = [...new Set(technicalTerms.map(t => t.toLowerCase()))];
      uniqueTerms.slice(0, 3).forEach(term => {
        queries.push(term);
      });
    }

    // 5. Generic problem searches (cast wide net)
    queries.push('error');
    queries.push('issue');
    queries.push('problem');
    queries.push('bug');
    queries.push('failed');
    queries.push('broken');

    // 6. Component-specific searches
    if (fullText.includes('messenger') || fullText.includes('chat')) {
      queries.push('messenger');
      queries.push('chat');
    }
    if (fullText.includes('widget') || fullText.includes('popup')) {
      queries.push('widget');
      queries.push('popup');
    }

    // 7. Error message searches (if available)
    if (context.errorMessages && context.errorMessages.length > 10) {
      // Extract key error terms
      const errorTerms = context.errorMessages.match(/\b(error|exception|failed|timeout|refused|forbidden|unauthorized|not found|bad request)\b/gi);
      if (errorTerms) {
        const uniqueErrors = [...new Set(errorTerms.map(e => e.toLowerCase()))];
        uniqueErrors.slice(0, 2).forEach(error => {
          queries.push(error);
        });
      }
    }

    // 8. App ID (supplementary, not primary) 
    if (context.appId && queries.length > 3) {
      queries.push(context.appId);
    }

    // 9. Clean, deduplicate, and prioritize
    const cleanQueries = queries
      .map(q => q.trim())
      .filter(q => q.length > 2 && q.length < 50)
      .filter((query, index, arr) => arr.indexOf(query) === index) // Remove duplicates
      .slice(0, 8); // Increased limit for more comprehensive search

    console.log('🎯 Enhanced search strategy:', {
      originalTitle: template.title,
      detectedCategories,
      generatedQueries: cleanQueries,
      strategy: 'Multi-category search with semantic alternatives'
    });

    return cleanQueries.length > 0 ? cleanQueries : ['error', 'issue', 'bug'];
  }

  private generateReasoning(
    similarity: number, 
    issue: any, 
    template: GitHubIssueTemplate, 
    context: EnhancedIssueContext
  ): string {
    const reasons: string[] = [];

    if (context.appId && issue.body?.includes(context.appId)) {
      reasons.push(`Same App ID (${context.appId}) mentioned`);
    }

    if (similarity >= 0.8) {
      reasons.push('Very high similarity in title and content');
    } else if (similarity >= 0.6) {
      reasons.push('Significant similarity in problem description');
    }

    if (context.errorMessages) {
      const errorWords = context.errorMessages.toLowerCase().split(/\s+/);
      const issueContent = (issue.title + ' ' + (issue.body || '')).toLowerCase();
      const matchingWords = errorWords.filter(word => 
        word.length > 3 && issueContent.includes(word)
      );
      if (matchingWords.length > 0) {
        reasons.push(`Similar error patterns: ${matchingWords.slice(0, 3).join(', ')}`);
      }
    }

    if (issue.labels?.some((label: any) => 
      template.labels.some(tLabel => 
        label.name.toLowerCase().includes(tLabel.toLowerCase()) || 
        tLabel.toLowerCase().includes(label.name.toLowerCase())
      )
    )) {
      reasons.push('Related labels and categorization');
    }

    if (issue.state === 'closed') {
      reasons.push('Issue was previously resolved');
    }

    return reasons.length > 0 
      ? reasons.join('. ') + '.'
      : `Found through keyword matching with ${Math.round(similarity * 100)}% content similarity.`;
  }

  private async processToolCalls(message: any): Promise<AIAnalyzedIssue[]> {
    const analyzedIssues: AIAnalyzedIssue[] = [];
    
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const tool = this.tools.get(toolCall.function.name);
        if (tool) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.handler(args);
          
          // Process search results into analyzed issues
          if (toolCall.function.name === 'search_github_issues' && Array.isArray(result)) {
            for (const issue of result) {
              analyzedIssues.push({
                issue,
                similarity_score: 0.5, // Default similarity for keyword matches
                relationship_type: 'related',
                reasoning: 'Found through keyword search',
                suggested_action: 'reference'
              });
            }
          }
        }
      }
    }

    return analyzedIssues;
  }

  private async searchGitHubIssues(params: {
    query: string;
    filters?: { state?: string; labels?: string[] }
  }) {
    console.log(`🔍 GitHub Search: "${params.query}" with filters:`, params.filters);
    const results = await this.githubService.searchIssues(
      params.query,
      this.config.repositories,
      params.filters
    );
    console.log(`📊 GitHub returned ${results.length} results`);
    return results;
  }

  private async getIssueDetails(params: { repo: string; issueNumber: number }) {
    return this.githubService.getIssue(params.repo, params.issueNumber);
  }

  private buildAnalysisPrompt(
    conversation: ProcessedConversation,
    template: GitHubIssueTemplate,
    context: EnhancedIssueContext
  ): string {
    return `
CUSTOMER CONVERSATION CONTEXT:
- Customer: ${conversation.customerName}
- App ID: ${context.appId || 'Not specified'}
- Issue Title: ${template.title}
- Customer Impact: ${context.customerImpact}
- Error Messages: ${context.errorMessages || 'None provided'}

CONVERSATION SUMMARY:
${conversation.messages.slice(0, 5).map(m => 
  `${m.author.type.toUpperCase()}: ${m.body.substring(0, 300)}`
).join('\n\n')}

PROPOSED GITHUB ISSUE:
Title: ${template.title}
Labels: ${template.labels.join(', ')}
Priority: ${template.priority}

Body Preview:
${template.body.substring(0, 500)}...

REPOSITORIES TO SEARCH:
${this.config.repositories.join(', ')}

TASK:
1. Search for issues that might be duplicates or related
2. Focus on issues with similar technical problems, error messages, or App IDs
3. Get details on the most promising matches
4. Analyze semantic similarity and suggest actions
5. Return your analysis with confidence scores and reasoning
`;
  }

  private calculateBasicSimilarity(
    issue: any,
    template: GitHubIssueTemplate,
    context: EnhancedIssueContext
  ): number {
    // Simple text-based similarity for testing
    const issueText = `${issue.title} ${issue.body || ''}`.toLowerCase();
    const templateText = `${template.title} ${template.body}`.toLowerCase();
    
    // Count common words
    const issueWords = new Set(issueText.split(/\s+/));
    const templateWords = new Set(templateText.split(/\s+/));
    
    const intersection = new Set([...issueWords].filter(x => templateWords.has(x)));
    const union = new Set([...issueWords, ...templateWords]);
    
    // Jaccard similarity
    const jaccard = intersection.size / union.size;
    
    // Boost similarity if error messages match
    let boost = 0;
    if (context.errorMessages && context.errorMessages.length > 0) {
      const errorText = context.errorMessages.toLowerCase();
      if (issueText.includes(errorText) || errorText.includes(issueText.substring(0, 50))) {
        boost = 0.2;
      }
    }
    
    return Math.min(1.0, jaccard + boost);
  }

  private async calculateSemanticSimilarity(
    newIssue: { title: string; body: string; errorMessages?: string; appId?: string },
    existingIssue: { title: string; body: string; labels?: any[] },
    useAI: boolean = true
  ): Promise<{ score: number; reasoning: string }> {
    
    // If AI is not available, fall back to basic similarity
    if (!useAI || !this.openai) {
      const basicScore = this.calculateBasicSimilarity(existingIssue, 
        { title: newIssue.title, body: newIssue.body, labels: [], priority: 'medium' },
        { errorMessages: newIssue.errorMessages || '', screenshots: [], additionalSteps: '', technicalDetails: '', browserInfo: '', appId: newIssue.appId || '', customerImpact: 'medium' }
      );
      return {
        score: basicScore,
        reasoning: 'Basic word similarity calculation (AI not available)'
      };
    }

    try {
      const prompt = `Analyze the semantic similarity between these two GitHub issues and provide a similarity score from 0-1:

NEW ISSUE:
Title: ${newIssue.title}
Description: ${newIssue.body.substring(0, 500)}
Error Messages: ${newIssue.errorMessages || 'None'}
App ID: ${newIssue.appId || 'Not specified'}

EXISTING ISSUE:
Title: ${existingIssue.title}
Description: ${(existingIssue.body || '').substring(0, 500)}
Labels: ${existingIssue.labels?.map(l => l.name).join(', ') || 'None'}

Consider these aspects:
1. **Root Cause Similarity**: Do they have the same underlying technical problem?
   - "Internal Server Error" vs "500 Error" vs "Backend Failure" (HIGH similarity)
   - "Authentication Failed" vs "Login Broken" vs "Can't Sign In" (HIGH similarity)
   - "Widget not loading" vs "Messenger not showing" vs "Chat not displaying" (HIGH similarity)

2. **Symptom Similarity**: Do users experience similar issues?
   - Same functionality affected, same user impact
   - Similar error patterns or behaviors

3. **Context Match**: 
   - Same App ID (if specified) = high relevance
   - Similar technical components (API, authentication, UI widgets)
   - Similar user workflows affected

4. **Different Wordings, Same Problem**: 
   - Technical vs non-technical descriptions of same issue
   - Different error messages for same root cause
   - Vendor-specific vs generic terminology

Respond with ONLY a JSON object:
{
  "similarity_score": 0.0-1.0,
  "reasoning": "Brief explanation of why they are/aren't similar",
  "relationship_type": "duplicate|related|different",
  "confidence": 0.0-1.0
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      return {
        score: result.similarity_score,
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('❌ AI similarity analysis failed:', error);
      // Fallback to basic similarity
      const basicScore = this.calculateBasicSimilarity(existingIssue, 
        { title: newIssue.title, body: newIssue.body, labels: [], priority: 'medium' },
        { errorMessages: newIssue.errorMessages || '', screenshots: [], additionalSteps: '', technicalDetails: '', browserInfo: '', appId: newIssue.appId || '', customerImpact: 'medium' }
      );
      return {
        score: basicScore,
        reasoning: 'Fallback to basic similarity (AI analysis failed)'
      };
    }
  }

  // Test method to verify GitHub search is working
  async testGitHubSearch(): Promise<void> {
    console.log('🧪 Testing GitHub Search Functionality...');
    console.log('📋 Repository configuration:', this.config.repositories);
    
    const testQueries = [
      'bug',
      'error',
      'issue',
      'problem',
      'server error',
      'api error'
    ];

    for (const query of testQueries) {
      try {
        console.log(`\n🔍 Testing search query: "${query}"`);
        const results = await this.githubService.searchIssues(
          query,
          this.config.repositories,
          { state: 'all' }
        );
        
        console.log(`📊 Found ${results.length} issues for "${query}"`);
        
        if (results.length > 0) {
          console.log('📝 Sample results:');
          results.slice(0, 3).forEach((issue, index) => {
            console.log(`  ${index + 1}. #${issue.number}: ${issue.title}`);
            console.log(`     State: ${issue.state} | Created: ${new Date(issue.created_at).toLocaleDateString()}`);
            console.log(`     Labels: ${issue.labels.map(l => l.name).join(', ') || 'none'}`);
            console.log(`     URL: ${issue.html_url}`);
            console.log('');
          });
          
          if (results.length > 3) {
            console.log(`     ... and ${results.length - 3} more issues`);
          }
          
          // If we found results, we can stop testing
          console.log('✅ GitHub search is working! Found issues successfully.');
          return;
        }
      } catch (error) {
        console.error(`❌ Search failed for "${query}":`, error);
      }
    }
    
    console.log('⚠️ No issues found with any test queries. This might indicate:');
    console.log('   - Repository has no issues');
    console.log('   - Token lacks proper permissions');
    console.log('   - Repository names are incorrect');
    console.log('   - Network/API issues');
  }
} 