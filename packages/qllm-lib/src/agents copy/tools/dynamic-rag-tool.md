


/* // src/tools/rag/dynamic-rag-tool.ts
import { BaseAgent } from '../../agents/base-agent';
import { AgentTool, AgentToolResult } from '../../agents/agent-types';
import { VectorStore, Document, ServiceContext, storageContextFromDefaults } from 'llamaindex';

export class DynamicRAGTool implements AgentTool {
  private vectorStore: VectorStore | null = null;
  
  constructor(
    private agent: BaseAgent,
    private config: {
      chunkSize?: number;
      chunkOverlap?: number;
    } = {}
  ) {
    this.name = 'dynamic_rag';
    this.description = 'Dynamic RAG tool for document search and retrieval';
  }

  name: string;
  description: string;

  async loadDocuments(documents: string[] | Document[]): Promise<void> {
    const serviceContext = ServiceContext.fromDefaults({
      chunkSize: this.config.chunkSize || 1024,
      chunkOverlap: this.config.chunkOverlap || 20
    });

    const storageContext = await storageContextFromDefaults({});
    
    const docs = Array.isArray(documents) 
      ? documents 
      : documents.map(doc => new Document({ text: doc }));

    this.vectorStore = await VectorStore.fromDocuments(
      docs,
      serviceContext,
      storageContext
    );
  }

  async execute(inputs: { 
    query: string;
    topK?: number;
    documents?: string[];
  }): Promise<AgentToolResult> {
    try {
      // Load new documents if provided
      if (inputs.documents) {
        await this.loadDocuments(inputs.documents);
      }

      if (!this.vectorStore) {
        return {
          success: false,
          output: null,
          error: 'No documents loaded in the vector store'
        };
      }

      const results = await this.vectorStore.similaritySearch(
        inputs.query,
        inputs.topK || 3
      );

      return {
        success: true,
        output: results.map(node => ({
          content: node.text,
          score: node.score
        }))
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error.message
      };
    }
  }
} */