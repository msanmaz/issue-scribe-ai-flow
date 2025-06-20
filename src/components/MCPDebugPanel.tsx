import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug, Search, GitBranch } from 'lucide-react';

interface MCPDebugInfo {
  searchQueries: string[];
  gitHubResults: Array<{
    query: string;
    count: number;
    issues: Array<{
      number: number;
      title: string;
      state: string;
      labels: string[];
    }>;
  }>;
  similarityScores: Array<{
    issue: number;
    title: string;
    similarity: number;
    reasoning: string;
  }>;
  totalProcessingTime: number;
}

interface MCPDebugPanelProps {
  debugInfo?: MCPDebugInfo;
  isVisible?: boolean;
  onToggle: () => void;
}

const MCPDebugPanel: React.FC<MCPDebugPanelProps> = ({
  debugInfo,
  isVisible = false,
  onToggle
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <Bug className="w-4 h-4 mr-2" />
          Show Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50">
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
              <Bug className="w-4 h-4" />
              MCP Debug Panel
            </CardTitle>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100"
            >
              ✕
            </Button>
          </div>
          <CardDescription className="text-xs text-purple-700">
            Real-time analysis debugging information
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          {debugInfo ? (
            <>
              {/* Search Queries Section */}
              <Collapsible
                open={expandedSections.has('queries')}
                onOpenChange={() => toggleSection('queries')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-white rounded border hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Search Queries ({debugInfo.searchQueries?.length || 0})
                    </span>
                  </div>
                  {expandedSections.has('queries') ? 
                    <ChevronUp className="w-3 h-3" /> : 
                    <ChevronDown className="w-3 h-3" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {debugInfo.searchQueries?.map((query, index) => (
                    <div key={index} className="p-2 bg-white rounded border text-xs">
                      <code className="text-purple-800">{query}</code>
                    </div>
                  )) || <div className="text-gray-500">No queries generated</div>}
                </CollapsibleContent>
              </Collapsible>

              {/* GitHub Results Section */}
              <Collapsible
                open={expandedSections.has('results')}
                onOpenChange={() => toggleSection('results')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-white rounded border hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3 h-3 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      GitHub Results ({debugInfo.gitHubResults?.reduce((acc, r) => acc + r.count, 0) || 0} total)
                    </span>
                  </div>
                  {expandedSections.has('results') ? 
                    <ChevronUp className="w-3 h-3" /> : 
                    <ChevronDown className="w-3 h-3" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {debugInfo.gitHubResults?.map((result, index) => (
                    <div key={index} className="p-2 bg-white rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-purple-800 text-xs">{result.query}</code>
                        <Badge variant="outline" className="text-xs">
                          {result.count} results
                        </Badge>
                      </div>
                      {result.issues.slice(0, 3).map((issue, idx) => (
                        <div key={idx} className="text-xs text-gray-700 ml-2">
                          #{issue.number}: {issue.title.substring(0, 40)}...
                        </div>
                      ))}
                      {result.issues.length > 3 && (
                        <div className="text-xs text-gray-500 ml-2">
                          +{result.issues.length - 3} more
                        </div>
                      )}
                    </div>
                  )) || <div className="text-gray-500">No results found</div>}
                </CollapsibleContent>
              </Collapsible>

              {/* Similarity Scores Section */}
              <Collapsible
                open={expandedSections.has('similarity')}
                onOpenChange={() => toggleSection('similarity')}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-white rounded border hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 text-purple-600">📊</span>
                    <span className="font-medium text-purple-900">
                      Similarity Analysis ({debugInfo.similarityScores?.length || 0})
                    </span>
                  </div>
                  {expandedSections.has('similarity') ? 
                    <ChevronUp className="w-3 h-3" /> : 
                    <ChevronDown className="w-3 h-3" />
                  }
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {debugInfo.similarityScores?.map((score, index) => (
                    <div key={index} className="p-2 bg-white rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">#{score.issue}</span>
                        <Badge 
                          variant={score.similarity >= 0.8 ? "destructive" : score.similarity >= 0.6 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {Math.round(score.similarity * 100)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-700 mb-1">
                        {score.title.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-gray-600">
                        {score.reasoning.substring(0, 80)}...
                      </div>
                    </div>
                  )) || <div className="text-gray-500">No similarity analysis yet</div>}
                </CollapsibleContent>
              </Collapsible>

              {/* Performance Stats */}
              <div className="p-2 bg-white rounded border">
                <div className="text-xs font-medium text-purple-900 mb-1">Performance</div>
                <div className="text-xs text-gray-700">
                  Total processing time: {debugInfo.totalProcessingTime}ms
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-xs">No debug information available</div>
              <div className="text-xs">Run an analysis to see details</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MCPDebugPanel; 