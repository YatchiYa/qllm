/**
 * @fileoverview DeepSeek provider implementation for QLLM library.
 * Implements LLMProvider interface for DeepSeek's R1 model.
 * 
 * @version 1.0.0
 */

import axios from 'axios';
import {
  BaseLLMProvider,
  ChatCompletionParams,
  ChatCompletionResponse,
  ChatStreamCompletionResponse,
  LLMOptions,
  LLMProviderError,
  Model,
  EmbeddingRequestParams,
  EmbeddingResponse,
  ChatMessage,
  Tool,
} from '../../types';

const DEEPSEEK_API_URL = 'https://deepseek-r1-distill-llama-70b.endpoints.kepler.ai.cloud.ovh.net/api/openai_compat/v1/chat/completions';
const DEFAULT_MODEL = 'DeepSeek-R1-Distill-Llama-70B';
const DEFAULT_MAX_TOKENS = 512;

export class DeepSeekProvider extends BaseLLMProvider {
  private apiKey: string;
  public readonly name = 'DeepSeek';
  public readonly version = '1.0.0';

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    if (!this.apiKey || this.apiKey === '') {
      throw new LLMProviderError('DeepSeek API key not found', this.name);
    }
  }

  defaultOptions: LLMOptions = {
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
  };

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.map(c => c.type === 'text' ? c.text : '').join('\n')
        : msg.content.type === 'text'
          ? msg.content.text
          : '',
      name: msg.role === 'user' ? 'User' : undefined,
    }));
  }

  async listModels(): Promise<Model[]> {
    return [
      {
        id: DEFAULT_MODEL,
        created: new Date(),
        description: 'DeepSeek R1 Distill Llama 70B model',
      },
    ];
  }

  async generateChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    try {
      const { messages, options } = params;
      
      const payload = {
        messages: this.formatMessages(messages),
        model: options.model || this.defaultOptions.model,
        max_tokens: options.maxTokens || this.defaultOptions.maxTokens,
        temperature: options.temperature || 0,
        top_p: options.topProbability,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
      };

      const response = await axios.post(DEEPSEEK_API_URL, payload, { 
        headers: this.getHeaders() 
      });

      const result = response.data;
      const firstChoice = result.choices[0];

      return {
        model: result.model,
        text: result.choices[0]?.message?.content,
        finishReason: result.choices[0]?.finish_reason,
        refusal: null, // Add this line to include the required refusal property
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamChatCompletion(
    params: ChatCompletionParams,
  ): AsyncIterableIterator<ChatStreamCompletionResponse> {
    try {
      const { messages, options } = params;
      
      const response = await axios.post(DEEPSEEK_API_URL, 
        {
          messages: this.formatMessages(messages),
          model: options.model || this.defaultOptions.model,
          max_tokens: options.maxTokens || this.defaultOptions.maxTokens,
          temperature: options.temperature || 0,
          stream: true
        }, 
        { headers: this.getHeaders(), responseType: 'stream' }
      );
  
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            // Skip the [DONE] message
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content;
              yield {
                text: delta || null,
                finishReason: parsed.choices[0]?.finish_reason || null,
                model: options.model || this.defaultOptions.model,
              };
            } catch (parseError) {
              console.error('Error parsing chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }
  

  async generateEmbedding(input: EmbeddingRequestParams): Promise<EmbeddingResponse> {
    throw new LLMProviderError('Embedding generation not supported by DeepSeek provider', this.name);
  }

  protected handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        throw new LLMProviderError('Authentication failed with DeepSeek', this.name);
      } else if (statusCode === 429) {
        throw new LLMProviderError('Rate limit exceeded for DeepSeek', this.name);
      }
      throw new LLMProviderError(
        `DeepSeek API error: ${error.response?.data?.error || error.message}`,
        this.name,
      );
    } else if (error instanceof Error) {
      throw new LLMProviderError(`Unexpected error: ${error.message}`, this.name);
    } else {
      throw new LLMProviderError(`Unknown error occurred: ${error}`, this.name);
    }
  }
}
