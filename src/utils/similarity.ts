/**
 * Calculate basic text similarity using Jaccard similarity
 */
export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate semantic similarity based on various factors
 */
export function calculateSemanticSimilarity(
  newIssue: {
    title: string;
    body: string;
    errorMessages?: string;
    appId?: string;
  },
  existingIssue: {
    title: string;
    body: string;
    labels: { name: string }[];
  }
): number {
  // Title similarity (weight: 40%)
  const titleSimilarity = calculateJaccardSimilarity(newIssue.title, existingIssue.title);
  
  // Body similarity (weight: 30%)
  const bodySimilarity = calculateJaccardSimilarity(newIssue.body, existingIssue.body);
  
  // Error message similarity (weight: 20%)
  let errorSimilarity = 0;
  if (newIssue.errorMessages) {
    errorSimilarity = calculateJaccardSimilarity(newIssue.errorMessages, existingIssue.body);
  }
  
  // App ID match (weight: 10%)
  let appIdMatch = 0;
  if (newIssue.appId && existingIssue.body.includes(newIssue.appId)) {
    appIdMatch = 1;
  }
  
  return (titleSimilarity * 0.4) + (bodySimilarity * 0.3) + (errorSimilarity * 0.2) + (appIdMatch * 0.1);
}

/**
 * Extract keywords from text for better matching
 */
export function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his',
    'her', 'its', 'our', 'their'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 20); // Limit to top 20 keywords
}

/**
 * Generate search queries based on issue content
 */
export function generateSearchQueries(
  title: string,
  body: string,
  errorMessages?: string,
  appId?: string
): string[] {
  const queries: string[] = [];
  
  // Primary query with title keywords
  const titleKeywords = extractKeywords(title);
  if (titleKeywords.length > 0) {
    queries.push(titleKeywords.slice(0, 3).join(' '));
  }
  
  // Error message query
  if (errorMessages) {
    const errorKeywords = extractKeywords(errorMessages);
    if (errorKeywords.length > 0) {
      queries.push(errorKeywords.slice(0, 2).join(' '));
    }
  }
  
  // App ID specific query
  if (appId) {
    queries.push(appId);
  }
  
  // Technical terms query
  const technicalTerms = body.match(/\b[A-Z][a-zA-Z]*Error\b|\b[a-z]+Exception\b|\bAPI\b|\bHTTP\b|\bSSL\b|\bURL\b/g);
  if (technicalTerms && technicalTerms.length > 0) {
    queries.push(technicalTerms.slice(0, 2).join(' '));
  }
  
  return queries.filter(query => query.length > 0);
} 