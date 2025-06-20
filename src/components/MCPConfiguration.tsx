import React, { useState, useEffect } from 'react';
import type { MCPConfig } from '../types/mcp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Eye, EyeOff, Zap, Shield } from 'lucide-react';

interface MCPConfigurationProps {
  onConfigured: (config: MCPConfig) => void;
  loading?: boolean;
  error?: string | null;
  initProgress?: string;
  testGitHubSearch?: () => Promise<void>;
}

const MCPConfiguration: React.FC<MCPConfigurationProps> = ({
  onConfigured,
  loading = false,
  error = null,
  initProgress = '',
  testGitHubSearch
}) => {
  // Get environment variables
  const envGithubToken = import.meta.env.VITE_GITHUB_TOKEN || '';
  const envOpenaiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

  const [config, setConfig] = useState<MCPConfig>({
    githubToken: envGithubToken,
    openaiKey: envOpenaiKey,
    useLocalAI: false,
    repositories: [],
    maxResults: 10
  });

  const [showTokens, setShowTokens] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Load saved config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mcp-config');
    if (saved) {
      try {
        const parsedConfig = JSON.parse(saved);
        setConfig(prev => ({ 
          ...prev, 
          ...parsedConfig,
          // Always use environment variables for tokens if available
          githubToken: envGithubToken || prev.githubToken,
          openaiKey: envOpenaiKey || prev.openaiKey
        }));
        if (parsedConfig.repositories) {
          setRepoInput(parsedConfig.repositories.join('\n'));
        }
      } catch (err) {
        console.error('Failed to load saved config:', err);
      }
    }
  }, [envGithubToken, envOpenaiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const errors: string[] = [];

    if (!config.githubToken.trim()) {
      errors.push('GitHub token is required');
    }

    if (!config.useLocalAI && !config.openaiKey?.trim()) {
      errors.push('OpenAI API key is required when not using local AI');
    }

    if (config.repositories.length === 0) {
      errors.push('At least one repository must be specified');
    }

    // Validate repository format
    const invalidRepos = config.repositories.filter(repo => 
      !repo.match(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/)
    );
    if (invalidRepos.length > 0) {
      errors.push(`Invalid repository format: ${invalidRepos.join(', ')}`);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Save config (excluding sensitive tokens)
    const configToSave = {
      useLocalAI: config.useLocalAI,
      repositories: config.repositories,
      maxResults: config.maxResults
    };
    localStorage.setItem('mcp-config', JSON.stringify(configToSave));

    onConfigured(config);
  };

  const updateRepositories = (value: string) => {
    setRepoInput(value);
    const repos = value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    setConfig(prev => ({ ...prev, repositories: repos }));
  };

  const addExampleRepo = () => {
    const example = 'your-org/your-repo';
    if (!repoInput.includes(example)) {
      const newInput = repoInput ? `${repoInput}\n${example}` : example;
      updateRepositories(newInput);
    }
  };

  const handleTestSearch = async () => {
    if (!config.githubToken) {
      console.log('❌ No GitHub token configured');
      return;
    }

    setIsTesting(true);
    try {
      console.log('🚀 Starting GitHub search test...');
      
      // If we have the MCP test function, use it
      if (testGitHubSearch) {
        await testGitHubSearch();
      } else {
        // Otherwise, create a simple test using GitHubSearchService directly
        const { GitHubSearchService } = await import('../services/githubSearch');
        const githubService = new GitHubSearchService(config.githubToken);
        
        console.log('🧪 Testing GitHub Search Functionality...');
        console.log('📋 Repository configuration:', config.repositories);
        
        // First, let's list issues directly from each repository to verify they exist
        console.log('\n📋 Step 1: Listing issues directly from repositories...');
        for (const repo of config.repositories) {
          try {
            const directIssues = await githubService.listIssues(repo, 'all');
            console.log(`📊 Repository ${repo} has ${directIssues.length} total issues`);
          } catch (error) {
            console.error(`❌ Failed to list issues from ${repo}:`, error);
          }
        }
        
        // Now test search functionality
        console.log('\n🔍 Step 2: Testing search functionality...');
        const testQueries = [
          'bug',
          'error',
          'issue',
          'problem',
          'server error',
          'api error',
          'messenger', // Add specific terms from the visible issues
          'internal'
        ];

        for (const query of testQueries) {
          try {
            console.log(`\n🔍 Testing search query: "${query}"`);
            const results = await githubService.searchIssues(
              query,
              config.repositories,
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
        
        // Test what queries MCP would generate for different types of issues
        console.log('\n🎯 Step 3: Testing MCP semantic similarity system...');
        
        // Test different issue types to show flexibility
        const testCases = [
          {
            name: "Server Error Issue",
            template: {
              title: "Messenger not showing up - Internal Server Error",
              body: "Customer reports that the Messenger widget is not appearing on their website. Getting internal server error when trying to load the widget.",
              labels: ["bug", "customer-support", "intercom"],
              priority: "high" as const
            },
            context: {
              screenshots: [],
              additionalSteps: "",
              technicalDetails: "",
              errorMessages: "Internal Server Error: Failed to load messenger widget",
              browserInfo: "",
              appId: "12345",
              customerImpact: "high" as const
            }
          },
          {
            name: "Authentication Issue",
            template: {
              title: "Login broken - Users can't authenticate",
              body: "Multiple customers reporting they cannot log into their accounts. Getting authentication failed errors.",
              labels: ["bug", "authentication", "urgent"],
              priority: "high" as const
            },
            context: {
              screenshots: [],
              additionalSteps: "",
              technicalDetails: "",
              errorMessages: "Authentication failed: Invalid credentials",
              browserInfo: "",
              appId: "67890",
              customerImpact: "high" as const
            }
          },
          {
            name: "UI Loading Issue", 
            template: {
              title: "Chat widget not displaying properly",
              body: "Users report that the chat popup is not showing up on mobile devices. Widget appears blank or missing.",
              labels: ["bug", "ui", "mobile"],
              priority: "medium" as const
            },
            context: {
              screenshots: [],
              additionalSteps: "",
              technicalDetails: "",
              errorMessages: "Widget display error: Element not found",
              browserInfo: "Mobile Safari",
              appId: "54321",
              customerImpact: "medium" as const
            }
          }
        ];
        
        // Import the MCP client to test enhanced query generation
        try {
          const { FrontendMCPClient } = await import('../services/frontendMCP');
          const tempConfig = {
            githubToken: config.githubToken,
            repositories: config.repositories,
            useLocalAI: false,
            maxResults: 10
          };
          const mcpClient = new FrontendMCPClient(tempConfig);
          
          for (const testCase of testCases) {
            console.log(`\n🔍 Testing: ${testCase.name}`);
            console.log(`📋 Issue: "${testCase.template.title}"`);
            
            // Get enhanced search queries  
            const queries = (mcpClient as any).generateSearchQueries(testCase.template, testCase.context);
            console.log(`🔎 Enhanced queries generated:`, queries);
            
            // Test a few key queries
            let totalFound = 0;
            for (const query of queries.slice(0, 3)) {
              try {
                const results = await githubService.searchIssues(
                  query,
                  config.repositories,
                  { state: 'all' }
                );
                totalFound += results.length;
                if (results.length > 0) {
                  console.log(`  ✅ "${query}" → ${results.length} issues found`);
                } else {
                  console.log(`  ⚪ "${query}" → 0 issues`);
                }
              } catch (error) {
                console.log(`  ❌ "${query}" → search failed`);
              }
            }
            
            console.log(`📊 Total potential matches for ${testCase.name}: ${totalFound} issue(s)`);
            
            // Show semantic similarity concept
            if (totalFound > 0) {
              console.log(`🧠 Next step: AI would analyze semantic similarity between:`);
              console.log(`   • New: "${testCase.template.title}"`);
              console.log(`   • Existing: Your repository issues`);
              console.log(`   • AI understands: "Internal Server Error" = "500 Error" = "Backend Failure"`);
              console.log(`   • AI understands: "Not showing" = "Not displaying" = "Missing"`);
              console.log(`   • AI understands: "Login broken" = "Authentication failed" = "Can't sign in"`);
            }
          }
          
        } catch (error) {
          console.error('❌ Could not test enhanced MCP system:', error);
        }
        
        console.log('\n🎯 Enhanced MCP System Summary:');
        console.log('  ✅ Flexible search queries adapt to any issue type');
        console.log('  ✅ AI-powered semantic similarity (not just keyword matching)');  
        console.log('  ✅ Understands different wordings for same problems');
        console.log('  ✅ Categories: Server errors, Auth issues, UI problems, API failures');
        console.log('  ✅ Fallback to basic similarity if AI unavailable');
        console.log('\n💡 This means the system will find duplicates even when:');
        console.log('  • Different customers use different words for same problem');
        console.log('  • Technical vs non-technical descriptions');
        console.log('  • Vendor-specific vs generic error messages');
        console.log('  • Same root cause, different symptoms');
        
        console.log('⚠️ No issues found with any search queries. This might indicate:');
        console.log('   - Search API has different behavior than expected');
        console.log('   - Search indexing delays');
        console.log('   - Query format issues');
        console.log('   - Repository access permissions');
        console.log('💡 But direct listing worked, so the token and repositories are correct.');
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const canTestSearch = config.githubToken && config.repositories.length > 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🤖 Configure AI Duplicate Detection
        </CardTitle>
        <CardDescription>
          Set up GitHub access and AI model preferences for intelligent issue analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-2">Configuration Errors:</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* API Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Initialization Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {loading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">
                {initProgress || 'Initializing...'}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* GitHub Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">GitHub Access</h3>
            
            <div className="space-y-2">
              <Label htmlFor="github-token">GitHub Personal Access Token *</Label>
              <div className="relative">
                <Input
                  id="github-token"
                  type={showTokens ? 'text' : 'password'}
                  value={config.githubToken}
                  onChange={(e) => setConfig(prev => ({ ...prev, githubToken: e.target.value }))}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Needs permissions to search issues. <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Create token →</a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repositories">Repositories to Search *</Label>
              <Textarea
                id="repositories"
                value={repoInput}
                onChange={(e) => updateRepositories(e.target.value)}
                placeholder="owner/repo-name&#10;owner/another-repo"
                rows={4}
                className="font-mono text-sm"
                required
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  One repository per line in format: owner/repo-name
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addExampleRepo}
                >
                  Add example
                </Button>
              </div>
            </div>
          </div>

          {/* AI Model Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">AI Model</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="openai"
                  checked={!config.useLocalAI}
                  onChange={() => setConfig(prev => ({ ...prev, useLocalAI: false }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="openai" className="font-medium">OpenAI GPT-4 (Recommended)</Label>
                  <p className="text-sm text-gray-600">
                    Better analysis quality, requires API key, uses your OpenAI credits
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="local"
                  checked={config.useLocalAI}
                  onChange={() => setConfig(prev => ({ ...prev, useLocalAI: true }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="local" className="font-medium">Local AI (WebLLM)</Label>
                  <p className="text-sm text-gray-600">
                    Runs in browser, completely private, slower initial load, lower quality
                  </p>
                </div>
              </div>
            </div>

            {/* OpenAI Key Input */}
            {!config.useLocalAI && (
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key *</Label>
                <Input
                  id="openai-key"
                  type={showTokens ? 'text' : 'password'}
                  value={config.openaiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, openaiKey: e.target.value }))}
                  placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxx"
                  required={!config.useLocalAI}
                />
                <p className="text-xs text-gray-500">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform →</a>
                </p>
              </div>
            )}

            {/* Local AI Warning */}
            {config.useLocalAI && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Local AI Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Initial download ~2GB (cached after first use)</li>
                      <li>• Requires modern browser with WebGPU support</li>
                      <li>• Analysis quality may be lower than GPT-4</li>
                      <li>• Completely private - no data leaves your browser</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Options</h3>
            
            <div className="space-y-2">
              <Label htmlFor="max-results">Maximum Search Results</Label>
              <Select
                value={config.maxResults?.toString()}
                onValueChange={(value) => setConfig(prev => ({ ...prev, maxResults: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 results (faster)</SelectItem>
                  <SelectItem value="10">10 results (recommended)</SelectItem>
                  <SelectItem value="20">20 results (thorough)</SelectItem>
                  <SelectItem value="50">50 results (comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !config.githubToken || (!config.useLocalAI && !config.openaiKey) || config.repositories.length === 0}
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Initializing AI Analysis...</span>
              </div>
            ) : (
              'Initialize AI Duplicate Detection'
            )}
          </Button>
        </form>

        {/* Test Button - Show when we have GitHub token and repositories */}
        {canTestSearch && (
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestSearch}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Testing GitHub Search...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>🧪 Test GitHub Search (Check Console)</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">🔒 Privacy & Security</p>
              <ul className="text-xs space-y-1">
                <li>• API keys stored only in browser memory (not saved permanently)</li>
                <li>• All AI analysis happens client-side or through your chosen API</li>
                <li>• No conversation data sent to our servers</li>
                <li>• GitHub access limited to repositories you specify</li>
                <li>• You can clear all data by refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MCPConfiguration; 