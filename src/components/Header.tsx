import { Bug, Github } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Bug className="w-4 h-4 text-primary-foreground" />
            </div>
            <Github className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Intercom → GitHub Issue Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered bug detection and GitHub issue creation
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;