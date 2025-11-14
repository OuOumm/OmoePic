import { StorageAdapter, LocalStorageAdapter, WebDAVStorageAdapter } from './base.js';
import { StorageConfig } from '../models/types.js';
import DatabaseManager from '../database/db.js';

export class StorageManager {
  private static instance: StorageManager;
  private adapters: Map<string, StorageAdapter> = new Map();
  private defaultAdapter: StorageAdapter | null = null;

  private constructor() {
    this.loadStorageConfigs();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadStorageConfigs(): void {
    const db = DatabaseManager.getInstance().getDatabase();
    const configs = db.prepare('SELECT * FROM storage_config WHERE enabled = TRUE').all() as StorageConfig[];

    configs.forEach(config => {
      try {
        const adapter = this.createAdapter(config);
        this.adapters.set(config.name, adapter);
        
        if (config.is_default) {
          this.defaultAdapter = adapter;
        }
      } catch (error) {
        console.error(`Failed to create storage adapter ${config.name}:`, error);
      }
    });

    // 如果没有默认适配器，设置第一个启用的适配器为默认
    if (!this.defaultAdapter && this.adapters.size > 0) {
      const firstAdapter = this.adapters.values().next().value;
      this.defaultAdapter = firstAdapter ?? null;
    }
  }

  private createAdapter(config: StorageConfig): StorageAdapter {
    const adapterConfig = typeof config.config === 'string' 
      ? JSON.parse(config.config) 
      : config.config;

    switch (config.type) {
      case 'local':
        return new LocalStorageAdapter(config.name, adapterConfig, config.enabled);
      case 'webdav':
        return new WebDAVStorageAdapter(config.name, adapterConfig, config.enabled);
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }

  public getAdapter(name?: string): StorageAdapter {
    if (name && this.adapters.has(name)) {
      return this.adapters.get(name)!;
    }
    
    if (this.defaultAdapter) {
      return this.defaultAdapter;
    }
    
    throw new Error('No storage adapter available');
  }

  public getAllAdapters(): Map<string, StorageAdapter> {
    return new Map(this.adapters);
  }

  public getDefaultAdapter(): StorageAdapter | null {
    return this.defaultAdapter;
  }

  public async addAdapter(config: StorageConfig): Promise<void> {
    const adapter = this.createAdapter(config);
    this.adapters.set(config.name, adapter);
    
    if (config.is_default) {
      this.defaultAdapter = adapter;
    }
  }

  public removeAdapter(name: string): void {
    this.adapters.delete(name);
    
    if (this.defaultAdapter?.name === name) {
      this.defaultAdapter = this.adapters.size > 0 
        ? this.adapters.values().next().value ?? null
        : null;
    }
  }

  public refresh(): void {
    this.adapters.clear();
    this.defaultAdapter = null;
    this.loadStorageConfigs();
  }
}