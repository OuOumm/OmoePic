import fs from 'fs/promises';
import path from 'path';

// 存储适配器基础接口
export interface StorageAdapter {
  name: string;
  type: string;
  enabled: boolean;
  
  // 文件操作
  writeFile(filename: string, data: Buffer): Promise<void>;
  readFile(filename: string): Promise<Buffer>;
  deleteFile(filename: string): Promise<void>;
  exists(filename: string): Promise<boolean>;
  
  // 获取文件URL
  getFileUrl(filename: string): string;
}

// 本地存储适配器
export class LocalStorageAdapter implements StorageAdapter {
  public readonly name: string;
  public readonly type = 'local';
  public enabled: boolean;
  private basePath: string;

  constructor(name: string, config: { path: string }, enabled: boolean = true) {
    this.name = name;
    this.basePath = path.resolve(config.path);
    this.enabled = enabled;
  }

  private getFullPath(filename: string): string {
    return path.join(this.basePath, filename);
  }

  async writeFile(filename: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(filename);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async readFile(filename: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filename);
    return await fs.readFile(fullPath);
  }

  async deleteFile(filename: string): Promise<void> {
    const fullPath = this.getFullPath(filename);
    await fs.unlink(fullPath);
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filename);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(filename: string): string {
    return `/i/${filename}`;
  }
}

// WebDAV 存储适配器
export class WebDAVStorageAdapter implements StorageAdapter {
  public readonly name: string;
  public readonly type = 'webdav';
  public enabled: boolean;
  private client: any;
  private baseUrl: string;

  constructor(name: string, config: { 
    url: string; 
    username?: string; 
    password?: string;
    basePath?: string;
  }, enabled: boolean = true) {
    this.name = name;
    this.enabled = enabled;
    this.baseUrl = config.url;
    
    // 动态导入 webdav 客户端
    import('webdav').then(webdav => {
      this.client = webdav.createClient(config.url, {
        username: config.username || '',
        password: config.password || ''
      });
    });
  }

  private getRemotePath(filename: string): string {
    return filename; // WebDAV 使用相对路径
  }

  async writeFile(filename: string, data: Buffer): Promise<void> {
    const remotePath = this.getRemotePath(filename);
    await this.client.putFileContents(remotePath, data);
  }

  async readFile(filename: string): Promise<Buffer> {
    const remotePath = this.getRemotePath(filename);
    const arrayBuffer = await this.client.getFileContents(remotePath, { format: 'binary' });
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(filename: string): Promise<void> {
    const remotePath = this.getRemotePath(filename);
    await this.client.deleteFile(remotePath);
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const remotePath = this.getRemotePath(filename);
      await this.client.stat(remotePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }
}