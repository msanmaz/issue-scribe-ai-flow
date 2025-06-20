import React, { useState } from 'react';
import type { MCPAnalysisResult } from '../types/mcp';
import { formatDate } from '../utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';

interface AIDuplicateAnalysisProps {
  analysisResult: MCPAnalysisResult;
  onSelectAction: (action: string, issueId?: number) => void;
  loading: boolean;
}

const AIDuplicateAnalysis: React.FC<AIDuplicateAnalysisProps> = ({
  analysisResult,
  onSelectAction,
  loading
}) => {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const toggleExpanded = (issueId: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'duplicate': return 'bg-red-100 text-red-800 border-red-200';
      case 'related': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dependency': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'follow-up': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'merge': return 'bg-red-600 hover:bg-red-700';
      case 'reference': return 'bg-blue-600 hover:bg-blue-700';
      case 'update_existing': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'create_new': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🤖 AI Analyzing Repository
              </h3>
              <p className="text-gray-600">
                Searching for semantically similar issues using {analysisResult?.ai_model_used || 'AI'}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-start justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2 mb-2">
              🤖 AI Duplicate Analysis Results
            </CardTitle>
            <CardDescription>
              Found {analysisResult.analyzed_issues.length} potentially related issues using semantic analysis
            </CardDescription>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Model: {analysisResult.ai_model_used}</div>
            <div>Analysis time: {Math.round(analysisResult.search_time_ms / 1000)}s</div>
          </div>
        </div>

        {/* Summary Stats */}
        {analysisResult.analyzed_issues.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {analysisResult.analyzed_issues.filter(i => i.relationship_type === 'duplicate').length}
              </div>
              <div className="text-xs text-gray-600">Potential Duplicates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analysisResult.analyzed_issues.filter(i => i.relationship_type === 'related').length}
              </div>
              <div className="text-xs text-gray-600">Related Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analysisResult.analyzed_issues.filter(i => i.similarity_score >= 0.8).length}
              </div>
              <div className="text-xs text-gray-600">High Similarity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {analysisResult.analyzed_issues.filter(i => i.issue.state === 'open').length}
              </div>
              <div className="text-xs text-gray-600">Open Issues</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {analysisResult.analyzed_issues.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Similar Issues Found</h3>
            <p className="text-gray-600 mb-4">
              AI semantic analysis found no existing issues that match this customer's problem.
            </p>
            <p className="text-sm text-green-600 font-medium">
              ✨ This appears to be a unique issue worth creating!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analysisResult.analyzed_issues
              .sort((a, b) => b.similarity_score - a.similarity_score)
              .map((analyzed) => (
                <div
                  key={analyzed.issue.id}
                  className="border rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  {/* Issue Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2 leading-tight">
                        {analyzed.issue.title}
                      </h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span>#{analyzed.issue.number}</span>
                        <Badge 
                          variant={analyzed.issue.state === 'open' ? 'default' : 'secondary'}
                          className={analyzed.issue.state === 'open' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {analyzed.issue.state}
                        </Badge>
                        <span>{formatDate(analyzed.issue.created_at)}</span>
                        {analyzed.issue.assignees.length > 0 && (
                          <span>• Assigned</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge 
                        variant="outline"
                        className={`${getRelationshipColor(analyzed.relationship_type)} border`}
                      >
                        {analyzed.relationship_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Similarity Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Similarity Score</span>
                      <span className={`text-sm font-bold ${getSimilarityColor(analyzed.similarity_score)}`}>
                        {Math.round(analyzed.similarity_score * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          analyzed.similarity_score >= 0.8 ? 'bg-red-500' :
                          analyzed.similarity_score >= 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${analyzed.similarity_score * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* AI Reasoning - Expandable */}
                  <div className="mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(analyzed.issue.id)}
                      className="p-0 h-auto text-blue-600 hover:text-blue-800"
                    >
                      <span className="flex items-center gap-2">
                        🧠 AI Analysis Reasoning
                        {expandedIssues.has(analyzed.issue.id) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </span>
                    </Button>
                    
                    {expandedIssues.has(analyzed.issue.id) && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900 leading-relaxed">
                          {analyzed.reasoning}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Issue Labels */}
                  {analyzed.issue.labels.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {analyzed.issue.labels.slice(0, 6).map((label) => (
                          <Badge
                            key={label.name}
                            variant="outline"
                            style={{
                              backgroundColor: `#${label.color}20`,
                              borderColor: `#${label.color}40`,
                              color: `#${label.color}`
                            }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                        {analyzed.issue.labels.length > 6 && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            +{analyzed.issue.labels.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={analyzed.issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        View on GitHub
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => onSelectAction(analyzed.suggested_action, analyzed.issue.id)}
                      className={getActionColor(analyzed.suggested_action)}
                    >
                      {analyzed.suggested_action.replace('_', ' ').toUpperCase()}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>

      {/* Bottom Actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => onSelectAction('back')}
        >
          ← Back to Enhancement
        </Button>
        
        <div className="flex items-center space-x-3">
          {analysisResult.analyzed_issues.length > 0 && (
            <span className="text-sm text-gray-500">
              Found {analysisResult.analyzed_issues.filter(i => i.similarity_score >= 0.7).length} high-similarity matches
            </span>
          )}
          <Button
            onClick={() => onSelectAction('create_new')}
            className="bg-green-600 hover:bg-green-700"
          >
            Create New Issue Anyway
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AIDuplicateAnalysis; 