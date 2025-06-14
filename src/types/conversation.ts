// Intercom API Types (based on actual API response)
export interface IntercomConversation {
  id: string;
  type: 'conversation';
  created_at: number;
  updated_at: number;
  source: {
    type: string;
    id: string;
    delivered_as: string;
    subject: string;
    body: string;
    author: {
      id: string;
      type: string;
      name: string;
      email: string;
    };
  };
  contacts: Array<{
    type: string;
    id: string;
    external_id?: string;
    name?: string;
    email?: string;
  }>;
  conversation_parts: {
    type: string;
    conversation_parts: Array<{
      id: string;
      part_type: string;
      body: string;
      created_at: number;
      updated_at: number;
      notified_at: number;
      author: {
        id: string;
        type: string;
        name: string;
        email?: string;
      };
      attachments?: Array<{
        type: string;
        name: string;
        url: string;
        content_type: string;
        filesize: number;
      }>;
    }>;
  };
  state: 'open' | 'closed' | 'snoozed';
  open: boolean;
  read: boolean;
  tags?: {
    type: string;
    tags: Array<{
      type: string;
      id: string;
      name: string;
    }>;
  };
  priority?: 'priority' | 'not_priority';
  statistics?: {
    type: string;
    time_to_assignment?: number;
    time_to_admin_reply?: number;
    time_to_first_close?: number;
    time_to_last_close?: number;
    count_reopens?: number;
    count_assignments?: number;
    count_conversation_parts?: number;
  };
  custom_attributes?: Record<string, any>; // Added based on actual API response
  title?: string;
}

// Processed conversation data for our application
export interface ProcessedConversation {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
  messages: ConversationMessage[];
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  customAttributes?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  author: {
    name: string;
    email?: string;
    type: 'customer' | 'admin' | 'bot';
  };
  body: string;
  createdAt: string;
  attachments?: Array<{
    name: string;
    url: string;
    contentType: string;
  }>;
}

// GitHub Issue Template
export interface GitHubIssueTemplate {
  title: string;
  body: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
}

// LLM Analysis Result
export interface ConversationAnalysis {
  summary: string;
  issueTemplate: GitHubIssueTemplate;
  confidence: number;
  suggestedLabels: string[];
  customerImpact: 'low' | 'medium' | 'high';
  issueType: 'bug' | 'feature' | 'question' | 'improvement';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Component State Types
export interface AppState {
  conversationId: string;
  conversation: ProcessedConversation | null;
  analysis: ConversationAnalysis | null;
  loading: boolean;
  error: string | null;
}

export interface LoadingState {
  fetchingConversation: boolean;
  analyzingConversation: boolean;
  generatingTemplate: boolean;
}

// Enhanced workflow types (also defined in llmApi service)
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