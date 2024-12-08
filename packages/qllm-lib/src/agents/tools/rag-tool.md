// src/tools/dynamic-rag-tool.ts
import { Document as LlamaDocument } from '@llamaindex/core/models';
import { 
  VectorStoreIndex, 
  serviceContextFromDefaults,
  SimpleNodeParser,
  OpenAIEmbedding,
  SimilarityPostProcessor,
  SimpleDirectoryReader
} from '@llamaindex/core';
import { AgentTool } from '../agent-types'; 

export interface DynamicRAGConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  similarityThreshold?: number;
  maxResults?: number;
  embedModel?: string;
  modelName?: string;
}

export class DynamicRAGTool implements AgentTool {
  name = 'dynamic_rag';
  description = 'Search through documents using RAG with advanced retrieval capabilities';
  
  private index: VectorStoreIndex;
  private nodeParser: SimpleNodeParser;
  private documents: LlamaDocument[] = [];

  constructor(private config: DynamicRAGConfig = {}) {
    const serviceContext = serviceContextFromDefaults({
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 50,
      llm: {
        model: config.modelName || 'gpt-4',
        temperature: 0.7,
      },
      embedModel: new OpenAIEmbedding({
        model: config.embedModel || 'text-embedding-ada-002',
      }),
    });

    this.nodeParser = new SimpleNodeParser({
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 50,
    });
  }

  parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant information'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 3
      }
    },
    required: ['query']
  };

  async loadFromDirectory(directoryPath: string): Promise<void> {
    const reader = new SimpleDirectoryReader();
    const documents = await reader.loadData({
      directoryPath,
      recursive: true
    });
    
    this.documents = documents;
    const nodes = this.nodeParser.getNodesFromDocuments(documents);
    this.index = await VectorStoreIndex.fromDocuments(documents);
  }

  async loadDocuments(documents: string[]): Promise<void> {
    const llamaDocs = documents.map((content, index) => 
      new LlamaDocument({ text: content, id_: `doc_${index}` })
    );

    this.documents = [...this.documents, ...llamaDocs];
    const nodes = this.nodeParser.getNodesFromDocuments(llamaDocs);
    this.index = await VectorStoreIndex.fromDocuments(llamaDocs);
  }

  async execute({ query, maxResults = 3 }: { query: string; maxResults?: number }): Promise<string> {
    const queryEngine = this.index.asQueryEngine({
      similarityTopK: maxResults,
      postProcessors: [
        new SimilarityPostProcessor({
          similarityCutoff: this.config.similarityThreshold || 0.7
        })
      ]
    });

    const response = await queryEngine.query({
      query,
      mode: 'hybrid'
    });

    return response.response;
  }
}