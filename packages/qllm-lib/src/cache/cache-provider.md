// src/cache/cache-provider.ts
import LRU from 'lru-cache';

export class CacheProvider {
  private cache: LRU<string, any>;

  constructor(options?: { ttl?: number; maxSize?: number }) {
    this.cache = new LRU({
      max: options?.maxSize || 100,
      ttl: options?.ttl || 1000 * 60 * 60, // 1 hour default
    });
  }

  async get(key: string): Promise<any | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}