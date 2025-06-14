import axios, { type AxiosResponse } from 'axios';
import type { IntercomConversation, ProcessedConversation, ApiResponse } from '../types/conversation';

// Use proxy in development, direct API in production
const INTERCOM_API_BASE_URL = import.meta.env.DEV 
  ? '/api/intercom' 
  : 'https://api.intercom.io';

const INTERCOM_API_VERSION = '2.10';

// Create axios instance with default config
const intercomClient = axios.create({
  baseURL: INTERCOM_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Intercom-Version': INTERCOM_API_VERSION,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add authorization header
intercomClient.interceptors.request.use(
  (config) => {
    const token = import.meta.env.VITE_testworkspace;
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
intercomClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Intercom access token. Please check your environment variables.');
    }
    if (error.response?.status === 404) {
      throw new Error('Conversation not found. Please check the conversation ID.');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    // Handle CORS errors in development
    if (error.code === 'ERR_NETWORK' && import.meta.env.DEV) {
      throw new Error('Network error. Make sure your development proxy is running.');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'An unexpected error occurred');
  }
);

/**
 * Validates conversation ID format
 */
export const validateConversationId = (id: string): boolean => {
  return /^\d+$/.test(id.trim());
};

/**
 * Fetches conversation data from Intercom API
 */
export const fetchConversation = async (conversationId: string): Promise<ApiResponse<ProcessedConversation>> => {
  try {
    if (!validateConversationId(conversationId)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Conversation ID must be a numeric value',
        },
      };
    }

    console.log(`Fetching conversation ${conversationId}...`);
    
    const response: AxiosResponse<IntercomConversation> = await intercomClient.get(
      `/conversations/${conversationId.trim()}`
    );

    console.log('Conversation fetched successfully:', response.data.id);
    
    const processedConversation = processConversationData(response.data);

    return {
      success: true,
      data: processedConversation,
    };
  } catch (error) {
    console.error('Error fetching conversation:', error);
    
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch conversation',
        details: error,
      },
    };
  }
};

/**
 * Processes raw Intercom conversation data into our application format
 */
const processConversationData = (rawConversation: IntercomConversation): ProcessedConversation => {
  // Extract customer information from conversation parts (find first user type)
  let customer = rawConversation.contacts?.[0];
  
  // Look for actual customer in conversation parts
  const customerMessage = rawConversation.conversation_parts?.conversation_parts?.find(
    part => part.author.type === 'user' && part.body
  );
  
  if (customerMessage) {
    customer = {
      type: customerMessage.author.type,
      name: customerMessage.author.name,
      email: customerMessage.author.email,
      id: customerMessage.author.id
    };
  } else if (!customer) {
    // Fallback to source author if no customer found in parts
    customer = rawConversation.source.author;
  }
  
  // Process messages from source and conversation parts
  const messages = [];
  
  // Add initial message if it has content
  if (rawConversation.source.body) {
    messages.push({
      id: 'source',
      author: {
        name: rawConversation.source.author.name || 'Unknown',
        email: rawConversation.source.author.email || '',
        type: rawConversation.source.author.type === 'admin' ? 'admin' as const : 
              rawConversation.source.author.type === 'bot' ? 'bot' as const : 'customer' as const,
      },
      body: rawConversation.source.body,
      createdAt: new Date(rawConversation.created_at * 1000).toISOString(),
    });
  }
  
  // Add conversation parts that have meaningful content
  if (rawConversation.conversation_parts?.conversation_parts) {
    const meaningfulParts = rawConversation.conversation_parts.conversation_parts
      .filter(part => part.body && part.part_type === 'comment')
      .map((part) => ({
        id: part.id,
        author: {
          name: part.author.name || 'Unknown',
          email: part.author.email || '',
          type: part.author.type === 'admin' ? 'admin' as const : 
                part.author.type === 'bot' ? 'bot' as const : 'customer' as const,
        },
        body: part.body,
        createdAt: new Date(part.created_at * 1000).toISOString(),
        attachments: part.attachments?.map((attachment: any) => ({
          name: attachment.name,
          url: attachment.url,
          contentType: attachment.content_type,
        })),
      }));
    
    messages.push(...meaningfulParts);
  }

  // Extract tags and custom attributes
  const tags = rawConversation.tags?.tags?.map((tag: any) => tag.name) || [];
  
  // Add useful custom attributes as tags for context
  const customAttributes = rawConversation.custom_attributes || {};
  const additionalTags = [];
  
  if (customAttributes['Query Type']) {
    additionalTags.push(`Query: ${customAttributes['Query Type']}`);
  }
  if (customAttributes['AI Issue summary']) {
    additionalTags.push('AI Summary Available');
  }
  if (customAttributes['Brand']) {
    additionalTags.push(`Brand: ${customAttributes['Brand']}`);
  }
  
  const allTags = [...tags, ...additionalTags];

  // Determine priority
  let priority: 'low' | 'medium' | 'high' = 'medium';
  if (rawConversation.priority === 'priority') {
    priority = 'high';
  } else if (customAttributes['Customer Experience (CX) rating'] && customAttributes['Customer Experience (CX) rating'] <= 2) {
    priority = 'high';
  } else if (allTags.some((tag: string) => tag.toLowerCase().includes('urgent') || tag.toLowerCase().includes('critical'))) {
    priority = 'high';
  } else if (allTags.some((tag: string) => tag.toLowerCase().includes('low'))) {
    priority = 'low';
  }

  return {
    id: rawConversation.id,
    title: rawConversation.source.subject || rawConversation.title || 'Untitled Conversation',
    customerName: customer?.name || 'Unknown Customer',
    customerEmail: customer?.email || '',
    createdAt: new Date(rawConversation.created_at * 1000).toISOString(),
    updatedAt: new Date(rawConversation.updated_at * 1000).toISOString(),
    status: rawConversation.state === 'closed' ? 'closed' : 'open',
    messages,
    tags: allTags,
    priority,
    customAttributes,
  };
};

/**
 * Formats conversation data for LLM analysis
 */
export const formatConversationForAnalysis = (conversation: ProcessedConversation): string => {
  const formattedMessages = conversation.messages
    .map((message, index) => {
      const timestamp = new Date(message.createdAt).toLocaleString();
      const authorType = message.author.type.toUpperCase();
      // Strip HTML tags for cleaner analysis
      const cleanBody = message.body.replace(/<[^>]*>/g, '');
      return `
Message ${index + 1} [${timestamp}] - ${authorType}: ${message.author.name}
${cleanBody}
${message.attachments?.length ? `Attachments: ${message.attachments.map(a => a.name).join(', ')}` : ''}
      `.trim();
    })
    .join('\n\n---\n\n');

  // Include custom attributes that are useful for issue creation
  const customAttributesText = conversation.customAttributes ? Object.entries(conversation.customAttributes)
    .filter(([key, value]) => value && typeof value === 'string' && value.trim())
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n') : '';

  return `
CONVERSATION DETAILS:
- ID: ${conversation.id}
- Title: ${conversation.title}
- Customer: ${conversation.customerName} (${conversation.customerEmail})
- Status: ${conversation.status}
- Priority: ${conversation.priority}
- Tags: ${conversation.tags.join(', ') || 'None'}
- Created: ${new Date(conversation.createdAt).toLocaleString()}
- Updated: ${new Date(conversation.updatedAt).toLocaleString()}

CUSTOM ATTRIBUTES:
${customAttributesText || 'None'}

CONVERSATION THREAD:
${formattedMessages}
  `.trim();
}; 