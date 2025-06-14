import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Key, Settings } from "lucide-react";

interface EnvironmentSetupProps {
  missingVars: string[];
}

const EnvironmentSetup = ({ missingVars }: EnvironmentSetupProps) => {
  const envVarDetails = {
    'VITE_INTERCOM_ACCESS_TOKEN': {
      name: 'Intercom Access Token',
      description: 'Your Intercom API access token for fetching conversation data',
      howToGet: 'Go to Intercom Settings > Developers > Developer Hub > Your App > Configure > Access Token',
      example: 'dG9rZW46YWJjZGVmZ2hpamtsbW5vcA==',
    },
    'VITE_OPENAI_API_KEY': {
      name: 'OpenAI API Key',
      description: 'Your OpenAI API key for AI-powered conversation analysis',
      howToGet: 'Visit OpenAI Platform > API Keys > Create new secret key',
      example: 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
    },
    'VITE_GITHUB_TOKEN': {
      name: 'GitHub Personal Access Token',
      description: 'GitHub token with repository access to create issues',
      howToGet: 'Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token (classic). Grant "repo" scope.',
      example: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    },
    'VITE_GITHUB_OWNER': {
      name: 'GitHub Repository Owner',
      description: 'GitHub username or organization that owns the repository',
      howToGet: 'Use your GitHub username or organization name',
      example: 'your-username',
    },
    'VITE_GITHUB_REPO': {
      name: 'GitHub Repository Name',
      description: 'Name of the repository where issues will be created',
      howToGet: 'Use the exact repository name (case-sensitive)',
      example: 'my-repository',
    },
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-orange-900">Environment Configuration Required</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            Please configure the following environment variables to use this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingVars.map((varName) => {
            const details = envVarDetails[varName as keyof typeof envVarDetails];
            if (!details) return null;

            return (
              <Card key={varName} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-orange-600" />
                      <CardTitle className="text-base">{details.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      {varName}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {details.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <h5 className="text-sm font-medium mb-1">How to get it:</h5>
                    <p className="text-sm text-muted-foreground">{details.howToGet}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Example format:</h5>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                      {details.example}
                    </code>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-blue-900">Setup Instructions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Step 1: Create a .env file</h4>
            <p className="text-sm text-muted-foreground">
              Create a <code className="bg-muted px-1 rounded">.env</code> file in your project root directory.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Step 2: Add your environment variables</h4>
            <div className="bg-muted/50 p-3 rounded-md border">
              <pre className="text-xs text-muted-foreground">
{`# Add these to your .env file:
${missingVars.map(varName => `${varName}=your_${varName.toLowerCase().replace('vite_', '').replace(/_/g, '_')}_here`).join('\n')}`}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Step 3: Restart the application</h4>
            <p className="text-sm text-muted-foreground">
              After adding your environment variables, restart your development server.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Need help? Check the README.md file for detailed setup instructions.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnvironmentSetup; 