import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, FileText, Upload, X, Search, Users, Brain, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BugDetectionResult } from "@/services/llmApi";
import type { EnhancedIssueContext } from "@/types/conversation";

interface IssueTemplateProps {
  initialTemplate: {
    description: string;
    appId: string;
    errorMessage: string;
    affectedScope: string;
    timeline: string;
    device: string;
    browser: string;
    operatingSystem: string;
    screenshotUrls: string[];
    videoUrl: string;
    userLink: string;
    conversationLink: string;
    affectedPageLink: string;
    reproductionSteps: string[];
    website: string;
    loginCredentials: string;
  };
  onGenerate: (issueData: { title: string; body: string; labels: string[] }) => void;
  onEnhancedSubmit?: (context: EnhancedIssueContext) => void;
  bugDetectionResult?: BugDetectionResult;
  mcpEnabled?: boolean;
}

const IssueTemplate = ({ 
  initialTemplate, 
  onGenerate, 
  onEnhancedSubmit,
  bugDetectionResult,
  mcpEnabled = false 
}: IssueTemplateProps) => {
  const [template, setTemplate] = useState(initialTemplate);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Enhanced context for MCP
  const [enhancedContext, setEnhancedContext] = useState<EnhancedIssueContext>({
    screenshots: [],
    additionalSteps: '',
    technicalDetails: '',
    errorMessages: '',
    browserInfo: '',
    appId: '',
    customerImpact: 'medium'
  });
  
  const { toast } = useToast();

  const generateMarkdown = () => {
    return `## Description of the issue
${template.description}

## Issue details

**APP ID:**
${template.appId}

**1. What is the error message?** Please write the full error message received by the customer. If there is no error message, write 'N/A'

${template.errorMessage}

**2. Is the issue affecting all teammates or just the customer who reported the issue?**

${template.affectedScope}

**3. When did the issue first occur? Is it happening every time or intermittently? Have they experienced this before, or is this the first time?** Please include timestamp when possible.

${template.timeline}

**4. What device was the customer was using when they received the error?**
e.g. desktop, phone, tablet

${template.device}

**5. Which browser (and version) or app version were they using?**

${template.browser}

**6. What operating system and version were they on?**

${template.operatingSystem}

## Evidence
**Screenshots URLs** (Please use Droplr. to get the screenshots URLs):
${template.screenshotUrls.length > 0 ? template.screenshotUrls.join('\n') : 'No screenshots provided in conversation'}

**[Optional] Replication steps video URL** (Please add a video showing the issue and make sure your video includes audio): 
${template.videoUrl || 'N/A'}

## Links
Please add any relevant links to support this investigation.

Link to the user affected:
${template.userLink}

Link to the affected conversation:
${template.conversationLink}

Link to the affected page in Intercom:
${template.affectedPageLink}

## Steps to reproduce
Make sure to try and reproduce all issues in the region matching that of the impacted customer. As well as the reproduction video, please also describe the steps taken to reproduce the issue.
If you can't reproduce the issue yourself, please note reproduction steps that the customer is doing in order to reproduce the issue.

${template.reproductionSteps.map((step, index) => `**${index + 1}.** ${step}`).join('\n')}

If the issue is happening on the customer's website, please provide:

**1. Website:**
${template.website}

**2. Login credentials:**
${template.loginCredentials}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopied(true);
      toast({
        title: "Copied!",
        description: "GitHub issue template copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the markdown manually",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setScreenshots(prev => [...prev, ...files]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const updateReproductionStep = (index: number, value: string) => {
    const newSteps = [...template.reproductionSteps];
    newSteps[index] = value;
    setTemplate(prev => ({ ...prev, reproductionSteps: newSteps }));
  };

  const addReproductionStep = () => {
    setTemplate(prev => ({ 
      ...prev, 
      reproductionSteps: [...prev.reproductionSteps, ''] 
    }));
  };

  const removeReproductionStep = (index: number) => {
    setTemplate(prev => ({ 
      ...prev, 
      reproductionSteps: prev.reproductionSteps.filter((_, i) => i !== index)
    }));
  };

  const handleEnhancedSubmit = () => {
    if (!onEnhancedSubmit) return;
    
    // Update enhanced context with current template data
    const updatedContext: EnhancedIssueContext = {
      ...enhancedContext,
      appId: template.appId,
      errorMessages: template.errorMessage,
      browserInfo: `${template.browser} on ${template.operatingSystem}`,
      additionalSteps: template.reproductionSteps.join('\n'),
      technicalDetails: `Device: ${template.device}\nBrowser: ${template.browser}\nOS: ${template.operatingSystem}`,
    };
    
    onEnhancedSubmit(updatedContext);
  };

  const handleDirectCreate = () => {
    const issueTitle = bugDetectionResult?.initialAnalysis.title || 
                      template.description.split('\n')[0].substring(0, 100) || 
                      'Issue from Intercom conversation';
    const labels = ['intercom', 'bug', 'customer-support'];
    if (bugDetectionResult?.severity) {
      labels.push(`severity-${bugDetectionResult.severity}`);
    }
    onGenerate({ 
      title: issueTitle, 
      body: generateMarkdown(), 
      labels 
    });
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          GitHub Issue Template
        </CardTitle>
        <CardDescription>
          Review and enhance the generated issue template before creating the GitHub issue
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit Template</TabsTrigger>
            <TabsTrigger value="preview">Preview Markdown</TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="space-y-6 mt-6">
            {/* Description of the issue */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description of the issue*</Label>
              <Textarea
                id="description"
                value={template.description}
                onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A concise description of what the problem is. What was the customer trying to achieve, and what actually occurred?"
                rows={4}
                className="resize-none"
                required
              />
            </div>

            {/* Issue Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Issue Details</h3>
              
              {/* App ID */}
              <div className="space-y-2">
                <Label htmlFor="appId" className="text-sm font-medium">APP ID*</Label>
                <Input
                  id="appId"
                  value={template.appId}
                  onChange={(e) => {
                    setTemplate(prev => ({ ...prev, appId: e.target.value }));
                    setEnhancedContext(prev => ({ ...prev, appId: e.target.value }));
                  }}
                  placeholder="Please provide the App ID (numbers), not the code"
                  required
                />
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <Label htmlFor="errorMessage" className="text-sm font-medium">1. What is the error message?*</Label>
                <Textarea
                  id="errorMessage"
                  value={template.errorMessage}
                  onChange={(e) => {
                    setTemplate(prev => ({ ...prev, errorMessage: e.target.value }));
                    setEnhancedContext(prev => ({ ...prev, errorMessages: e.target.value }));
                  }}
                  placeholder="Please write the full error message received by the customer. If there is no error message, write 'N/A'"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Affected Scope */}
              <div className="space-y-2">
                <Label htmlFor="affectedScope" className="text-sm font-medium">2. Is the issue affecting all teammates or just the customer who reported the issue?</Label>
                <Input
                  id="affectedScope"
                  value={template.affectedScope}
                  onChange={(e) => setTemplate(prev => ({ ...prev, affectedScope: e.target.value }))}
                  placeholder="e.g., Customer-specific, All teammates, Specific team members"
                />
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label htmlFor="timeline" className="text-sm font-medium">3. When did the issue first occur?</Label>
                <Textarea
                  id="timeline"
                  value={template.timeline}
                  onChange={(e) => setTemplate(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="Is it happening every time or intermittently? Have they experienced this before, or is this the first time? Please include timestamp when possible."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Device */}
              <div className="space-y-2">
                <Label htmlFor="device" className="text-sm font-medium">4. What device was the customer using?</Label>
                <Input
                  id="device"
                  value={template.device}
                  onChange={(e) => setTemplate(prev => ({ ...prev, device: e.target.value }))}
                  placeholder="e.g. desktop, phone, tablet"
                />
              </div>

              {/* Browser */}
              <div className="space-y-2">
                <Label htmlFor="browser" className="text-sm font-medium">5. Which browser (and version) or app version were they using?</Label>
                <Input
                  id="browser"
                  value={template.browser}
                  onChange={(e) => {
                    setTemplate(prev => ({ ...prev, browser: e.target.value }));
                    setEnhancedContext(prev => ({ ...prev, browserInfo: `${e.target.value} on ${template.operatingSystem}` }));
                  }}
                  placeholder="e.g., Chrome 120.0.6099.129, Safari 17.1"
                />
              </div>

              {/* Operating System */}
              <div className="space-y-2">
                <Label htmlFor="operatingSystem" className="text-sm font-medium">6. What operating system and version were they on?</Label>
                <Input
                  id="operatingSystem"
                  value={template.operatingSystem}
                  onChange={(e) => {
                    setTemplate(prev => ({ ...prev, operatingSystem: e.target.value }));
                    setEnhancedContext(prev => ({ ...prev, browserInfo: `${template.browser} on ${e.target.value}` }));
                  }}
                  placeholder="e.g., macOS 14.1, Windows 11, iOS 17.1"
                />
              </div>
            </div>

            {/* Enhanced Context for MCP */}
            {mcpEnabled && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">AI Duplicate Detection Context</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-blue-800">Customer Impact</Label>
                    <select
                      value={enhancedContext.customerImpact}
                      onChange={(e) => setEnhancedContext(prev => ({ 
                        ...prev, 
                        customerImpact: e.target.value as 'low' | 'medium' | 'high' 
                      }))}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded"
                    >
                      <option value="low">Low Impact</option>
                      <option value="medium">Medium Impact</option>
                      <option value="high">High Impact</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-blue-800">Additional Technical Details</Label>
                    <Textarea
                      value={enhancedContext.technicalDetails}
                      onChange={(e) => setEnhancedContext(prev => ({ ...prev, technicalDetails: e.target.value }))}
                      placeholder="Any additional technical context for better duplicate detection..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Evidence */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Evidence</h3>
              
              {/* Screenshot URLs */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Screenshots URLs (Please use Droplr. to get the screenshots URLs)</Label>
                <Textarea
                  value={template.screenshotUrls.join('\n')}
                  onChange={(e) => setTemplate(prev => ({ ...prev, screenshotUrls: e.target.value.split('\n').filter(url => url.trim()) }))}
                  placeholder="Enter screenshot URLs, one per line"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="text-sm font-medium">[Optional] Replication steps video URL</Label>
                <Input
                  id="videoUrl"
                  value={template.videoUrl}
                  onChange={(e) => setTemplate(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="Please add a video showing the issue and make sure your video includes audio"
                />
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Links</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userLink" className="text-sm font-medium">Link to the user affected</Label>
                  <Input
                    id="userLink"
                    value={template.userLink}
                    onChange={(e) => setTemplate(prev => ({ ...prev, userLink: e.target.value }))}
                    placeholder="Intercom user profile URL"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="conversationLink" className="text-sm font-medium">Link to the affected conversation</Label>
                  <Input
                    id="conversationLink"
                    value={template.conversationLink}
                    onChange={(e) => setTemplate(prev => ({ ...prev, conversationLink: e.target.value }))}
                    placeholder="Intercom conversation URL"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="affectedPageLink" className="text-sm font-medium">Link to the affected page in Intercom</Label>
                  <Input
                    id="affectedPageLink"
                    value={template.affectedPageLink}
                    onChange={(e) => setTemplate(prev => ({ ...prev, affectedPageLink: e.target.value }))}
                    placeholder="Intercom page URL"
                  />
                </div>
              </div>
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Steps to Reproduce</h3>
              <p className="text-sm text-muted-foreground">
                Make sure to try and reproduce all issues in the region matching that of the impacted customer. 
                As well as the reproduction video, please also describe the steps taken to reproduce the issue.
              </p>
              
              <div className="space-y-2">
                {template.reproductionSteps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-sm text-muted-foreground mt-2 min-w-8">{index + 1}.</span>
                    <Textarea
                      value={step}
                      onChange={(e) => updateReproductionStep(index, e.target.value)}
                      placeholder="Describe this step"
                      rows={2}
                      className="flex-1 resize-none"
                    />
                    {template.reproductionSteps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReproductionStep(index)}
                        className="mt-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReproductionStep}
                >
                  Add Step
                </Button>
              </div>
            </div>

            {/* Website and Credentials */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">If the issue is happening on the customer's website, please provide:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium">1. Website</Label>
                  <Input
                    id="website"
                    value={template.website}
                    onChange={(e) => setTemplate(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="Customer's website URL"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginCredentials" className="text-sm font-medium">2. Login credentials</Label>
                  <Input
                    id="loginCredentials"
                    value={template.loginCredentials}
                    onChange={(e) => setTemplate(prev => ({ ...prev, loginCredentials: e.target.value }))}
                    placeholder="Login details if needed"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Generated Markdown</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border max-h-96 overflow-y-auto">
                {generateMarkdown()}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          {mcpEnabled && onEnhancedSubmit ? (
            <>
              <Button
                variant="outline"
                onClick={handleDirectCreate}
                disabled={!template.description.trim() || !template.appId.trim()}
              >
                Skip AI Analysis
              </Button>
              <Button 
                onClick={handleEnhancedSubmit}
                className="px-6 bg-blue-600 hover:bg-blue-700"
                disabled={!template.description.trim() || !template.appId.trim()}
              >
                <Brain className="w-4 h-4 mr-2" />
                Analyze for Duplicates
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleDirectCreate}
              className="px-6"
              disabled={!template.description.trim() || !template.appId.trim()}
            >
              Create GitHub Issue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueTemplate;