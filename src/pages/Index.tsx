import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ConversationInput from "@/components/ConversationInput";
import ConversationSummary from "@/components/ConversationSummary";
import BugAnalysis from "@/components/BugAnalysis";
import IssueTemplate from "@/components/IssueTemplate";
import EnvironmentSetup from "@/components/EnvironmentSetup";
import MCPConfiguration from "@/components/MCPConfiguration";
import AIDuplicateAnalysis from "@/components/AIDuplicateAnalysis";
import { useToast } from "@/hooks/use-toast";
import { useConversation, useBugDetection, useCreateGitHubIssue, useConversationQueryStatus, useConversationCache } from "@/hooks/conversation";
import { useFrontendMCP } from "@/hooks/useFrontendMCP";
import { useQueryClient } from '@tanstack/react-query';
import { validateApiConfiguration } from "@/services/llmApi";
import type {  CreatedGitHubIssue } from "@/services/githubApi";
import type { MCPConfig, MCPAnalysisResult } from "@/types/mcp";
import type { EnhancedIssueContext } from "@/types/conversation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw, ExternalLink, Zap, Settings, Brain } from "lucide-react";

type AppStep = 'mcp-config' | 'input' | 'conversation-ready' | 'not-a-bug' | 'enhancement' | 'ai-analysis' | 'complete';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('input');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [apiConfigValid, setApiConfigValid] = useState(true);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [createdIssue, setCreatedIssue] = useState<CreatedGitHubIssue | null>(null);
  const [mcpAnalysisResult, setMCPAnalysisResult] = useState<MCPAnalysisResult | null>(null);
  const [enhancedContext, setEnhancedContext] = useState<EnhancedIssueContext | null>(null);
  const [showMCPConfig, setShowMCPConfig] = useState(false);
  const { toast } = useToast();

  // TanStack Query hooks
  const queryClient = useQueryClient();
  const conversationQuery = useConversation(conversationId);
  const bugDetectionQuery = useBugDetection(conversationQuery.data || null);
  const createIssueMutation = useCreateGitHubIssue();
  const queryStatus = useConversationQueryStatus(conversationId);
  const cacheStatus = useConversationCache(conversationId);
  
  // MCP hooks
  const mcp = useFrontendMCP();

  // Check API configuration on mount
  useEffect(() => {
    const validation = validateApiConfiguration();
    setApiConfigValid(validation.isValid);
    setMissingVars(validation.missingVars);
  }, []);

  // Extract conversation ID from URL
  const extractConversationId = (url: string): string | null => {
    try {
      const regex = /\/conversation[s]?\/(\d+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Handle conversation analysis
  const handleAnalyzeConversation = async (url: string) => {
    const id = extractConversationId(url);
    
    if (!id) {
      toast({
        title: "Invalid URL",
        description: "Could not extract conversation ID from the URL. Please check the format.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is the same URL as current
    if (url === currentUrl && conversationId === id) {
      toast({
        title: "Same Conversation",
        description: "This conversation is already being analyzed.",
        variant: "default",
      });
      return;
    }

    // Set the new conversation ID first so we can check cache for this specific ID
    const previousId = conversationId;
    setCurrentUrl(url);
    setConversationId(id);

    // Check if we have cached data for this specific conversation ID
    // Note: We need to check cache after setting the ID, but before setting step
    const conversationCache = queryClient.getQueryData(['conversation', id]);
    const bugDetectionCache = queryClient.getQueryData(['bugDetection', id]);

    if (conversationCache && bugDetectionCache) {
      console.log('[Cache] Found complete cached data for conversation', id);
      toast({
        title: "Using Cached Data",
        description: "Loading conversation from cache for faster performance.",
        variant: "default",
      });
      
      // If we have all cached data, go directly to the appropriate step
      const bugData = bugDetectionCache as any;
      if (bugData?.isBug) {
        setCurrentStep('enhancement');
      } else {
        setCurrentStep('not-a-bug');
      }
      return;
    }

    setCurrentUrl(url);
    setConversationId(id);
    setCurrentStep('input'); // Will transition to 'conversation-ready' when data loads
    
    console.log('[Cache] Starting analysis for conversation', id);
  };

  // Handle conversation fetch and step progression
  useEffect(() => {
    if (conversationQuery.isSuccess && conversationQuery.data && currentStep === 'input') {
      console.log('[Cache] Conversation loaded, transitioning to conversation-ready');
      setCurrentStep('conversation-ready');
    }
  }, [conversationQuery.isSuccess, conversationQuery.data, currentStep]);

  // Handle bug detection results
  useEffect(() => {
    if (bugDetectionQuery.isSuccess && bugDetectionQuery.data && currentStep === 'conversation-ready') {
      console.log('[Cache] Bug detection complete, isBug:', bugDetectionQuery.data.isBug);
      if (bugDetectionQuery.data.isBug) {
        setCurrentStep('enhancement');
      } else {
        setCurrentStep('not-a-bug');
      }
    }
  }, [bugDetectionQuery.isSuccess, bugDetectionQuery.data, currentStep]);

  // Handle successful GitHub issue creation
  useEffect(() => {
    if (createIssueMutation.isSuccess && (currentStep === 'enhancement' || currentStep === 'ai-analysis')) {
      setCurrentStep('complete');
      setCreatedIssue(createIssueMutation.data);
      toast({
        title: "GitHub Issue Created!",
        description: `Issue #${createIssueMutation.data?.number} has been created successfully.`,
      });
    }
  }, [createIssueMutation.isSuccess, currentStep, toast, createIssueMutation.data]);

  // Handle MCP configuration
  const handleMCPConfigured = async (config: MCPConfig) => {
    try {
      await mcp.initialize(config);
      setShowMCPConfig(false);
      toast({
        title: "MCP Configured!",
        description: "AI duplicate detection is now ready to use.",
      });
    } catch (error) {
      console.error('Failed to initialize MCP:', error);
    }
  };

  // Generate initial template helper
  const generateInitialTemplate = (conversation: any, bugDetection: any, context: EnhancedIssueContext) => {
    return {
      title: bugDetection.initialAnalysis.title,
      body: `## Description of the issue
${bugDetection.initialAnalysis.description}

## Issue details

**APP ID:**
${context.appId}

**1. What is the error message?**
${context.errorMessages || 'N/A'}

**2. Is the issue affecting all teammates or just the customer who reported the issue?**
Customer: ${conversation.customerName}

**3. When did the issue first occur?**
First occurred: ${conversation.createdAt}

**4. What device was the customer using?**
${context.browserInfo || 'Not specified'}

**5. Which browser (and version) or app version were they using?**
${context.browserInfo || 'Not specified'}

**6. What operating system and version were they on?**
Not specified

## Evidence
**Screenshots URLs:**
${context.screenshots.map(s => s.url).join('\n') || 'No screenshots provided in conversation'}

## Links
Link to the affected conversation:
https://app.intercom.io/inbox/conversation/${conversation.id}

## Steps to reproduce
${context.additionalSteps || 'Please refer to the conversation for reproduction steps.'}

## Technical Details
${context.technicalDetails || 'N/A'}`,
      labels: ['intercom', 'bug', 'customer-support', `severity-${bugDetection.severity}`],
      priority: context.customerImpact
    };
  };

  // Handle enhanced issue submission
  const handleEnhancedSubmit = async (context: EnhancedIssueContext) => {
    if (!conversationQuery.data || !bugDetectionQuery.data) return;

    setEnhancedContext(context);

    if (mcp.isInitialized) {
      try {
        const template = generateInitialTemplate(conversationQuery.data, bugDetectionQuery.data, context);
        const result = await mcp.analyzeForDuplicates(
          conversationQuery.data,
          template,
          context
        );
        
        setMCPAnalysisResult(result);
        setCurrentStep('ai-analysis');
      } catch (error) {
        console.error('MCP analysis failed:', error);
        toast({
          title: "AI Analysis Failed",
          description: "Proceeding with direct issue creation. " + (error instanceof Error ? error.message : "Unknown error"),
          variant: "destructive",
        });
        // Fallback to direct issue creation
        proceedWithIssueCreation(context);
      }
    } else {
      // No MCP configured, proceed directly
      proceedWithIssueCreation(context);
    }
  };

  // Proceed with issue creation
  const proceedWithIssueCreation = async (context: EnhancedIssueContext) => {
    if (!conversationQuery.data || !bugDetectionQuery.data) return;

    const template = generateInitialTemplate(conversationQuery.data, bugDetectionQuery.data, context);
    await handleCreateIssue({
      title: template.title,
      body: template.body,
      labels: template.labels
    });
  };

  // Handle GitHub issue creation
  const handleCreateIssue = async (issueData: { title: string; body: string; labels: string[] }) => {
    try {
      await createIssueMutation.mutateAsync({
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels,
      });
    } catch (error) {
      toast({
        title: "Error Creating GitHub Issue",
        description: error instanceof Error ? error.message : "Failed to create GitHub issue",
        variant: "destructive",
      });
    }
  };

  // Handle AI analysis actions
  const handleAIAnalysisAction = (action: string, issueId?: number) => {
    switch (action) {
      case 'back':
        setCurrentStep('enhancement');
        setMCPAnalysisResult(null);
        break;
      case 'create_new':
        if (enhancedContext) {
          proceedWithIssueCreation(enhancedContext);
        }
        break;
      case 'reference':
        toast({
          title: "Reference Issue",
          description: `You can reference issue #${issueId} in your new issue.`,
        });
        if (enhancedContext) {
          proceedWithIssueCreation(enhancedContext);
        }
        break;
      case 'merge':
        toast({
          title: "Merge with Existing",
          description: `Consider updating issue #${issueId} instead of creating a new one.`,
        });
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Reset workflow (don't clear conversationId immediately to preserve cache)
  const handleReset = () => {
    setCurrentStep('input');
    setCurrentUrl('');
    setCreatedIssue(null);
    setMCPAnalysisResult(null);
    setEnhancedContext(null);
    createIssueMutation.reset();
    // Note: We don't clear conversationId to preserve cache
  };

  // Start fresh analysis (clears cache)
  const handleStartFresh = () => {
    setCurrentStep('input');
    setCurrentUrl('');
    setConversationId(null);
    setCreatedIssue(null);
    setMCPAnalysisResult(null);
    setEnhancedContext(null);
    createIssueMutation.reset();
  };

  // Handle errors
  useEffect(() => {
    if (conversationQuery.isError) {
      toast({
        title: "Error Fetching Conversation",
        description: conversationQuery.error?.message || "Failed to fetch conversation data",
        variant: "destructive",
      });
      setCurrentStep('input');
    }
  }, [conversationQuery.isError, conversationQuery.error, toast]);

  useEffect(() => {
    if (bugDetectionQuery.isError) {
      toast({
        title: "Error Analyzing Conversation",
        description: bugDetectionQuery.error?.message || "Failed to analyze conversation for bugs",
        variant: "destructive",
      });
    }
  }, [bugDetectionQuery.isError, bugDetectionQuery.error, toast]);

  // Convert ProcessedConversation to ConversationSummary props format
  const getConversationSummaryProps = () => {
    if (!conversationQuery.data) return null;
    
    const conversation = conversationQuery.data;
    return {
      title: conversation.title,
      customer: {
        name: conversation.customerName,
        email: conversation.customerEmail,
      },
      priority: conversation.priority,
      status: conversation.status,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        author: msg.author.name,
        role: msg.author.type === 'customer' ? 'customer' as const : 'admin' as const,
        content: msg.body.replace(/<[^>]*>/g, ''), // Strip HTML
        timestamp: msg.createdAt,
      })),
      createdAt: conversation.createdAt,
      conversationId: conversation.id,
      updatedAt: conversation.updatedAt,
    };
  };

  // Show API configuration error if needed
  if (!apiConfigValid) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-4xl">
          <EnvironmentSetup missingVars={missingVars} />
        </main>
      </div>
    );
  }

  // Show MCP Configuration
  if (showMCPConfig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">AI Duplicate Detection Setup</h1>
                <p className="text-gray-600">Configure AI-powered duplicate issue detection</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowMCPConfig(false)}
              >
                Skip for now
              </Button>
            </div>
            
                    <MCPConfiguration
          onConfigured={handleMCPConfigured}
          loading={mcp.loading}
          error={mcp.error}
          initProgress={mcp.initProgress}
          testGitHubSearch={mcp.isInitialized ? mcp.testGitHubSearch : undefined}
        />
          </div>
        </main>
      </div>
    );
  }

  const hasConversation = conversationQuery.data !== undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
                    {/* MCP Status and Configuration */}
                    <div className="justify-center py-4 flex items-center gap-2">
              {mcp.isInitialized ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Brain className="w-3 h-3 mr-1" />
                  AI Detection Active
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMCPConfig(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Setup AI Detection
                </Button>
              )}
            </div>
        <div className="space-y-8">
          {/* Input Section - Always visible */}
          <div className="flex justify-between items-start">
            <ConversationInput
              onAnalyze={handleAnalyzeConversation}
              isLoading={conversationQuery.isFetching}
            />
            

          </div>

          {/* Cache Status Indicator */}
          {conversationId && cacheStatus.hasCache && (
            <Card className="w-full animate-fade-in border-blue-200 bg-blue-50/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Cache Status:</span>
                  <div className="flex gap-2">
                    <Badge variant={cacheStatus.conversationCached ? "default" : "outline"}>
                      Conversation {cacheStatus.conversationCached ? "Cached" : "Not Cached"}
                    </Badge>
                    <Badge variant={cacheStatus.bugDetectionCached ? "default" : "outline"}>
                      Analysis {cacheStatus.bugDetectionCached ? "Cached" : "Not Cached"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State for Fetching Conversation */}
          {conversationQuery.isFetching && (
            <Card className="w-full animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {cacheStatus.conversationCached ? "Using Cached Data..." : "Loading Conversation..."}
                </CardTitle>
                <CardDescription>
                  {cacheStatus.conversationCached 
                    ? "Loading conversation from cache" 
                    : "Fetching conversation data from Intercom"
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Show conversation as soon as it's available */}
          {hasConversation && (
            <div className="space-y-8">
              {/* Reset Button */}
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="px-6"
                >
                  Analyze Another Conversation
                </Button>
                {cacheStatus.hasCache && (
                  <Button
                    onClick={handleStartFresh}
                    variant="outline"
                    size="sm"
                  >
                    Clear Cache & Start Fresh
                  </Button>
                )}
              </div>

              {/* Conversation Summary - Available immediately */}
              <ConversationSummary {...getConversationSummaryProps()!} />

              {/* Bug Detection Progress */}
              {bugDetectionQuery.isFetching && (
                <Card className="w-full animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      {cacheStatus.bugDetectionCached ? "Using Cached Analysis..." : "AI Analysis in Progress"}
                    </CardTitle>
                    <CardDescription>
                      {cacheStatus.bugDetectionCached
                        ? "Loading analysis from cache"
                        : "Analyzing conversation for bug indicators..."
                      }
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {/* Bug Detection Results */}
              {bugDetectionQuery.isSuccess && bugDetectionQuery.data && (
                <BugAnalysis
                  isAnalyzing={false}
                  isBug={bugDetectionQuery.data.isBug}
                  confidence={bugDetectionQuery.data.confidence}
                  reasoning={bugDetectionQuery.data.reasoning}
                  detectedPatterns={bugDetectionQuery.data.keyIndicators}
                  bugDetectionResult={bugDetectionQuery.data}
                />
              )}

              {/* Not a Bug Message */}
              {currentStep === 'not-a-bug' && bugDetectionQuery.data && (
                <Card className="w-full animate-fade-in border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                      Not Identified as a Bug
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      AI analysis suggests this conversation does not contain a bug report
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-blue-700 bg-white/60 rounded-lg p-3 border border-blue-100">
                      {bugDetectionQuery.data.reasoning}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-blue-800">Type:</span>
                        <p className="text-sm text-blue-700">{bugDetectionQuery.data.bugType}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-800">Confidence:</span>
                        <p className="text-sm text-blue-700">{Math.round(bugDetectionQuery.data.confidence * 100)}%</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-800">Agent Escalation:</span>
                        <p className="text-sm text-blue-700">{bugDetectionQuery.data.agentEscalation}</p>
                      </div>
                    </div>

                    {bugDetectionQuery.data.keyIndicators.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Key Indicators Found:</h4>
                        <div className="flex flex-wrap gap-2">
                          {bugDetectionQuery.data.keyIndicators.map((indicator, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200"
                            >
                              {indicator}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Interactive Template Enhancement */}
              {currentStep === 'enhancement' && conversationQuery.data && bugDetectionQuery.data && (
                <IssueTemplate
                  initialTemplate={{
                    description: bugDetectionQuery.data.initialAnalysis.description,
                    appId: "",
                    errorMessage: "",
                    affectedScope: `Customer: ${conversationQuery.data.customerName}`,
                    timeline: `First occurred: ${conversationQuery.data.createdAt}`,
                    device: "Not specified",
                    browser: "Not specified", 
                    operatingSystem: "Not specified",
                    screenshotUrls: [],
                    videoUrl: "",
                    userLink: "",
                    conversationLink: `https://app.intercom.io/inbox/conversation/${conversationQuery.data.id}`,
                    affectedPageLink: "",
                    reproductionSteps: [],
                    website: "",
                    loginCredentials: ""
                  }}
                  onGenerate={handleCreateIssue}
                  onEnhancedSubmit={handleEnhancedSubmit}
                  bugDetectionResult={bugDetectionQuery.data}
                  mcpEnabled={mcp.isInitialized}
                />
              )}

              {/* AI Duplicate Analysis */}
              {currentStep === 'ai-analysis' && mcpAnalysisResult && (
                <AIDuplicateAnalysis
                  analysisResult={mcpAnalysisResult}
                  onSelectAction={handleAIAnalysisAction}
                  loading={mcp.loading}
                />
              )}

              {/* Loading State for Issue Creation */}
              {createIssueMutation.isPending && (
                <Card className="w-full animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating GitHub Issue...
                    </CardTitle>
                    <CardDescription>
                      Creating issue in your GitHub repository
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {/* Final Success State */}
              {currentStep === 'complete' && createdIssue && (
                <Card className="w-full animate-fade-in border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      GitHub Issue Created Successfully!
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Your GitHub issue has been created and is now live in your repository
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50/50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-green-800">Issue Number:</span>
                          <p className="text-sm text-green-700">#{createdIssue.number}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-green-800">Status:</span>
                          <p className="text-sm text-green-700 capitalize">{createdIssue.state}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-green-800">Created:</span>
                          <p className="text-sm text-green-700">{new Date(createdIssue.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-green-800">Labels:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {createdIssue.labels.map((label) => (
                              <span
                                key={label.id}
                                className="px-2 py-1 text-xs rounded-full"
                                style={{ 
                                  backgroundColor: `#${label.color}20`,
                                  color: `#${label.color}`,
                                  border: `1px solid #${label.color}40`
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => window.open(createdIssue.html_url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Issue on GitHub
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="outline"
                        >
                          Create Another Issue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
