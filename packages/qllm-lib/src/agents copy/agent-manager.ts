import { LLMProvider } from '../types';
import { Agent } from './base-agent';
import { AgentConfig, AgentTool, KnowledgeSource } from './agent-types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private tools: Map<string, AgentTool> = new Map();
  private knowledgeSources: Map<string, KnowledgeSource> = new Map();

  constructor(
    private provider: LLMProvider,
    private templatesPath?: string
  ) {
    this.templatesPath = templatesPath || path.join(__dirname, 'templates');
  }

  async *streamChat(name: string, message: string): AsyncGenerator<string> {
    const agent = this.getAgent(name);
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }

    for await (const chunk of agent.streamChat(message)) {
      yield chunk;
    }
  }

  async chat(name: string, message: string): Promise<string> {
    const agent = this.getAgent(name);
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }
    return agent.chat(message);
  }

  async createAgent(name: string, config: AgentConfig): Promise<Agent> {
    if (this.agents.has(name)) {
      throw new Error(`Agent ${name} already exists`);
    }

    const agent = new Agent(config, this.provider);
    this.agents.set(name, agent);
    return agent;
  }

  async loadTemplate(templateName: string): Promise<AgentConfig> {
    const templatePath = path.join(this.templatesPath!, `${templateName}.yaml`);
    const content = await fs.readFile(templatePath, 'utf-8');
    const template = yaml.load(content) as any;

    return {
      role: template.name,
      goal: template.description,
      backstory: template.description,
      llmOptions: {
        ...template.model.parameters,
        model: template.model.name,
        systemMessage: template.system_prompt
      },
      tools: this.getToolsFromTemplate(template.tools),
      knowledgeSources: this.getKnowledgeSourcesFromTemplate(template.knowledge_sources),
      memory: template.memory?.enabled ?? false,
      maxIterations: template.execution?.max_iterations,
      maxExecutionTime: template.execution?.max_time,
      allowDelegation: template.features?.delegation ?? false,
      verbose: template.features?.verbose ?? false,
      cacheEnabled: template.features?.caching ?? false
    };
  }

  private getToolsFromTemplate(toolsConfig: any[] = []): AgentTool[] {
    return toolsConfig.map(tool => {
      const existingTool = this.tools.get(tool.name);
      if (existingTool) {
        return {
          ...existingTool,
          ...tool
        };
      }
      return tool;
    });
  }

  private getKnowledgeSourcesFromTemplate(sourcesConfig: any[] = []): KnowledgeSource[] {
    return sourcesConfig.map(source => {
      const existingSource = this.knowledgeSources.get(source.name);
      if (existingSource) {
        return {
          ...existingSource,
          ...source
        };
      }
      return source;
    });
  }

  async createFromTemplate(
    name: string, 
    templateName: string, 
    overrides: Partial<AgentConfig> = {}
  ): Promise<Agent> {
    const template = await this.loadTemplate(templateName);
    const config = { ...template, ...overrides };
    return this.createAgent(name, config);
  }

  async registerTool(tool: AgentTool): Promise<void> {
    this.tools.set(tool.name, tool);
    
    // Add tool to all existing agents that might need it
    for (const agent of this.agents.values()) {
      await agent.addTool(tool);
    }
  }

  async registerKnowledgeSource(source: KnowledgeSource): Promise<void> {
    this.knowledgeSources.set(source.type, source);
  }

  async removeAgent(name: string): Promise<boolean> {
    return this.agents.delete(name);
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getKnowledgeSource(type: string): KnowledgeSource | undefined {
    return this.knowledgeSources.get(type);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  listKnowledgeSources(): string[] {
    return Array.from(this.knowledgeSources.keys());
  }
}