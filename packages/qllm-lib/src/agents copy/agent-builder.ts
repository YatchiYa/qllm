import { LLMOptions, LLMProvider } from "../types";
import { AgentConfig, AgentTool, KnowledgeSource } from "./agent-types";
import { Agent } from "./base-agent";

export class AgentBuilder {
  private config: Partial<AgentConfig> = {};
  private provider?: LLMProvider;
  private tools: AgentTool[] = [];
  private knowledgeSources: KnowledgeSource[] = [];

  static create(init: { role: string; goal: string; backstory: string; }): AgentBuilder {
    const builder = new AgentBuilder();
    builder.config = { ...init };
    return builder;
  }

  withLLMOptions(options: LLMOptions): AgentBuilder {
    this.config.llmOptions = { 
      ...this.config.llmOptions, 
      ...options 
    };
    return this;
  }

  withTool(tool: AgentTool): AgentBuilder {
    if (!this.tools) {
      this.tools = [];
    }
    this.tools.push(tool);
    return this;
  }

  withTools(tools: AgentTool[]): AgentBuilder {
    if (!this.tools) {
      this.tools = [];
    }
    this.tools.push(...tools);
    return this;
  }

  withKnowledgeSource(source: KnowledgeSource): AgentBuilder {
    if (!this.knowledgeSources) {
      this.knowledgeSources = [];
    }
    this.knowledgeSources.push(source);
    return this;
  }

  withMemory(enabled: boolean): AgentBuilder {
    this.config.memory = enabled;
    return this;
  }

  withMaxIterations(iterations: number): AgentBuilder {
    this.config.maxIterations = iterations;
    return this;
  }

  withMaxExecutionTime(seconds: number): AgentBuilder {
    this.config.maxExecutionTime = seconds;
    return this;
  }

  withSystemPrompt(prompt: string): AgentBuilder {
    this.config.systemPrompt = prompt;
    return this;
  }

  withProvider(provider: LLMProvider): AgentBuilder {
    this.provider = provider;
    return this;
  }

  withVerbose(verbose: boolean): AgentBuilder {
    this.config.verbose = verbose;
    return this;
  }

  withAllowDelegation(allow: boolean): AgentBuilder {
    this.config.allowDelegation = allow;
    return this;
  }

  withCaching(enabled: boolean): AgentBuilder {
    this.config.cacheEnabled = enabled;
    return this;
  }

  build(): Agent {
    if (!this.provider) {
      throw new Error('Provider must be set before building the agent');
    }

    if (!this.config.llmOptions) {
      this.config.llmOptions = {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 1000
      };
    }

    const finalConfig: AgentConfig = {
      ...this.config,
      tools: this.tools,
      knowledgeSources: this.knowledgeSources,
      role: this.config.role!,
      goal: this.config.goal!,
      backstory: this.config.backstory!,
      llmOptions: this.config.llmOptions
    };

    return new Agent(finalConfig, this.provider);
  }
}