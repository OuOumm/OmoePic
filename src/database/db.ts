import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库连接单例
class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;

  private constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'omoe-pic.db');
    // 确保数据库目录存在
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.initTables();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  private initTables(): void {
    // 创建 images 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        uid TEXT PRIMARY KEY,
        md5 TEXT UNIQUE NOT NULL,
        token TEXT NOT NULL,
        size INTEGER NOT NULL,
        type TEXT NOT NULL,
        storage_id INTEGER NOT NULL,
        time INTEGER NOT NULL,
        FOREIGN KEY (storage_id) REFERENCES storage_config(id)
      )
    `);

    // 创建 system_configs 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT
      )
    `);

    // 创建 storage_config 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        enabled BOOLEAN DEFAULT TRUE,
        config TEXT NOT NULL
      )
    `);

    // 插入默认配置
    this.initDefaultConfigs();
  }

  private initDefaultConfigs(): void {
    // 插入默认存储配置
    const defaultStorage = this.db.prepare(`
      INSERT OR IGNORE INTO storage_config (name, type, is_default, enabled, config)
      VALUES (?, ?, ?, ?, ?)
    `);

    defaultStorage.run('local', 'local', 1, 1, JSON.stringify({ path: './uploads' }));

    // 插入系统默认配置
    const defaultConfigs = this.db.prepare(`
      INSERT OR IGNORE INTO system_configs (key, value, type, description)
      VALUES (?, ?, ?, ?)
    `);

    const configs = [
      ['upload_limit', '10485760', 'number', '单文件上传大小限制(字节)'],
      ['rate_limit', '100', 'number', '每分钟请求限制'],
      ['allowed_types', 'image/jpeg,image/png,image/gif,image/webp', 'string', '允许的文件类型'],
      ['admin_username', 'admin', 'string', '管理员用户名'],
      ['admin_password', 'admin123', 'string', '管理员密码'],
    ];

    configs.forEach(config => defaultConfigs.run(...config));
  }
}

export default DatabaseManager;