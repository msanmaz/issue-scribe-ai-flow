import axios from 'axios';
import type { ProcessedConversation, ConversationAnalysis, ApiResponse } from '../types/conversation';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Create axios instance for OpenAI
const openaiClient = axios.create({
  baseURL: OPENAI_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authorization header
openaiClient.interceptors.request.use(
  (config) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
openaiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your environment variables.');
    }
    if (error.response?.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. The analysis is taking too long.');
    }
    throw new Error(error.response?.data?.error?.message || 'Failed to analyze conversation');
  }
);

/**
 * Validates API configuration
 */
export const validateApiConfiguration = (): { isValid: boolean; missingVars: string[] } => {
  const requiredVars = [
    'VITE_INTERCOM_ACCESS_TOKEN',
    'VITE_OPENAI_API_KEY',
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
 * Creates the system prompt for bug detection and initial analysis
 */
const createBugDetectionPrompt = (): string => {
  return `You are an expert Technical Support Engineer at Intercom who analyzes customer conversations to determine if they require GitHub issue creation.

Your primary task is to determine if a conversation represents a genuine bug/technical issue that needs engineering attention, or if it's a general inquiry, feature request, or resolved issue.

CRITICAL ANALYSIS CRITERIA:

**STRONG BUG INDICATORS:**
- Agent explicitly mentions "logging this as a bug", "creating a ticket", "escalating to engineering"
- Customer reports functionality that is "not working", "broken", "failing"
- Error messages, error codes, or system failures mentioned
- Unexpected behavior vs. documented functionality
- Agent acknowledges the issue and suggests internal follow-up
- Tags indicating "bug", "issue", "error", "broken"
- Agent apologizes for the issue and mentions internal investigation

**NOT A BUG INDICATORS:**
- General "how to" questions
- Feature requests or suggestions for improvements
- Questions about pricing, billing, or account management
- Issues resolved through explanation or user education
- Agent successfully helps customer with existing functionality
- Customer satisfaction achieved without identifying system problems

**ANALYSIS PROCESS:**
1. Examine agent responses for escalation language
2. Look for customer reports of non-functioning features
3. Check conversation tags and custom attributes for issue indicators
4. Assess if the agent treated this as a technical problem requiring internal action
5. Determine if this needs engineering investigation vs. customer education

Return your response as a JSON object:
{
  "isBug": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of why this is/isn't a bug",
  "bugType": "bug|feature|question|resolved",
  "severity": "low|medium|high",
  "keyIndicators": ["list", "of", "indicators", "found"],
  "agentEscalation": "Did the agent indicate this needs internal follow-up?",
  "initialAnalysis": {
    "title": "Brief issue title if bug",
    "description": "What is the core problem?",
    "customerImpact": "How is this affecting the customer?"
  }
}

If isBug is false, provide clear reasoning and stop analysis there.
If isBug is true, provide initial analysis for the GitHub issue creation process.`;
};

/**
 * Enhanced system prompt for full GitHub issue generation (after bug confirmation)
 */
const createIssueGenerationPrompt = (): string => {
  return `You are an expert Technical Support Engineer creating a GitHub issue from a confirmed bug report.

You have additional context provided by the TSE including screenshots, reproduction steps, and technical details.

Create a GitHub issue following this EXACT template:

## Description of the issue
A concise description of what the problem is. What was the customer trying to achieve, and what actually occurred?

## Issue details

**APP ID:**
*Please provide the App ID (numbers), not the code.*

**1. What is the error message?**
*Please write the full error message received by the customer. If there is no error message, write 'N/A'*

**2. Is the issue affecting all teammates or just the customer who reported the issue?**

**3. When did the issue first occur? Is it happening every time or intermittently? Have they experienced this before, or is this the first time?**
*Please include timestamp when possible.*

**4. What device was the customer was using when they received the error?**
e.g. desktop, phone, tablet

**5. Which browser (and version) or app version were they using?**

**6. What operating system and version were they on?**

## Evidence
**Screenshots URLs** (*Please use Droplr. to get the screenshots URLs):*
**[Optional] Replication steps video URL** (*Please add a video showing the issue and make sure your video includes audio*):*

## Links
*Please add any relevant links to support this investigation.*

* Link to the user affected:
* Link to the affected conversation:
* Link to the affected page in Intercom:

## Steps to reproduce
Make sure to try and reproduce all issues in the **region** matching that of the impacted customer. As well as the reproduction video, please also describe the steps taken to reproduce the issue.
*If you can't reproduce the issue yourself, please note reproduction steps that the customer is doing in order to reproduce the issue.*

**1. One:**
**2. Two:**
**3. Three:**

If the issue is happening on the customer's website, please provide:

**1. Website:**
**2. Login credentials:**

Use the enhanced information provided by the TSE to fill in as many details as possible.

Return as JSON:
{
  "issueTemplate": {
    "title": "Clear, specific issue title",
    "body": "Full template following exact format above",
    "labels": ["appropriate", "labels"],
    "priority": "low|medium|high"
  },
  "confidence": 0.8,
  "summary": "Brief summary of the issue"
}`;
};

/**
 * Step 1: Analyzes conversation to determine if it's a bug requiring GitHub issue
 */
export const detectBugFromConversation = async (
  conversation: ProcessedConversation,
  conversationData: string
): Promise<ApiResponse<BugDetectionResult>> => {
  try {
    console.log('Starting bug detection analysis...');
    
    const userPrompt = `Analyze this Intercom conversation to determine if it represents a bug requiring GitHub issue creation.

CONVERSATION DATA:
${conversationData}

CONVERSATION CONTEXT:
- Customer: ${conversation.customerName} (${conversation.customerEmail})
- Status: ${conversation.status}
- Tags: ${conversation.tags.join(', ') || 'None'}
- Custom Attributes: ${JSON.stringify(conversation.customAttributes || {}, null, 2)}

Focus on agent language, escalation signals, error reports, and technical issues that would require engineering investigation.`;

    const response = await openaiClient.post('', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: createBugDetectionPrompt(),
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const aiResponse = response.data.choices[0].message.content;
    console.log('Bug Detection Response:', aiResponse);

    try {
      const detectionResult = JSON.parse(aiResponse);
      
      return {
        success: true,
        data: {
          isBug: detectionResult.isBug || false,
          confidence: detectionResult.confidence || 0.5,
          reasoning: detectionResult.reasoning || 'Analysis completed',
          bugType: detectionResult.bugType || 'question',
          severity: detectionResult.severity || 'medium',
          keyIndicators: detectionResult.keyIndicators || [],
          agentEscalation: detectionResult.agentEscalation || 'Not indicated',
          initialAnalysis: detectionResult.initialAnalysis || {
            title: 'Issue from conversation',
            description: 'No description available',
            customerImpact: 'Unknown impact'
          }
        }
      };
    } catch (parseError) {
      console.error('Failed to parse bug detection response:', parseError);
      
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse bug detection results',
          details: parseError,
        },
      };
    }

  } catch (error) {
    console.error('Error during bug detection:', error);
    
    return {
      success: false,
      error: {
        code: 'DETECTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to detect bug',
        details: error,
      },
    };
  }
};

/**
 * Step 2: Generates final GitHub issue with enhanced context
 */
export const generateEnhancedGitHubIssue = async (
  conversation: ProcessedConversation,
  conversationData: string,
  enhancedContext: EnhancedIssueContext
): Promise<ApiResponse<ConversationAnalysis>> => {
  try {
    console.log('Generating enhanced GitHub issue...');
    
    const userPrompt = `Create a GitHub issue using the enhanced context provided by the TSE.

ORIGINAL CONVERSATION:
${conversationData}

ENHANCED CONTEXT PROVIDED BY TSE:
- Screenshots: ${enhancedContext.screenshots.length > 0 ? enhancedContext.screenshots.map(s => s.name).join(', ') : 'None'}
- Additional Steps: ${enhancedContext.additionalSteps || 'None provided'}
- Technical Details: ${enhancedContext.technicalDetails || 'None provided'}
- Error Messages: ${enhancedContext.errorMessages || 'None provided'}
- Browser/Device Info: ${enhancedContext.browserInfo || 'None provided'}
- App ID: ${enhancedContext.appId || 'Not provided'}

CONVERSATION DETAILS:
- Customer: ${conversation.customerName} (${conversation.customerEmail})
- Conversation ID: ${conversation.id}
- Created: ${conversation.createdAt}

Use all available information to create a comprehensive GitHub issue.`;

    const response = await openaiClient.post('', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: createIssueGenerationPrompt(),
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = response.data.choices[0].message.content;
    console.log('Enhanced Issue Generation Response:', aiResponse);

    try {
      const issueResult = JSON.parse(aiResponse);
      
      const analysisResult: ConversationAnalysis = {
        summary: issueResult.summary || 'Enhanced GitHub issue generated',
        issueTemplate: {
          title: issueResult.issueTemplate?.title || 'Issue from conversation',
          body: issueResult.issueTemplate?.body || 'No description available',
          labels: issueResult.issueTemplate?.labels || ['support', 'customer-issue'],
          priority: issueResult.issueTemplate?.priority || 'medium',
        },
        confidence: issueResult.confidence || 0.8,
        suggestedLabels: issueResult.issueTemplate?.labels || [],
        customerImpact: enhancedContext.customerImpact || 'medium',
        issueType: 'bug',
      };
      console.log('Enhanced GitHub issue generated:', analysisResult);
      return {
        success: true,
        data: analysisResult,
      };
    } catch (parseError) {
      console.error('Failed to parse issue generation response:', parseError);
      
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse GitHub issue results',
          details: parseError,
        },
      };
    }

  } catch (error) {
    console.error('Error during enhanced issue generation:', error);
    
    return {
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate enhanced issue',
        details: error,
      },
    };
  }
};

// New types for enhanced workflow
export interface BugDetectionResult {
  isBug: boolean;
  confidence: number;
  reasoning: string;
  bugType: 'bug' | 'feature' | 'question' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  keyIndicators: string[];
  agentEscalation: string;
  initialAnalysis: {
    title: string;
    description: string;
    customerImpact: string;
  };
}

export interface EnhancedIssueContext {
  screenshots: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
  additionalSteps: string;
  technicalDetails: string;
  errorMessages: string;
  browserInfo: string;
  appId: string;
  customerImpact: 'low' | 'medium' | 'high';
} 