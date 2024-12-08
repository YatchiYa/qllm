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