#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 Setting up Vercel API Proxy...\n');

// Environment file templates
const envDevelopment = `# Development envir22onment - uses local Vite proxy
VITE_API_BASE_URL=/api s

# Add your development API keys here
# VITE_DEV_API_KEY=your_development_api_key
`;

const envProduction = `# Production environment - uses Vercel serverless functions
VITE_API_BASE_URL=https://issue-scribe-ai-flow.vercel.app/api/proxy

# Add your production API keys here
# VITE_PROD_API_KEY=your_production_api_key
`;

const envLocal = `# Local environment variables (not tracked by git)
# Copy values from .env.development or create your own

VITE_API_BASE_URL=/api

# Your local API keys
# VITE_API_KEY=your_local_api_key
# VITE_EXTERNAL_API_URL=https://api.intercom.io
`;

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Create environment files if they don't exist
const createEnvFile = (filename, content) => {
  const filepath = path.join(projectRoot, filename);
  
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content);
    console.log(`✅ Created ${filename}`);
  } else {
    console.log(`⚠️  ${filename} already exists - skipping`);
  }
};

// Setup function
const setup = () => {
  try {
    // Create environment files
    createEnvFile('.env.development', envDevelopment);
    createEnvFile('.env.production', envProduction);
    createEnvFile('.env.local', envLocal);
    
    // Create docs directory if it doesn't exist
    const docsDir = path.join(projectRoot, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir);
      console.log('✅ Created docs/ directory');
    }
    
    // Create scripts directory if it doesn't exist
    const scriptsDir = path.join(projectRoot, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir);
      console.log('✅ Created scripts/ directory');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update your environment files with actual API URLs and keys');
    console.log('2. Customize the api/proxy.js function for your specific needs');
    console.log('3. Update vercel.json rewrites if you need direct API routing');
    console.log('4. Test locally with: npm run dev');
    console.log('5. Deploy to Vercel: vercel --prod');
    console.log('\n📚 See docs/API_PROXY_SETUP.md for detailed documentation');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
};

// Run setup
setup(); 