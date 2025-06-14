import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";

interface ConversationInputProps {
  onAnalyze: (url: string) => void;
  isLoading?: boolean;
}

const ConversationInput = ({ onAnalyze, isLoading }: ConversationInputProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError("Please enter an Intercom conversation URL");
      return;
    }
    
    if (!url.includes("intercom.io") && !url.includes("intercom.com")) {
      setError("Please enter a valid Intercom conversation URL");
      return;
    }

    setError("");
    onAnalyze(url.trim());
  };

  return (
    <Card className="w-full max-w-2xl mx-auto animate-fade-in">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Start with a Conversation</CardTitle>
        <CardDescription className="text-base">
          Paste your Intercom conversation URL to begin AI-powered bug analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conversation-url" className="text-sm font-medium">
              Intercom Conversation URL
            </Label>
            <Input
              id="conversation-url"
              type="url"
              placeholder="https://app.intercom.io/a/apps/abc123/inbox/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-destructive animate-fade-in">{error}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-11 text-base font-medium"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Conversation...
              </>
            ) : (
              "Analyze Conversation"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConversationInput;