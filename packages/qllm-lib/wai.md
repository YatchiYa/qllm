# Table of Contents
- src/agents/agent-loader.ts
- src/agents/index.ts
- src/agents/agent-manager.ts
- src/agents/agent-builder.ts
- src/agents/base-agent.ts
- src/agents/agent-types.ts
- src/agents/templates/default-agent.yaml
- src/storage/sqlite-conversation-storage-provider.ts
- src/storage/index.ts
- src/storage/sqlite-storage-provider.ts
- src/storage/in-memory-storage-provider.ts
- src/types/document-types.ts
- src/types/models-cost.ts
- src/types/index.ts
- src/types/llm-types.ts
- src/types/workflow-types.ts
- src/types/conversations-types.ts
- src/types/file-handler.ts
- src/types/llm-provider.ts

## File: src/agents/agent-loader.ts

- Extension: .ts
- Language: typescript
- Size: 1065 bytes
- Created: 2024-12-08 18:12:38
- Modified: 2024-12-08 18:12:38

### Code

```typescript
import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { Agent } from './base-agent'; 
import { LLMProvider } from '../types'; 

export class AgentLoader {
  async loadFromYaml(path: string, provider: LLMProvider): Promise<Agent> {
    const content = await readFile(path, 'utf-8');
    const config = load(content) as any;
    
    return new Agent({
      role: config.name,
      goal: config.description,
      backstory: config.description,
      llmOptions: {
        ...config.model.parameters,
        model: config.model.name,
        systemMessage: this.processSystemPrompt(
          config.system_prompt,
          config.role,
          config.goal,
          config.backstory
        ),
        streaming: true // Enable streaming by default
      }
    }, provider);
  }

  private processSystemPrompt(
    template: string,
    role: string,
    goal: string,
    backstory: string
  ): string {
    return template
      .replace('{role}', role)
      .replace('{goal}', goal)
      .replace('{backstory}', backstory);
  }
}
```

## File: src/agents/index.ts

- Extension: .ts
- Language: typescript
- Size: 180 bytes
- Created: 2024-12-08 18:17:45
- Modified: 2024-12-08 18:17:45

### Code

```typescript

// New agent exports
export * from './base-agent';
export * from './agent-manager';
export * from './agent-types';
export * from './agent-loader';
export * from './agent-builder';
```

## File: src/agents/agent-manager.ts

- Extension: .ts
- Language: typescript
- Size: 1653 bytes
- Created: 2024-12-08 18:12:16
- Modified: 2024-12-08 18:12:16

### Code

```typescript
import { LLMProvider } from '../types'; 
import { Agent } from './base-agent';
import { AgentConfig } from './agent-types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

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

  async createAgent(name: string, config: AgentConfig): Promise<Agent> {
    const agent = new Agent(config, this.provider);
    this.agents.set(name, agent);
    return agent;
  }

  async loadTemplate(templateName: string): Promise<AgentConfig> {
    const templatePath = path.join(this.templatesPath!, `${templateName}.yaml`);
    const content = await fs.readFile(templatePath, 'utf-8');
    return yaml.load(content) as AgentConfig;
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

  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}
```

## File: src/agents/agent-builder.ts

- Extension: .ts
- Language: typescript
- Size: 1989 bytes
- Created: 2024-12-08 18:17:31
- Modified: 2024-12-08 18:17:31

### Code

```typescript
import { LLMOptions, LLMProvider } from "../types";
import { AgentConfig, AgentTool } from "./agent-types";
import { Agent } from "./base-agent";

export class AgentBuilder {
    private config: Partial<AgentConfig> = {};
    private provider?: LLMProvider;
  
    static create(init: {
      role: string;
      goal: string;
      backstory: string;
    }): AgentBuilder {
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
      if (!this.config.tools) {
        this.config.tools = [];
      }
      this.config.tools.push(tool);
      return this;
    }
  
    withTools(tools: AgentTool[]): AgentBuilder {
      if (!this.config.tools) {
        this.config.tools = [];
      }
      this.config.tools.push(...tools);
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
  
    build(): Agent {
      if (!this.provider) {
        throw new Error('Provider must be set before building the agent');
      }
  
      if (!this.config.llmOptions) {
        this.config.llmOptions = {
            model:"gpt-4o-mini",
        };
      }
  
      return new Agent(this.config as AgentConfig, this.provider);
    }
  }
```

## File: src/agents/base-agent.ts

- Extension: .ts
- Language: typescript
- Size: 4427 bytes
- Created: 2024-12-08 18:12:00
- Modified: 2024-12-08 18:12:00

### Code

```typescript
import {  ChatMessage, ChatCompletionParams, ChatCompletionResponse } from '../types/llm-types';
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
    
    // Initialize tools if provided
    if (config.tools) {
      config.tools.forEach(tool => {
        this.context.tools.set(tool.name, tool);
      });
    }
  }


  private extractResponseText(response: ChatCompletionResponse): string {
    // If response has text content
    if (response.text) {
      return response.text;
    }
    
    // If response has refusal
    if (response.refusal) {
      return `Refusal: ${response.refusal}`;
    }

    // Handle other cases
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

      const params: ChatCompletionParams = {
        messages,
        options: {
          ...this.provider.defaultOptions,
          ...this.config.llmOptions,
          systemMessage: this.buildSystemPrompt()
        }
      };

      const response = await this.provider.generateChatCompletion(params);
      
        // Handle the response based on your ChatCompletionResponse type
        const responseText = this.extractResponseText(response);

        if (this.config.memory) {
        this.context.messages = messages;
        this.context.messages.push({
            role: 'assistant',
            content: { type: 'text', text: responseText }
        });
        }

        return responseText;
    }
    throw new Error('Maximum iterations exceeded');
  }

  protected buildSystemPrompt(): string {
    return `
Role: ${this.config.role}
Goal: ${this.config.goal}
Backstory: ${this.config.backstory}

Available Tools:
${Array.from(this.context.tools.keys()).map(tool => `- ${tool}`).join('\n')}

${this.config.systemPrompt || ''}
    `.trim();
  }

  private getContextMessages(): ChatMessage[] {
    if (!this.config.memory) return [];
    return this.context.messages.slice(-5); // Keep last 5 messages for context
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
        { 
          role: 'user', 
          content: { type: 'text', text: message }
        }
      ];

      const params: ChatCompletionParams = {
        messages,
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
            
            // Store in context if memory is enabled
            if (this.config.memory) {
              this.context.messages = messages;
              this.context.messages.push({
                role: 'assistant',
                content: { type: 'text', text: chunk.text }
              });
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
```

## File: src/agents/agent-types.ts

- Extension: .ts
- Language: typescript
- Size: 1287 bytes
- Created: 2024-12-08 18:39:24
- Modified: 2024-12-08 18:39:24

### Code

```typescript
import { MemoryOptions } from '../storage/sqlite-storage-provider';
import { Conversation } from '../types';
import { ChatMessage, LLMOptions } from '../types/llm-types';

export interface KnowledgeHandler {
  search(query: string): Promise<string[]>;
  add(documents: string[]): Promise<void>;
  delete(documentIds: string[]): Promise<void>;
  update(documentId: string, content: string): Promise<void>;
}

export interface AgentConfig {
  // Existing fields
  role: string;
  goal: string;
  backstory: string;
  llmOptions: LLMOptions;
  memoryOptions?: MemoryOptions;
  
  // New fields
  tools?: AgentTool[];
  maxIterations?: number;
  maxExecutionTime?: number;
  allowDelegation?: boolean;
  memory?: boolean;
  verbose?: boolean;
  cacheEnabled?: boolean;
  knowledgeSources?: KnowledgeSource[];
  systemPrompt?: string;
}

export interface KnowledgeSource {
  type: 'rag' | 'graph' | 'vector' | 'hybrid';
  config: Record<string, any>;
  handler: KnowledgeHandler;
}


export interface AgentTool {
  name: string;
  description: string;
  execute: (inputs: Record<string, any>) => Promise<any>;
  cacheFunction?: (args: any[], result: any) => boolean;
}

export interface AgentContext {
  messages: ChatMessage[];
  memory: Map<string, any>;
  tools: Map<string, AgentTool>;
}

```

## File: src/agents/templates/default-agent.yaml

- Extension: .yaml
- Language: yaml
- Size: 614 bytes
- Created: 2024-12-08 18:12:59
- Modified: 2024-12-08 18:12:59

### Code

```yaml
name: research_assistant
version: 1.0.0
description: An AI research assistant
system_prompt: |
  You are an AI assistant with the following characteristics:
  Role: {role}
  Goal: {goal}
  Backstory: {backstory}
  Instructions:
  1. Use your expertise to provide accurate and helpful responses
  2. Maintain conversation context
  3. Use available tools when appropriate
  4. Stay focused on your assigned role and goal
  5. Provide clear and structured responses

model:
  provider: openai
  name: gpt-4o-mini
  parameters:
    max_tokens: 1000
    temperature: 0.7
    top_p: 1
    top_k: 250
    streaming: true
```

## File: src/storage/sqlite-conversation-storage-provider.ts

- Extension: .ts
- Language: typescript
- Size: 5847 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/*import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { 
  Conversation, 
  ConversationId, 
  ConversationMetadata, 
  StorageProvider,
  ConversationMessage,
} from "../types";

export class SQLiteConversationStorageProvider implements StorageProvider {
  private db: Database | null = null;

  constructor(private dbPath: string) {}

  private async getDb(): Promise<Database> {
    if (!this.db) {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      await this.initializeTables();
    }
    return this.db;
  }

  private async initializeTables(): Promise<void> {
    const db = await this.getDb();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        metadata TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        provider_id TEXT NOT NULL,
        options TEXT,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
      CREATE TABLE IF NOT EXISTS active_providers (
        conversation_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        PRIMARY KEY (conversation_id, provider_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
    `);
  }

  async save(conversation: Conversation): Promise<void> {
    const db = await this.getDb();
    await db.run('BEGIN TRANSACTION');
    try {
      // Save conversation metadata
      await db.run(
        'INSERT OR REPLACE INTO conversations (id, metadata) VALUES (?, ?)',
        conversation.id,
        JSON.stringify(conversation.metadata)
      );

      // Delete existing messages and active providers
      await db.run('DELETE FROM messages WHERE conversation_id = ?', conversation.id);
      await db.run('DELETE FROM active_providers WHERE conversation_id = ?', conversation.id);

      // Save messages
      for (const message of conversation.messages) {
        await db.run(
          'INSERT INTO messages (id, conversation_id, role, content, timestamp, provider_id, options, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          message.id,
          conversation.id,
          message.role,
          JSON.stringify(message.content),
          message.timestamp.toISOString(),
          message.providerId,
          JSON.stringify(message.options),
          JSON.stringify(message.metadata)
        );
      }

      // Save active providers
      for (const providerId of conversation.activeProviders) {
        await db.run(
          'INSERT INTO active_providers (conversation_id, provider_id) VALUES (?, ?)',
          conversation.id,
          providerId
        );
      }

      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  async load(id: ConversationId): Promise<Conversation | null> {
    const db = await this.getDb();
    const conversationRow = await db.get('SELECT * FROM conversations WHERE id = ?', id);
    if (!conversationRow) return null;

    const messages = await db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp', id);
    const activeProviders = await db.all('SELECT provider_id FROM active_providers WHERE conversation_id = ?', id);

    return {
      id: conversationRow.id,
      metadata: JSON.parse(conversationRow.metadata),
      messages: messages.map(m => ({
        id: m.id,
        role: m.role as ConversationMessage['role'],
        content: JSON.parse(m.content),
        timestamp: new Date(m.timestamp),
        providerId: m.provider_id,
        options: m.options ? JSON.parse(m.options) : undefined,
        metadata: m.metadata ? JSON.parse(m.metadata) : undefined
      })),
      activeProviders: new Set(activeProviders.map(ap => ap.provider_id))
    };
  }

  async delete(id: ConversationId): Promise<void> {
    const db = await this.getDb();
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run('DELETE FROM messages WHERE conversation_id = ?', id);
      await db.run('DELETE FROM active_providers WHERE conversation_id = ?', id);
      await db.run('DELETE FROM conversations WHERE id = ?', id);
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  async list(): Promise<ConversationMetadata[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT id, metadata FROM conversations');
    return rows.map(row => ({
      id: row.id,
      ...JSON.parse(row.metadata)
    }));
  }

  async listConversations(): Promise<Conversation[]> {
    const db = await this.getDb();
    const conversations = await db.all('SELECT * FROM conversations');
    return Promise.all(conversations.map(async (conv) => {
      const messages = await db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp', conv.id);
      const activeProviders = await db.all('SELECT provider_id FROM active_providers WHERE conversation_id = ?', conv.id);
      return {
        id: conv.id,
        metadata: JSON.parse(conv.metadata),
        messages: messages.map(m => ({
          id: m.id,
          role: m.role as ConversationMessage['role'],
          content: JSON.parse(m.content),
          timestamp: new Date(m.timestamp),
          providerId: m.provider_id,
          options: m.options ? JSON.parse(m.options) : undefined,
          metadata: m.metadata ? JSON.parse(m.metadata) : undefined
        })),
        activeProviders: new Set(activeProviders.map(ap => ap.provider_id))
      };
    }));
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}*/

```

## File: src/storage/index.ts

- Extension: .ts
- Language: typescript
- Size: 2550 bytes
- Created: 2024-12-08 18:43:16
- Modified: 2024-12-08 18:43:16

### Code

```typescript
/**
 * @fileoverview Storage provider factory module for the QLLM library.
 * This module provides a factory function to create different types of storage providers
 * for managing conversation persistence.
 * 
 * @module storage
 * @author QLLM Team
 * @version 1.0.0
 */

import { StorageProvider } from '../types';
import { InMemoryStorageProvider } from './in-memory-storage-provider';
import {SQLiteStorageProvider} from './sqlite-storage-provider';

//import { SQLiteConversationStorageProvider } from './sqlite-conversation-storage-provider';

/**
 * Available storage provider types supported by the factory.
 * - 'in-memory': Volatile storage that persists data only during runtime
 * - 'sqlite': Persistent storage using SQLite database (currently disabled)
 */
export type StorageProviderName = 'in-memory' | 'sqlite';

/**
 * Creates a storage provider instance based on the specified type and configuration.
 * 
 * @param {StorageProviderName} name - The type of storage provider to create
 * @param {Object} options - Configuration options for the storage provider
 * @param {string} [options.dbPath] - Database file path (required for SQLite provider)
 * @returns {StorageProvider | undefined} The created storage provider instance or undefined if type is not supported
 * @throws {Error} When required configuration options are missing
 * 
 * @example
 * ```typescript
 * // Create an in-memory storage provider
 * const memoryStorage = createStorageProvider('in-memory', {});
 * 
 * // Create a SQLite storage provider (when implemented)
 * const sqliteStorage = createStorageProvider('sqlite', { dbPath: './conversations.db' });
 * ```
 */
export function createStorageProvider(
  name: StorageProviderName,
  {
    dbPath,
  }: {
    dbPath?: string;
  },
): StorageProvider | undefined {
  // Updated return type to include undefined
  switch (name.toLowerCase()) {
    case 'in-memory':
      return new InMemoryStorageProvider();
    case 'sqlite':
      if (!dbPath) {
        throw new Error('dbPath must be provided for SQLite storage provider');
      }
      return new SQLiteStorageProvider(dbPath);
    case 'local':
      if (!dbPath) {
        throw new Error('dbPath must be provided for SQLite storage provider');
      }
      // ... handle SQLite storage provider ...
      return; // Added return statement for 'local' case
    default:
      throw new Error(`Unsupported storage provider: ${name}`);
  }
  return undefined; // Added return statement for cases not handled
}

export default  createStorageProvider;
```

## File: src/storage/sqlite-storage-provider.ts

- Extension: .ts
- Language: typescript
- Size: 2050 bytes
- Created: 2024-12-08 18:38:57
- Modified: 2024-12-08 18:38:57

### Code

```typescript
// src/storage/sqlite-storage-provider.ts
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'; 
import { Conversation } from '../types'; 


export interface StorageProvider {
  save(conversation: Conversation): Promise<void>;
  load(id: string): Promise<Conversation | null>;
  delete(id: string): Promise<void>;
  listConversations(): Promise<Conversation[]>;
}

export interface MemoryOptions {
  shortTermSize: number;
  longTermEnabled: boolean;
  storageProvider: StorageProvider;
  vectorSearchConfig?: {
    similarity: number;
    maxResults: number;
  };
}

export class SQLiteStorageProvider implements StorageProvider {
  private db: any;

  constructor(dbPath: string) {
    this.initialize(dbPath);
  }

  private async initialize(dbPath: string) {
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async save(conversation: any): Promise<void> {
    const data = JSON.stringify(conversation);
    await this.db.run(
      `INSERT OR REPLACE INTO conversations (id, data, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [conversation.id, data]
    );
  }

  async load(id: string): Promise<any | null> {
    const row = await this.db.get(
      'SELECT data FROM conversations WHERE id = ?',
      [id]
    );
    return row ? JSON.parse(row.data) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
  }

  // Ajout de la méthode list manquante
  async list(): Promise<any[]> {
    const rows = await this.db.all('SELECT data FROM conversations');
    return rows.map((row:any) => JSON.parse(row.data));
  }

  // Alias pour la compatibilité avec l'interface
  async listConversations(): Promise<any[]> {
    return this.list();
  }
}
```

## File: src/storage/in-memory-storage-provider.ts

- Extension: .ts
- Language: typescript
- Size: 2830 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview In-memory storage implementation for conversations.
 * Provides a volatile storage solution that maintains conversations in memory
 * during runtime. This is useful for testing and development purposes.
 * 
 * @module storage/in-memory
 * @author QLLM Team
 * @version 1.0.0
 */

import { Conversation, ConversationId, ConversationMetadata, StorageProvider } from '../types';

/**
 * Implementation of the StorageProvider interface that stores conversations in memory.
 * All data is lost when the application restarts. Uses JavaScript's Map for storage
 * and structuredClone for deep copying of objects to prevent mutation.
 * 
 * @implements {StorageProvider}
 * 
 * @example
 * ```typescript
 * const storage = new InMemoryStorageProvider();
 * await storage.save(conversation);
 * const retrieved = await storage.load(conversation.id);
 * ```
 */
export class InMemoryStorageProvider implements StorageProvider {
  /** Internal Map to store conversations, indexed by their ID */
  private conversations = new Map<ConversationId, Conversation>();

  /**
   * Saves a conversation to memory storage.
   * Creates a deep copy of the conversation to prevent external mutations.
   * 
   * @param {Conversation} conversation - The conversation to save
   * @returns {Promise<void>}
   */
  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, structuredClone(conversation));
  }

  /**
   * Loads a conversation from memory storage by its ID.
   * Returns a deep copy of the stored conversation to prevent mutations.
   * 
   * @param {ConversationId} id - The ID of the conversation to load
   * @returns {Promise<Conversation | null>} The conversation if found, null otherwise
   */
  async load(id: ConversationId): Promise<Conversation | null> {
    const conversation = this.conversations.get(id);
    return conversation ? structuredClone(conversation) : null;
  }

  /**
   * Deletes a conversation from memory storage.
   * 
   * @param {ConversationId} id - The ID of the conversation to delete
   * @returns {Promise<void>}
   */
  async delete(id: ConversationId): Promise<void> {
    this.conversations.delete(id);
  }

  /**
   * Lists metadata for all stored conversations.
   * 
   * @returns {Promise<ConversationMetadata[]>} Array of conversation metadata
   */
  async list(): Promise<ConversationMetadata[]> {
    return Array.from(this.conversations.values()).map((conv) => conv.metadata);
  }

  /**
   * Lists all stored conversations.
   * Returns deep copies of the conversations to prevent mutations.
   * 
   * @returns {Promise<Conversation[]>} Array of all stored conversations
   */
  async listConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).map((conv) => structuredClone(conv));
  }
}

```

## File: src/types/document-types.ts

- Extension: .ts
- Language: typescript
- Size: 509 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
// src/utils/document/document-types.ts
export interface FormatHandler {
    mimeTypes: string[];
    handle(buffer: Buffer): Promise<string>;
  }
  
  export interface ParseResult {
    content: string;
    mimeType: string;
    parsedContent?: string;
  }
  
  export interface DocumentParser {
    parse(buffer: Buffer, filename: string): Promise<string>;
    supports(filename: string): boolean;
  }
  
  export type LoadResult<T> = {
    content: T;
    mimeType: string;
    parsedContent?: string;
  };
```

## File: src/types/models-cost.ts

- Extension: .ts
- Language: typescript
- Size: 2458 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Type definitions for model cost calculation in the QLLM library.
 * This file defines types for tracking and calculating token usage and associated costs
 * across different language models and providers.
 * 
 * @version 1.0.0
 * @license MIT
 */

/**
 * Represents the token usage and cost calculation result for a single operation
 */
export interface TokenResult {
  /** Name of the provider (e.g., 'OpenAI', 'Anthropic') */
  provider: string;
  /** Model identifier */
  model: string;
  /** Number of tokens in the input */
  input_tokens: number;
  /** Number of tokens in the output */
  output_tokens: number;
  /** Total number of tokens used */
  total_tokens: number;
  /** Cost for input tokens */
  input_price: number;
  /** Cost for output tokens */
  output_price: number;
  /** Total cost for the operation */
  total_price: number;
}

/**
 * Defines pricing information for a specific model
 */
export interface PriceModel {
  /** Model identifier */
  name: string;
  /** Cost per input token */
  input_price: number;
  /** Cost per output token */
  output_price: number;
}

/**
 * Groups models under a provider with their pricing information
 */
export interface Provider {
  /** Provider name */
  name: string;
  /** Array of models with their pricing */
  models: PriceModel[];
}

/**
 * Collection of provider-specific token pricing information
 */
export interface TokenPrices {
  /** Array of providers with their model pricing */
  providers: Provider[];
}

/**
 * Input parameters for token calculation
 */
export interface TokenCalculateInput {
  /** Text to calculate tokens for input */
  input_text?: string;
  /** Text to calculate tokens for output */
  output_text?: string;
  /** Specific provider to calculate for */
  provider?: string;
  /** Specific model to calculate for */
  model?: string;
}

/**
 * Result of token calculation including costs across providers
 */
export interface TokenCalculateOutput {
  /** Number of tokens in the input */
  input_tokens: number;
  /** Number of tokens in the output */
  output_tokens: number;
  /** Total number of tokens */
  total_tokens: number;
  /** Array of price calculations per provider/model */
  prices: TokenResult[];
}

/**
 * Result of token counting operation
 */
export interface TokenCountResult {
  /** Number of tokens counted */
  tokens: number;
  /** Array of price calculations per provider/model */
  prices: TokenResult[];
}
```

## File: src/types/index.ts

- Extension: .ts
- Language: typescript
- Size: 198 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
export * from './llm-provider';
export * from './llm-types';
export * from './conversations-types';
export * from './workflow-types';
export * from './file-handler';
export * from './models-cost'; 

```

## File: src/types/llm-types.ts

- Extension: .ts
- Language: typescript
- Size: 9232 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Core type definitions for the QLLM library.
 * This file contains all the fundamental types used across the library for
 * chat messages, completions, embeddings, and model configurations.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { z } from 'zod';

// -------------------- Chat Message Types --------------------

/** Valid roles for chat messages */
export type ChatMessageRole = 'user' | 'assistant';

/** Supported content types for chat messages */
export type ChatMessageContentType = 'text' | 'image_url';

/** Text content structure for chat messages */
export type TextContent = {
  type: 'text';
  text: string;
};

/** Image URL content structure for chat messages */
export type ImageUrlContent = {
  type: 'image_url';
  url: string;
};

/** Union type for all possible message content types */
export type MessageContent = TextContent | ImageUrlContent;

/** Chat message content can be a single content item or an array */
export type ChatMessageContent = MessageContent | MessageContent[];

/**
 * Core chat message structure used throughout the library
 */
export type ChatMessage = {
  role: ChatMessageRole;
  content: ChatMessageContent;
};

/**
 * System message structure for providing context or instructions
 */
export type SystemMessage = {
  role: 'system';
  content: TextContent;
};

/** Union type for messages that can include system messages */
export type ChatMessageWithSystem = ChatMessage | SystemMessage;

/**
 * Type guard to check if content is text-based
 * @param content - Message content to check
 * @returns True if content is text-based
 */
export function isTextContent(content: MessageContent): content is TextContent {
  return content.type === 'text';
}

/**
 * Type guard to check if content is image-based
 * @param content - Message content to check
 * @returns True if content is image-based
 */
export function isImageUrlContent(content: MessageContent): content is ImageUrlContent {
  return content.type === 'image_url';
}

// -------------------- Usage and Response Types --------------------

/**
 * Token usage statistics for API calls
 */
export type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * Response structure for chat completion requests
 */
export type ChatCompletionResponse = {
  model: string;
  text: string | null;
  refusal: string | null;
  toolCalls?: ToolCall[];
  finishReason: string | null;
  usage?: Usage;
};

/**
 * Response structure for streaming chat completion requests
 */
export type ChatStreamCompletionResponse = {
  model: string;
  text: string | null;
  finishReason: string | null;
};

// -------------------- Embedding Types --------------------

/**
 * Parameters for embedding generation requests
 */
export type EmbeddingRequestParams = {
  model: string;
  content: string | string[] | number[] | number[][];
  dimensions?: number;
};

/** Vector representation of embedded content */
export type Embedding = number[];

/**
 * Response structure for embedding requests
 */
export type EmbeddingResponse = {
  embedding: Embedding;
  embeddings?: Embedding[];
};

// -------------------- Option Types --------------------

/**
 * Configuration options for text generation
 */
export interface GenerationOptions {
  /** Seed for deterministic generation. Same seed should produce same output */
  seed?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Controls randomness: 0 = deterministic, 1 = very random */
  temperature?: number;
  /** Nucleus sampling: only consider tokens with top_p cumulative probability */
  topProbability?: number;
  /** Only sample from top K tokens */
  topKTokens?: number;
  /** Number of most likely tokens to return with their log probabilities */
  topLogprobs?: number | null;
  /** Adjust likelihood of specific tokens appearing in the output */
  logitBias?: Record<string, number> | null;
  /** Whether to return log probabilities of the output tokens */
  logprobs?: number | null;
  /** Sequences where the API will stop generating further tokens */
  stop?: string | string[] | null;
  /** Penalize new tokens based on their existing frequency */
  presencePenalty?: number | null;
  /** Penalize new tokens based on their existing frequency */
  frequencyPenalty?: number | null;
}

/** Model selection options */
export interface ModelOptions {
  model: string;
}

/** AWS environment configuration options */
export interface EnvironmentOptions {
  awsRegion?: string;
  awsProfile?: string;
}

/** Combined options for LLM operations */
export interface LLMOptions extends GenerationOptions, ModelOptions, EnvironmentOptions {
  systemMessage?: string;
}

// -------------------- Function and Tool Types --------------------

/** Schema definition for JSON primitive types */
const JSONSchemaPrimitiveType = z.enum(['string', 'number', 'integer', 'boolean', 'null']);

/**
 * Comprehensive JSON Schema type definition
 * Supports nested schemas and various validation rules
 */
const JSONSchemaType: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      // Core schema metadata
      $schema: z.string().optional(),
      $id: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),

      // Type-specific fields
      type: z.union([JSONSchemaPrimitiveType, z.array(JSONSchemaPrimitiveType)]).optional(),
      enum: z.array(z.any()).optional(),
      const: z.any().optional(),

      // Numeric constraints
      multipleOf: z.number().positive().optional(),
      maximum: z.number().optional(),
      exclusiveMaximum: z.number().optional(),
      minimum: z.number().optional(),
      exclusiveMinimum: z.number().optional(),

      // String constraints
      maxLength: z.number().int().nonnegative().optional(),
      minLength: z.number().int().nonnegative().optional(),
      pattern: z.string().optional(),

      // Array constraints
      items: z.union([JSONSchemaType, z.array(JSONSchemaType)]).optional(),
      additionalItems: z.union([JSONSchemaType, z.boolean()]).optional(),
      maxItems: z.number().int().nonnegative().optional(),
      minItems: z.number().int().nonnegative().optional(),
      uniqueItems: z.boolean().optional(),

      // Object constraints
      properties: z.record(JSONSchemaType).optional(),
      patternProperties: z.record(JSONSchemaType).optional(),
      additionalProperties: z.union([JSONSchemaType, z.boolean()]).optional(),
      required: z.array(z.string()).optional(),
      propertyNames: JSONSchemaType.optional(),
      maxProperties: z.number().int().nonnegative().optional(),
      minProperties: z.number().int().nonnegative().optional(),

      // Combining schemas
      allOf: z.array(JSONSchemaType).optional(),
      anyOf: z.array(JSONSchemaType).optional(),
      oneOf: z.array(JSONSchemaType).optional(),
      not: JSONSchemaType.optional(),

      // Conditional schema
      if: JSONSchemaType.optional(),
      then: JSONSchemaType.optional(),
      else: JSONSchemaType.optional(),

      // Format
      format: z.string().optional(),

      // Schema annotations
      default: z.any().optional(),
      examples: z.array(z.any()).optional(),
    })
    .passthrough(),
);

/** Schema for function-based tools */
const FunctionToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string(),
    parameters: JSONSchemaType,
  }),
  strict: z.boolean().optional(),
});

/** Combined tool schema */
const ToolSchema = FunctionToolSchema;

/** Type definition for function-based tools */
export type FunctionTool = z.infer<typeof FunctionToolSchema>;
/** Type definition for all tool types */
export type Tool = z.infer<typeof ToolSchema>;

/** Structure for function calls within tools */
export type ToolCallFunction = {
  name: string;
  arguments: string;
};

/** Structure for tool calls */
export type ToolCall = {
  id: string;
  type: 'function';
  function: ToolCallFunction;
};

// -------------------- Response Format Types --------------------

/** Text response format */
export type ResponseFormatText = {
  type: 'text';
};

/** JSON object response format */
export type ResponseFormatJSONObject = {
  type: 'json_object';
};

/** JSON schema response format */
export type ResponseFormatJSONSchema = {
  type: 'json_schema';
  json_schema: {
    name: string;
    description?: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
};

/** Combined response format type */
export type ResponseFormat = ResponseFormatText | ResponseFormatJSONObject | ResponseFormatJSONSchema;

/** Error response structure */
export type ErrorResponse = {
  code: string;
  message: string;
  details?: string;
};

/** Model information structure */
export type Model = {
  id: string;
  description?: string;
  created?: Date;
};

// -------------------- Chat Completion Types --------------------

/** Parameters for chat completion requests */
export type ChatCompletionParams = {
  messages: ChatMessage[];
  tools?: Tool[];
  toolChoice?: 'none' | 'auto' | 'required';
  parallelToolCalls?: boolean;
  responseFormat?: ResponseFormat;
  options: LLMOptions;
};

```

## File: src/types/workflow-types.ts

- Extension: .ts
- Language: typescript
- Size: 1863 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Type definitions for workflow management in the QLLM library.
 * This file defines the core types and interfaces for handling workflows,
 * including steps, definitions, and execution contexts.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { TemplateDefinition } from '../templates/types';

/**
 * Represents a single step in a workflow
 * Each step contains a template, optional provider, input parameters, and output specification
 */
export interface WorkflowStep {
    template?: TemplateDefinition;
    templateUrl?: string;
    name?: string;
    description?: string;
    tool?: string;
    toolConfig?: Record<string, any>;  
    provider?: string;
    input?: Record<string, string | number | boolean>;
    output: string | Record<string, string>;
  }

/**
 * Defines a complete workflow including its metadata and steps
 */
export interface WorkflowDefinition {
    /** Name of the workflow */
    name: string;
    /** Optional description of the workflow's purpose */
    description?: string;
    /** Optional version identifier */
    version?: string;
    /** Default provider to use if not specified in steps */
    defaultProvider?: string;
    /** Ordered array of workflow steps */
    steps: WorkflowStep[];
}

/**
 * Result of executing a workflow step
 */
export interface WorkflowExecutionResult {
    /** Response text or data from the step execution */
    response: string;
    /** Variables produced by the step execution */
    outputVariables: Record<string, any>;
}

/**
 * Context maintained during workflow execution
 * Contains variables and results from previous steps
 */
export interface WorkflowExecutionContext {
    /** Variables available during workflow execution */
    variables: Record<string, any>;
    /** Results from executed steps */
    results: Record<string, WorkflowExecutionResult>;
}
```

## File: src/types/conversations-types.ts

- Extension: .ts
- Language: typescript
- Size: 7755 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Type definitions for conversation management in the QLLM library.
 * This file defines the core types and interfaces for handling conversations,
 * including message history, metadata, and storage operations.
 * 
 * @version 1.0.0
 * @license MIT
 */

import { ChatMessage, LLMOptions } from './llm-types';

/** Unique identifier for a conversation */
export type ConversationId = string;

/** Unique identifier for a provider */
export type ProviderId = string;

/**
 * Metadata associated with a conversation
 * Includes creation and update timestamps, title, description, and custom fields
 */
export interface ConversationMetadata {
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Extended chat message type that includes conversation-specific fields
 * such as message ID, timestamp, and provider information
 */
export interface ConversationMessage extends ChatMessage {
  id: string;
  timestamp: Date;
  providerId: ProviderId;
  options?: Partial<LLMOptions>;
  metadata?: Record<string, any>;
}

/**
 * Core conversation type that represents a complete conversation
 * including messages, metadata, and active providers
 */
export interface Conversation {
  id: ConversationId;
  messages: ConversationMessage[];
  metadata: ConversationMetadata;
  activeProviders: Set<ProviderId>;
}

/**
 * Interface for conversation storage providers
 * Defines methods for persisting and retrieving conversations
 */
export interface StorageProvider {
  /**
   * Saves a conversation to storage
   * @param conversation - The conversation to save
   */
  save(conversation: Conversation): Promise<void>;
  
  /**
   * Loads a conversation from storage by ID
   * @param id - The conversation ID to load
   * @returns The conversation if found, null otherwise
   */
  load(id: ConversationId): Promise<Conversation | null>;
  
  /**
   * Deletes a conversation from storage
   * @param id - The conversation ID to delete
   */
  delete(id: ConversationId): Promise<void>;
  
  /**
   * Lists all conversation metadata
   * @returns Array of conversation metadata
   */
  list(): Promise<ConversationMetadata[]>;
  
  /**
   * Lists all complete conversations
   * @returns Array of complete conversations
   */
  listConversations(): Promise<Conversation[]>;
}

/**
 * Interface for conversation management operations
 * Provides comprehensive methods for handling conversations
 */
export interface ConversationManager {
  /**
   * Creates a new conversation
   * @param options - Optional configuration for the new conversation
   * @returns The created conversation
   */
  createConversation(options?: CreateConversationOptions): Promise<Conversation>;
  
  /**
   * Retrieves a conversation by ID
   * @param id - The conversation ID to retrieve
   * @returns The requested conversation
   */
  getConversation(id: ConversationId): Promise<Conversation>;
  
  /**
   * Updates an existing conversation
   * @param id - The conversation ID to update
   * @param updates - Partial conversation updates to apply
   * @returns The updated conversation
   */
  updateConversation(id: ConversationId, updates: Partial<Conversation>): Promise<Conversation>;
  
  /**
   * Deletes a conversation
   * @param id - The conversation ID to delete
   */
  deleteConversation(id: ConversationId): Promise<void>;
  
  /**
   * Lists all conversations
   * @returns Array of all conversations
   */
  listConversations(): Promise<Conversation[]>;
  
  /**
   * Adds a message to a conversation
   * @param id - The conversation ID
   * @param message - The message to add
   * @returns The updated conversation
   */
  addMessage(
    id: ConversationId,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>,
  ): Promise<Conversation>;
  
  /**
   * Retrieves conversation history
   * @param id - The conversation ID
   * @returns Array of conversation messages
   */
  getHistory(id: ConversationId): Promise<ConversationMessage[]>;
  
  /**
   * Updates conversation metadata
   * @param id - The conversation ID
   * @param metadata - Metadata updates to apply
   * @returns The updated conversation
   */
  setMetadata(id: ConversationId, metadata: Partial<ConversationMetadata>): Promise<Conversation>;
  
  /**
   * Adds a provider to a conversation
   * @param id - The conversation ID
   * @param providerId - The provider ID to add
   * @returns The updated conversation
   */
  addProvider(id: ConversationId, providerId: ProviderId): Promise<Conversation>;
  
  /**
   * Removes a provider from a conversation
   * @param id - The conversation ID
   * @param providerId - The provider ID to remove
   * @returns The updated conversation
   */
  removeProvider(id: ConversationId, providerId: ProviderId): Promise<Conversation>;
  
  /**
   * Clears conversation history
   * @param id - The conversation ID
   * @returns The updated conversation
   */
  clearHistory(id: ConversationId): Promise<Conversation>;
  
  /**
   * Searches conversations by query
   * @param query - Search query string
   * @returns Array of matching conversation metadata
   */
  searchConversations(query: string): Promise<ConversationMetadata[]>;
  
  /**
   * Exports a conversation to string format
   * @param id - The conversation ID to export
   * @returns Exported conversation string
   */
  exportConversation(id: ConversationId): Promise<string>;
  
  /**
   * Imports a conversation from string format
   * @param conversationData - The conversation data to import
   * @returns The imported conversation
   */
  importConversation(conversationData: string): Promise<Conversation>;
  
  /**
   * Clears a conversation's content
   * @param id - The conversation ID to clear
   * @returns The cleared conversation
   */
  clearConversation(id: ConversationId): Promise<Conversation>;
  
  /**
   * Starts a new conversation
   * @param options - Configuration options for the new conversation
   * @returns The new conversation
   */
  startNewConversation(options: CreateConversationOptions): Promise<Conversation>;
  
  /**
   * Lists all available conversations
   * @returns Array of all conversations
   */
  listAllConversations(): Promise<Conversation[]>;
  
  /**
   * Displays a conversation's content
   * @param id - The conversation ID to display
   * @returns Array of conversation messages
   */
  displayConversation(id: ConversationId): Promise<ConversationMessage[]>;
  
  /**
   * Selects a conversation for active use
   * @param id - The conversation ID to select
   * @returns The selected conversation
   */
  selectConversation(id: ConversationId): Promise<Conversation>;
  
  /**
   * Deletes all conversations
   */
  deleteAllConversations(): Promise<void>;
  
  /** Storage provider instance */
  storageProvider: StorageProvider;
}

/**
 * Options for creating a new conversation
 */
export interface CreateConversationOptions {
  initialMessage?: string;
  metadata?: Partial<ConversationMetadata>;
  providerIds?: ProviderId[];
}

/**
 * Base error class for conversation-related errors
 */
export class ConversationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationError';
  }
}

/**
 * Error thrown when a conversation is not found
 */
export class ConversationNotFoundError extends ConversationError {
  constructor(id: ConversationId) {
    super(`Conversation with id ${id} not found`);
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * Error thrown for invalid conversation operations
 */
export class InvalidConversationOperationError extends ConversationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConversationOperationError';
  }
}

```

## File: src/types/file-handler.ts

- Extension: .ts
- Language: typescript
- Size: 1035 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Type definitions for file handling operations in the QLLM library.
 * This file defines the interface for file system operations used throughout the library.
 * 
 * @version 1.0.0
 * @license MIT
 */

/**
 * Interface for handling file system operations
 * Provides methods for reading, checking existence, and determining file types
 */
export interface FileHandler {
    /**
     * Reads the contents of a file
     * @param path - Path to the file to read
     * @returns Promise resolving to the file contents as a string
     */
    read(path: string): Promise<string>;

    /**
     * Checks if a file exists
     * @param path - Path to check for existence
     * @returns Promise resolving to true if file exists, false otherwise
     */
    exists(path: string): Promise<boolean>;

    /**
     * Gets the MIME type or content type of a file
     * @param path - Path to the file to check
     * @returns Promise resolving to the file's content type
     */
    getType(path: string): Promise<string>;
}


```

## File: src/types/llm-provider.ts

- Extension: .ts
- Language: typescript
- Size: 5394 bytes
- Created: 2024-11-29 12:06:46
- Modified: 2024-11-29 12:06:46

### Code

```typescript
/**
 * @fileoverview Core provider interfaces and base classes for the QLLM library.
 * This file defines the fundamental contracts that all LLM providers must implement,
 * as well as base error handling and utility functionality.
 * 
 * @version 3.0.0
 * @license MIT
 */

import {
  ChatCompletionParams,
  ChatCompletionResponse,
  ChatStreamCompletionResponse,
  ChatMessage,
  EmbeddingRequestParams,
  EmbeddingResponse,
  LLMOptions,
  Model,
  ChatMessageWithSystem,
} from './llm-types';

/**
 * Base interface for all AI providers in the system.
 * Defines the minimal contract that any AI service must implement.
 */
export interface AIProvider {
  readonly name: string;
  readonly version: string;
  listModels(): Promise<Model[]>;
}

/**
 * Interface for providers that support text embedding generation.
 * Extends the base AIProvider interface with embedding-specific functionality.
 */
export interface EmbeddingProvider extends AIProvider {
  generateEmbedding(input: EmbeddingRequestParams): Promise<EmbeddingResponse>;
  listModels(): Promise<Model[]>;
}

/**
 * Core interface for Language Model providers.
 * Defines the contract for providers that support chat completion generation.
 */
export interface LLMProvider extends AIProvider {
  /** Default configuration options for the provider */
  defaultOptions: LLMOptions;
  
  /**
   * Generates a chat completion response.
   * @param params - Parameters for the chat completion request
   * @returns Promise resolving to the completion response
   */
  generateChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
  
  /**
   * Generates a streaming chat completion response.
   * @param params - Parameters for the chat completion request
   * @returns AsyncIterator yielding completion response chunks
   */
  streamChatCompletion(
    params: ChatCompletionParams,
  ): AsyncIterableIterator<ChatStreamCompletionResponse>;
}

/**
 * Base error class for LLM provider errors.
 * Provides structured error information including provider context.
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public providerName: string,
    public errorCode?: string,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

/** Error thrown when provider authentication fails */
export class AuthenticationError extends LLMProviderError {}
/** Error thrown when provider rate limits are exceeded */
export class RateLimitError extends LLMProviderError {}
/** Error thrown for invalid request parameters */
export class InvalidRequestError extends LLMProviderError {}

/**
 * Abstract base class implementing common LLM provider functionality.
 * Provides default implementations and utility methods for concrete providers.
 */
export abstract class BaseLLMProvider implements LLMProvider {
  public supportsEmbedding = false;
  public supportsImageAnalysis = false;
  public version = '3.0.0';
  public abstract name: string;

  abstract listModels(): Promise<Model[]>;
  abstract defaultOptions: LLMOptions;
  abstract generateChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
  abstract streamChatCompletion(
    params: ChatCompletionParams,
  ): AsyncIterableIterator<ChatStreamCompletionResponse>;

  /**
   * Standardized error handling for LLM providers.
   * @param error - The error to handle
   * @throws {LLMProviderError} Wrapped provider-specific error
   */
  protected handleError(error: unknown): never {
    if (error instanceof LLMProviderError) {
      throw error;
    } else if (error instanceof Error) {
      throw new InvalidRequestError(error.message, this.constructor.name);
    } else {
      throw new InvalidRequestError(`Unknown error: ${error}`, this.constructor.name);
    }
  }

  /**
   * Prepends a system message to the chat messages if specified in options.
   * @param options - LLM options containing optional system message
   * @param messages - Array of chat messages
   * @returns Messages array with system message prepended if present
   */
  protected withSystemMessage(
    options: LLMOptions,
    messages: ChatMessage[],
  ): ChatMessageWithSystem[] {
    return options.systemMessage && options.systemMessage.length > 0
      ? [
          {
            role: 'system',
            content: { type: 'text', text: options.systemMessage },
          },
          ...messages,
        ]
      : messages;
  }
}

/**
 * Abstract base class implementing common embedding provider functionality.
 * Provides default implementations and utility methods for concrete embedding providers.
 */
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  public version = '1.0.0';
  public abstract name: string;

  abstract generateEmbedding(input: EmbeddingRequestParams): Promise<EmbeddingResponse>;
  abstract listModels(): Promise<Model[]>;

  /**
   * Standardized error handling for embedding providers.
   * @param error - The error to handle
   * @throws {LLMProviderError} Wrapped provider-specific error
   */
  protected handleError(error: unknown): never {
    if (error instanceof LLMProviderError) {
      throw error;
    } else if (error instanceof Error) {
      throw new InvalidRequestError(error.message, this.constructor.name);
    } else {
      throw new InvalidRequestError(`Unknown error: ${error}`, this.constructor.name);
    }
  }
}

```

