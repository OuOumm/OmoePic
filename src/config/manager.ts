import DatabaseManager from '../database/db.js';
import { SystemConfig } from '../models/types.js';

// 全局配置缓存
const configCache: Map<string, any> = new Map();

export class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {
    this.loadAllConfigs();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadAllConfigs(): void {
    const db = DatabaseManager.getInstance().getDatabase();
    const configs = db.prepare('SELECT * FROM system_configs').all() as SystemConfig[];
    
    configs.forEach(config => {
      configCache.set(config.key, this.parseConfigValue(config.value, config.type));
    });
  }

  private parseConfigValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  public get<T = any>(key: string): T | undefined {
    return configCache.get(key);
  }

  public set(key: string, value: any, type: string = 'string', description?: string): void {
    const db = DatabaseManager.getInstance().getDatabase();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO system_configs (key, value, type, description)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(key, stringValue, type, description);
    configCache.set(key, value);
  }

  public getAll(): Map<string, any> {
    return new Map(configCache);
  }

  public delete(key: string): void {
    const db = DatabaseManager.getInstance().getDatabase();
    const stmt = db.prepare('DELETE FROM system_configs WHERE key = ?');
    stmt.run(key);
    configCache.delete(key);
  }

  public refresh(): void {
    configCache.clear();
    this.loadAllConfigs();
  }

  // 获取常用配置的便捷方法
  public getUploadLimit(): number {
    return this.get<number>('upload_limit') || 10 * 1024 * 1024; // 默认10MB
  }

  public getAllowedTypes(): string[] {
    const types = this.get<string>('allowed_types') || 'image/jpeg,image/png,image/gif,image/webp';
    return types.split(',').map(t => t.trim());
  }

  public getRateLimit(): number {
    return this.get<number>('rate_limit') || 100;
  }

  public getAdminUser(): string {
    return this.get<string>('admin_username') || 'admin';
  }

  public getAdminPassword(): string {
    return this.get<string>('admin_password') || 'admin123';
  }
}