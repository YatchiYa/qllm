import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { Agent } from './base-agent';
import { LLMProvider } from '../types';
import { AgentConfig, AgentTool, KnowledgeSource } from './agent-types';

export class AgentLoader {
  async loadFromYaml(path: string, provider: LLMProvider): Promise<Agent> {
    const content = await readFile(path, 'utf-8');
    const config = load(content) as any;
    
    const agentConfig: AgentConfig = {
      role: config.name,
      goal: config.description,
      backstory: config.description,
      tools: this.loadTools(config.tools),
      knowledgeSources: this.loadKnowledgeSources(config.knowledge_sources),
      llmOptions: {
        ...config.model.parameters,
        model: config.model.name,
        systemMessage: this.processSystemPrompt(
          config.system_prompt,
          config.role,
          config.goal,
          config.backstory
        ),
        streaming: config.model.parameters?.streaming ?? true
      },
      memory: config.memory?.enabled ?? false,
      maxIterations: config.execution?.max_iterations,
      maxExecutionTime: config.execution?.max_time,
      allowDelegation: config.features?.delegation ?? false,
      verbose: config.features?.verbose ?? false,
      cacheEnabled: config.features?.caching ?? false
    };

    return new Agent(agentConfig, provider);
  }

  private loadTools(toolsConfig: any[]): AgentTool[] {
    if (!toolsConfig) return [];

    return toolsConfig.map(tool => ({
      name: tool.name,
      description: tool.description,
      execute: this.loadToolExecutor(tool),
      parameters: tool.parameters,
      cacheEnabled: tool.cache_enabled
    }));
  }

  private loadToolExecutor(tool: any): (inputs: Record<string, any>) => Promise<any> {
    // Default implementation - can be extended based on tool type
    return async (inputs: Record<string, any>) => {
      if (tool.implementation) {
        return tool.implementation(inputs);
      }
      throw new Error(`No implementation found for tool: ${tool.name}`);
    };
  }

  private loadKnowledgeSources(sourcesConfig: any[]): KnowledgeSource[] {
    if (!sourcesConfig) return [];

    return sourcesConfig.map(source => ({
      type: source.type,
      config: source.config,
      handler: this.createKnowledgeHandler(source)
    }));
  }

  private createKnowledgeHandler(source: any): any {
    // Implementation would depend on the knowledge source type
    return {
      search: async (query: string) => [],
      add: async (documents: string[]) => {},
      delete: async (documentIds: string[]) => {},
      update: async (documentId: string, content: string) => {}
    };
  }

  private processSystemPrompt(
    template: string,
    role: string,
    goal: string,
    backstory: string
  ): string {
    if (!template) {
      return this.getDefaultSystemPrompt(role, goal, backstory);
    }

    return template
      .replace('{role}', role)
      .replace('{goal}', goal)
      .replace('{backstory}', backstory);
  }

  private getDefaultSystemPrompt(
    role: string,
    goal: string,
    backstory: string
  ): string {
    return `
Role: ${role}
Goal: ${goal}
Backstory: ${backstory}

Instructions:
1. Maintain focus on your assigned role and goal
2. Use available tools when appropriate
3. Provide clear and structured responses
4. Maintain conversation context
`.trim();
  }
}