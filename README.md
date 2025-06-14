# Issue Scribe AI Flow

An AI-powered application that analyzes Intercom conversations to automatically detect bugs and create GitHub issues directly in your repository.

## Features

- **Intelligent Bug Detection**: Uses OpenAI's GPT-4 to analyze conversation patterns and detect legitimate bugs
- **Direct GitHub Integration**: Creates actual GitHub issues in your repository with proper formatting
- **Intercom Integration**: Fetches conversation data directly from Intercom's API
- **Enhanced Context**: Captures screenshots, reproduction steps, and technical details
- **Real-time Analysis**: Provides confidence scores and reasoning for bug detection

## Prerequisites

Before running this application, you'll need:

1. **Intercom Access Token**: API token from your Intercom workspace
2. **OpenAI API Key**: API key from OpenAI Platform
3. **GitHub Personal Access Token**: Token with repository access to create issues
4. **GitHub Repository**: Repository where issues will be created
5. **Node.js & npm**: [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Environment Setup

### 1. Clone the Repository

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

### 2. Create Environment File

Create a `.env` file in the project root:

```env
# Intercom API Configuration
VITE_INTERCOM_ACCESS_TOKEN=your_intercom_access_token_here

# OpenAI API Configuration
VITE_OPENAI_API_KEY=your_openai_api_key_here

# GitHub API Configuration
VITE_GITHUB_TOKEN=your_github_personal_access_token_here
VITE_GITHUB_OWNER=your_github_username_or_org
VITE_GITHUB_REPO=your_repository_name
```

### 3. Get Your API Keys

#### Intercom Access Token
1. Go to your Intercom workspace
2. Navigate to Settings > Developers > Developer Hub
3. Create or select your app
4. Go to Configure > Access Token
5. Copy the token and add it to your `.env` file

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy the key and add it to your `.env` file

#### GitHub Personal Access Token
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token (classic)"
3. Grant the **repo** scope (full repository access)
4. Copy the token and add it to your `.env` file

#### GitHub Repository Settings
1. Set `VITE_GITHUB_OWNER` to your GitHub username or organization name
2. Set `VITE_GITHUB_REPO` to the exact repository name where you want issues created

### 4. Start the Development Server

```sh
npm run dev
```

The application will start at `http://localhost:8080`

## Usage

1. **Input Conversation URL**: Paste an Intercom conversation URL
2. **Automatic Analysis**: The AI analyzes the conversation for bug indicators
3. **Bug Detection**: Get confidence scores and reasoning for bug classification
4. **Issue Creation**: If a bug is detected, fill out the GitHub issue template
5. **Direct GitHub Integration**: Click "Create GitHub Issue" to create the actual issue in your repository

## Workflow

1. **Analysis Phase**: AI determines if the conversation contains a legitimate bug
2. **Template Phase**: If it's a bug, you can edit the issue template with additional details
3. **Creation Phase**: The application creates a real GitHub issue in your repository
4. **Success**: You get a direct link to the created issue with issue number and details

## API Integration

The application integrates with:

- **Intercom API**: Fetches conversation data, messages, and metadata
- **OpenAI API**: Performs AI analysis for bug detection
- **GitHub API**: Creates actual issues in your GitHub repository

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: TanStack React Query
- **Build Tool**: Vite
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # React Query hooks
├── services/           # API services (Intercom, OpenAI, GitHub)
├── types/              # TypeScript type definitions
└── pages/              # Application pages
```

## Development

### Local Development

```sh
npm run dev
```

### Build for Production

```sh
npm run build
```

### Type Checking

```sh
npm run type-check
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: The development server includes a proxy for Intercom API
2. **Invalid API Keys**: Check your environment variables and API key format
3. **Rate Limits**: Both APIs have rate limits - wait before retrying
4. **GitHub Permissions**: Ensure your token has the "repo" scope for the target repository

### Environment Variables

If you see a configuration error screen, ensure:
- Your `.env` file is in the project root
- All required environment variables are set
- You've restarted the development server after adding variables
- Your GitHub token has the correct permissions

### GitHub Issues

- Verify your repository exists and is accessible
- Check that your GitHub token has the "repo" scope
- Ensure the repository name and owner are spelled correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is built with [Lovable](https://lovable.dev) and uses modern web technologies.

---

## Lovable Project Info

**URL**: https://lovable.dev/projects/b5a95c61-07ce-4e57-b4c5-33288cbc7a99

### Editing Options

- **Use Lovable**: Visit the project URL and start prompting
- **Local Development**: Clone and edit locally
- **GitHub**: Edit files directly in the repository
- **Codespaces**: Use GitHub Codespaces for cloud development

### Deployment

Open [Lovable](https://lovable.dev/projects/b5a95c61-07ce-4e57-b4c5-33288cbc7a99) and click Share → Publish.
