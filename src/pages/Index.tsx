import { useState } from "react";
import Header from "@/components/Header";
import ConversationInput from "@/components/ConversationInput";
import ConversationSummary from "@/components/ConversationSummary";
import BugAnalysis from "@/components/BugAnalysis";
import IssueTemplate from "@/components/IssueTemplate";
import { useToast } from "@/hooks/use-toast";

type WorkflowStep = 'input' | 'summary' | 'analysis' | 'template' | 'complete';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationData, setConversationData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const { toast } = useToast();

  // Mock data for demo purposes
  const mockConversationData = {
    title: "Unable to send messages in chat widget",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.johnson@techcorp.com",
      company: "TechCorp Solutions"
    },
    priority: "high" as const,
    status: "open" as const,
    createdAt: "2024-01-15T10:30:00Z",
    messages: [
      {
        id: "1",
        author: "Sarah Johnson",
        role: "customer" as const,
        content: "Hi, I'm having trouble with the chat widget on our website. When users try to send messages, nothing happens. The send button appears to be non-functional.",
        timestamp: "2024-01-15T10:30:00Z"
      },
      {
        id: "2",
        author: "Mike (Support)",
        role: "admin" as const,
        content: "Hi Sarah! Thanks for reaching out. Can you tell me which browser you're using and if you see any error messages in the console?",
        timestamp: "2024-01-15T10:35:00Z"
      },
      {
        id: "3",
        author: "Sarah Johnson",
        role: "customer" as const,
        content: "I'm using Chrome 120.0.6099.129. In the console, I see this error: 'TypeError: Cannot read property 'send' of undefined at ChatWidget.js:245'. This happens every time someone tries to send a message.",
        timestamp: "2024-01-15T10:42:00Z"
      },
      {
        id: "4",
        author: "Mike (Support)",
        role: "admin" as const,
        content: "That error message is very helpful! It looks like there's a JavaScript error in the chat widget. Let me escalate this to our engineering team as this appears to be a bug in our code.",
        timestamp: "2024-01-15T10:45:00Z"
      }
    ]
  };

  const mockAnalysisData = {
    isBug: true,
    confidence: 92,
    reasoning: "The conversation contains clear indicators of a software bug: a specific JavaScript error message ('TypeError: Cannot read property 'send' of undefined'), consistent reproducible behavior (send button not working), and affects core functionality (message sending). The error points to a specific line in the code (ChatWidget.js:245), which is a strong technical indicator.",
    detectedPatterns: [
      "JavaScript Error",
      "Reproducible Issue",
      "Core Functionality Affected",
      "Technical Error Message",
      "Browser Console Error"
    ]
  };

  const mockTemplateData = {
    title: "Chat widget send button not working - TypeError in ChatWidget.js",
    description: "Users are unable to send messages through the chat widget due to a JavaScript error. The send button appears non-functional and generates a TypeError in the browser console.",
    reproductionSteps: [
      "Navigate to website with chat widget",
      "Open chat widget",
      "Type a message in the input field",
      "Click the send button",
      "Observe that message is not sent",
      "Check browser console for errors"
    ],
    expectedBehavior: "Message should be sent successfully when user clicks the send button",
    actualBehavior: "Send button does not work and TypeError is thrown in console",
    appId: "abc123",
    environment: "Production",
    browserInfo: "Chrome 120.0.6099.129"
  };

  const handleAnalyzeConversation = async (url: string) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setConversationData(mockConversationData);
      setCurrentStep('summary');
      setIsLoading(false);
      
      // Auto-progress to analysis after showing summary
      setTimeout(() => {
        handleAnalyzeBug();
      }, 2000);
    }, 2000);
  };

  const handleAnalyzeBug = async () => {
    setCurrentStep('analysis');
    
    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisData(mockAnalysisData);
      
      // Auto-progress to template if it's a bug
      if (mockAnalysisData.isBug) {
        setTimeout(() => {
          setCurrentStep('template');
        }, 3000);
      }
    }, 1500);
  };

  const handleGenerateIssue = (templateData: any) => {
    toast({
      title: "GitHub Issue Generated!",
      description: "Your issue template is ready to be created in GitHub.",
    });
    setCurrentStep('complete');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Step 1: Input */}
          {currentStep === 'input' && (
            <ConversationInput
              onAnalyze={handleAnalyzeConversation}
              isLoading={isLoading}
            />
          )}

          {/* Step 2: Summary */}
          {(currentStep === 'summary' || currentStep === 'analysis' || currentStep === 'template') && conversationData && (
            <ConversationSummary {...conversationData} />
          )}

          {/* Step 3: Analysis */}
          {currentStep === 'analysis' && (
            <BugAnalysis
              isAnalyzing={!analysisData}
              isBug={analysisData?.isBug || false}
              confidence={analysisData?.confidence || 0}
              reasoning={analysisData?.reasoning || ''}
              detectedPatterns={analysisData?.detectedPatterns || []}
            />
          )}

          {/* Step 4: Template */}
          {currentStep === 'template' && analysisData?.isBug && (
            <IssueTemplate
              initialTemplate={mockTemplateData}
              onGenerate={handleGenerateIssue}
            />
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-12 animate-fade-in">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Issue Template Generated!</h2>
              <p className="text-muted-foreground mb-6">
                Your GitHub issue template has been created and copied to your clipboard.
              </p>
              <button
                onClick={() => {
                  setCurrentStep('input');
                  setConversationData(null);
                  setAnalysisData(null);
                }}
                className="text-primary hover:underline"
              >
                Analyze Another Conversation
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
