import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, Mail, Building } from "lucide-react";

interface Message {
  id: string;
  author: string;
  role: 'customer' | 'admin';
  content: string;
  timestamp: string;
}

interface ConversationSummaryProps {
  title: string;
  customer: {
    name: string;
    email: string;
    company?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'closed' | 'pending';
  messages: Message[];
  createdAt: string;
}

const ConversationSummary = ({
  title,
  customer,
  priority,
  status,
  messages,
  createdAt
}: ConversationSummaryProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500 text-white';
      case 'pending': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl leading-tight">{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getPriorityColor(priority)} variant="secondary">
                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
              </Badge>
              <Badge className={getStatusColor(status)} variant="secondary">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{customer.name}</p>
              <p className="text-xs text-muted-foreground">Customer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{customer.email}</p>
              <p className="text-xs text-muted-foreground">Email</p>
            </div>
          </div>
          {customer.company && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{customer.company}</p>
                <p className="text-xs text-muted-foreground">Company</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Messages */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Conversation Thread ({messages.length} messages)
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={
                    message.role === 'customer' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }>
                    {message.author.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{message.author}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        message.role === 'customer' 
                          ? 'border-blue-200 text-blue-600' 
                          : 'border-green-200 text-green-600'
                      }`}
                    >
                      {message.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationSummary;