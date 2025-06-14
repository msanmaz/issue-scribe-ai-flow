import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Zap, TrendingUp, FileText, Search, Users } from "lucide-react";
import type { BugDetectionResult } from "@/services/llmApi";

interface BugAnalysisProps {
  isBug: boolean;
  confidence: number;
  reasoning: string;
  detectedPatterns: string[];
  isAnalyzing?: boolean;
  bugDetectionResult?: BugDetectionResult;
}

const BugAnalysis = ({ 
  isBug, 
  confidence, 
  reasoning, 
  detectedPatterns, 
  isAnalyzing,
  bugDetectionResult
}: BugAnalysisProps) => {
  if (isAnalyzing) {
    return (
      <Card className="w-full animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-lg">AI Analysis in Progress</CardTitle>
          </div>
          <CardDescription>
            Our AI is analyzing the conversation for bug patterns...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={75} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Examining conversation patterns, error messages, and user behavior...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full animate-fade-in ${
      isBug ? 'border-orange-200 bg-orange-50/30' : 'border-green-200 bg-green-50/30'
    }`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBug ? (
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            <CardTitle className={`text-lg ${
              isBug ? 'text-orange-900' : 'text-green-900'
            }`}>
              {isBug ? 'Potential Bug Detected' : 'No Bug Detected'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <Badge variant={isBug ? "destructive" : "default"} className="font-semibold">
              {Math.round(confidence * 100)}% Confidence
            </Badge>
          </div>
        </div>
        <CardDescription className={
          isBug ? 'text-orange-700' : 'text-green-700'
        }>
          {isBug 
            ? 'AI analysis suggests this conversation contains a bug report'
            : 'AI analysis suggests this is not a bug report'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Confidence Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Analysis Confidence</span>
            <span className="text-muted-foreground">{Math.round(confidence * 100)}%</span>
          </div>
          <Progress 
            value={confidence * 100} 
            className={`w-full ${
              isBug ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'
            }`}
          />
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">AI Reasoning</h4>
          <div className="text-sm text-foreground bg-background/60 rounded-lg p-3 border">
            {reasoning}
          </div>
        </div>

        {/* AI Bug Detection Results - Only show if we have detailed results */}
        {isBug && bugDetectionResult && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Search className="w-5 h-5" />
                AI Bug Detection Results
              </h3>
              
              {/* Initial Analysis */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Initial Analysis:
                </h4>
                <div className="text-sm text-foreground bg-background/60 rounded-lg p-3 border">
                  {bugDetectionResult.initialAnalysis.description}
                </div>
              </div>

              {/* Key Indicators */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Indicators:</h4>
                <div className="text-sm text-foreground">
                  {bugDetectionResult.keyIndicators.join(', ')}
                </div>
              </div>

              {/* Agent Escalation */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Agent Escalation:
                </h4>
                <div className="text-sm text-foreground">
                  {bugDetectionResult.agentEscalation}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detected Patterns */}
        {detectedPatterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Detected Patterns</h4>
            <div className="flex flex-wrap gap-2">
              {detectedPatterns.map((pattern, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className={`text-xs ${
                    isBug 
                      ? 'border-orange-300 text-orange-700 bg-orange-50' 
                      : 'border-green-300 text-green-700 bg-green-50'
                  }`}
                >
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BugAnalysis;