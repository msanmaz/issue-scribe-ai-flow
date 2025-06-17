import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConversation, formatConversationForAnalysis } from '../services/intercomApi';
import { 
  detectBugFromConversation, 
  type BugDetectionResult,
} from '../services/llmApi';
import { createGitHubIssue, type GitHubIssueData, type CreatedGitHubIssue } from '../services/githubApi';
import type { ProcessedConversation } from '../types/conversation';

// Query Keys - Centralized and type-safe
export const queryKeys = {
  conversation: (id: string) => ['conversation', id] as const,
  bugDetection: (conversationId: string) => ['bugDetection', conversationId] as const,
  githubIssue: (conversationId: string, title: string) => ['githubIssue', conversationId, title] as const,
};

/**
 * Hook to fetch and cache conversation data
 */
export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: conversationId ? queryKeys.conversation(conversationId) : ['conversation', 'empty'],
    queryFn: async () => {
      if (!conversationId) throw new Error('No conversation ID provided');
      
      console.log(`[Cache] Fetching conversation ${conversationId} from API...`);
      const response = await fetchConversation(conversationId);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch conversation');
      }
      console.log(`[Cache] Successfully fetched conversation ${conversationId}`);
      return response.data;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 15, // 15 minutes - increased for better caching
    gcTime: 1000 * 60 * 60, // 1 hour in cache - increased retention
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if we have cached data
  });
};

/**
 * Hook to perform bug detection analysis with caching
 */
export const useBugDetection = (conversation: ProcessedConversation | null) => {
  return useQuery({
    queryKey: conversation?.id ? queryKeys.bugDetection(conversation.id) : ['bugDetection', 'empty'],
    queryFn: async () => {
      if (!conversation) throw new Error('No conversation provided');
      
      console.log(`[Cache] Analyzing conversation ${conversation.id} for bugs...`);
      const conversationData = formatConversationForAnalysis(conversation);
      const response = await detectBugFromConversation(conversation, conversationData);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to detect bugs');
      }
      console.log(`[Cache] Bug analysis complete for conversation ${conversation.id}`);
      return response.data;
    },
    enabled: !!conversation?.id,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours - bug detection is expensive and results are very stable
    gcTime: 1000 * 60 * 60 * 4, // 4 hours in cache - longer retention for expensive operations
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to create GitHub issues directly
 */
export const useCreateGitHubIssue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (issueData: GitHubIssueData) => {
      const response = await createGitHubIssue(issueData);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create GitHub issue');
      }
      return response.data;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 30000),
    onSuccess: (data, variables) => {
      // Cache the result for potential reuse
      queryClient.setQueryData(
        queryKeys.githubIssue('current', variables.title),
        data
      );
    },
  });
};

/**
 * Hook to prefetch conversation data (for performance optimization)
 */
export const usePrefetchConversation = () => {
  const queryClient = useQueryClient();
  
  return (conversationId: string) => {
    if (!conversationId) return;
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.conversation(conversationId),
      queryFn: async () => {
        const response = await fetchConversation(conversationId);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message || 'Failed to fetch conversation');
        }
        return response.data;
      },
      staleTime: 1000 * 60 * 15,
    });
  };
};

/**
 * Hook to check if we have cached data for a conversation
 */
export const useConversationCache = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  
  if (!conversationId) return { 
    hasCache: false, 
    hasValid: false, 
    conversationCached: false,
    bugDetectionCached: false 
  };
  
  const conversationCache = queryClient.getQueryData(queryKeys.conversation(conversationId));
  const bugDetectionCache = queryClient.getQueryData(queryKeys.bugDetection(conversationId));
  
  // Add some debugging
  console.log(`[Cache Check] Conversation ${conversationId}:`, {
    conversationCached: !!conversationCache,
    bugDetectionCached: !!bugDetectionCache,
    conversationData: conversationCache ? 'Available' : 'Not Available',
    bugDetectionData: bugDetectionCache ? 'Available' : 'Not Available',
  });
  
  return {
    hasCache: !!conversationCache || !!bugDetectionCache,
    hasValid: !!conversationCache && !!bugDetectionCache,
    conversationCached: !!conversationCache,
    bugDetectionCached: !!bugDetectionCache,
  };
};

/**
 * Hook to get query status across all conversation-related queries
 */
export const useConversationQueryStatus = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  
  if (!conversationId) {
    return {
      isAnyLoading: false,
      isAnyError: false,
      hasConversationCache: false,
      hasBugDetectionCache: false,
    };
  }
  
  const conversationQuery = queryClient.getQueryState(queryKeys.conversation(conversationId));
  const bugDetectionQuery = queryClient.getQueryState(queryKeys.bugDetection(conversationId));
  
  return {
    isAnyLoading: conversationQuery?.status === 'pending' || bugDetectionQuery?.status === 'pending',
    isAnyError: conversationQuery?.status === 'error' || bugDetectionQuery?.status === 'error',
    hasConversationCache: conversationQuery?.status === 'success',
    hasBugDetectionCache: bugDetectionQuery?.status === 'success',
  };
}; 