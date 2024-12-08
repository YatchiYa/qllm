import { ChatMessage, ChatCompletionParams, ChatCompletionResponse, Tool, ToolCall } from '../types/llm-types';
import { LLMProvider } from '../types';
import { AgentConfig, AgentContext, AgentTool } from './agent-types';

export class Agent {
  protected context: AgentContext;
  private maxIterations: number;
  private maxExecutionTime: number;

  constructor(
    protected config: AgentConfig,
    protected provider: LLMProvider
  ) {
    this.context = {
      messages: [],
      memory: new Map(),
      tools: new Map()
    };
    this.maxIterations = config.maxIterations || 20;
    this.maxExecutionTime = config.maxExecutionTime || 300;
    
    if (config.tools) {
      config.tools.forEach(tool => {
        this.context.tools.set(tool.name, tool);
      });
    }
  }

  async executeTool(toolName: string, inputs: Record<string, any>): Promise<any> {
    const tool = this.context.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return tool.execute(inputs);
  }

  private extractResponseText(response: ChatCompletionResponse): string {
    if (response.text) {
      return response.text;
    }
    if (response.refusal) {
      return `Refusal: ${response.refusal}`;
    }
    return 'No response generated';
  }

  async chat(message: string): Promise<string> {
    const startTime = Date.now();
    let iterations = 0;

    while (iterations < this.maxIterations) {
      if (Date.now() - startTime > this.maxExecutionTime * 1000) {
        throw new Error('Execution time limit exceeded');
      }

      const messages: ChatMessage[] = [
        ...this.getContextMessages(),
        { role: 'user', content: { type: 'text', text: message } }
      ];

      const toolDefinitions: Tool[] = Array.from(this.context.tools.values()).map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      const params: ChatCompletionParams = {
        messages,
        tools: toolDefinitions,
        toolChoice: this.config.toolChoice || 'auto',
        options: {
          ...this.provider.defaultOptions,
          ...this.config.llmOptions,
          systemMessage: this.buildSystemPrompt()
        }
      };

      const response = await this.provider.generateChatCompletion(params);

      // Handle tool calls if present
      if (response.toolCalls?.length) {
        for (const toolCall of response.toolCalls) {
          const result = await this.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          
          messages.push({
            role: 'assistant',
            content: { type: 'text', text: JSON.stringify(result) }
          });
        }
        iterations++;
        continue;
      }

      const responseText = this.extractResponseText(response);
      
      if (this.config.memory) {
        this.updateMemory(messages, responseText);
      }

      return responseText;
    }
    throw new Error('Maximum iterations exceeded');
  }

  protected buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.context.tools.values())
      .map(tool => `${tool.name}: ${tool.description}`)
      .join('\n');

    return `
Role: ${this.config.role}
Goal: ${this.config.goal}
Backstory: ${this.config.backstory}

Available Tools:
${toolDescriptions}

${this.config.systemPrompt || ''}
    `.trim();
  }

  private getContextMessages(): ChatMessage[] {
    if (!this.config.memory) return [];
    return this.context.messages.slice(-5);
  }

  private updateMemory(messages: ChatMessage[], responseText: string): void {
    this.context.messages = messages;
    this.context.messages.push({
      role: 'assistant',
      content: { type: 'text', text: responseText }
    });
  }

  async addTool(tool: AgentTool): Promise<void> {
    this.context.tools.set(tool.name, tool);
  }

  async removeTool(toolName: string): Promise<boolean> {
    return this.context.tools.delete(toolName);
  }

  async *streamChat(message: string): AsyncGenerator<string> {
    const startTime = Date.now();
    let iterations = 0;

    while (iterations < this.maxIterations) {
      if (Date.now() - startTime > this.maxExecutionTime * 1000) {
        throw new Error('Execution time limit exceeded');
      }

      const messages: ChatMessage[] = [
        ...this.getContextMessages(),
        { role: 'user', content: { type: 'text', text: message } }
      ];

      const toolDefinitions: Tool[] = Array.from(this.context.tools.values()).map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      const params: ChatCompletionParams = {
        messages,
        tools: toolDefinitions,
        toolChoice: this.config.toolChoice || 'auto',
        options: {
          ...this.provider.defaultOptions,
          ...this.config.llmOptions,
          systemMessage: this.buildSystemPrompt()
        }
      };

      try {
        for await (const chunk of this.provider.streamChatCompletion(params)) {
          if (chunk.text) {
            yield chunk.text;
            
            if (this.config.memory) {
              this.updateMemory(messages, chunk.text);
            }
          }
        }
        return;
      } catch (error) {
        iterations++;
        if (iterations >= this.maxIterations) {
          throw error;
        }
      }
    }
  }
}