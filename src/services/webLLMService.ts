import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import type { MCPTool } from '../types/mcp';

export class WebLLMService {
  private engine: MLCEngine | null = null;
  private isInitialized = false;

  async initialize(onProgress?: (info: any) => void): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.engine = await CreateMLCEngine(
        "Llama-3.2-3B-Instruct-q4f32_1",
        { 
          initProgressCallback: onProgress || ((info) => console.log('WebLLM loading:', info))
        }
      );
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WebLLM:', error);
      throw new Error('Local AI model failed to load. Please check your internet connection and try again.');
    }
  }

  async analyzeWithTools(
    systemPrompt: string,
    userPrompt: string,
    tools: Map<string, MCPTool>
  ): Promise<any[]> {
    if (!this.engine) {
      throw new Error('WebLLM not initialized');
    }

    // For WebLLM, we'll do a simpler approach since it doesn't support function calling yet
    const combinedPrompt = `${systemPrompt}

${userPrompt}

Please analyze this and provide a JSON response with similar issues. Format:
{
  "analyzed_issues": [
    {
      "similarity_score": 0.8,
      "relationship_type": "duplicate",
      "reasoning": "explanation",
      "suggested_action": "reference"
    }
  ]
}`;

    const response = await this.engine.chat.completions.create({
      messages: [{ role: "user", content: combinedPrompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    try {
      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return parsed.analyzed_issues || [];
    } catch (error) {
      console.error('Failed to parse WebLLM response:', error);
      return [];
    }
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
} 