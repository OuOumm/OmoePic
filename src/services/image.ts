import { Snowflake } from '@sapphire/snowflake';
import crypto from 'crypto';
import DatabaseManager from '../database/db.js';
import { StorageManager } from '../storage/manager.js';
import { Image, UploadRequest, UploadResponse, CheckResponse } from '../models/types.js';

// 创建雪花ID生成器 (使用2023年作为纪元)
const snowflake = new Snowflake(new Date('2023-01-01T00:00:00.000Z'));

export class ImageService {
  private db = DatabaseManager.getInstance().getDatabase();
  private storageManager = StorageManager.getInstance();

  // 生成文件UID (雪花ID + 扩展名)
  private generateUid(originalFilename: string): string {
    const id = snowflake.generate().toString();
    const ext = originalFilename.split('.').pop() || 'jpg';
    return `${id}.${ext}`;
  }

  // 计算文件MD5
  private calculateMd5(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // 秒传检查
  async checkExists(md5: string): Promise<CheckResponse> {
    const image = this.db.prepare('SELECT * FROM images WHERE md5 = ?').get(md5) as Image | undefined;
    
    if (image) {
      const adapter = this.storageManager.getAdapter();
      return {
        exists: true,
        uid: image.uid,
        url: adapter.getFileUrl(image.uid)
      };
    }
    
    return { exists: false };
  }

  // 上传图片
  async upload(request: UploadRequest): Promise<UploadResponse> {
    const { file, filename, mimetype, storage, token } = request;
    
    // 计算MD5
    const md5 = this.calculateMd5(file);
    
    // 检查是否已存在
    const existsCheck = await this.checkExists(md5);
    if (existsCheck.exists) {
      return {
        uid: existsCheck.uid!,
        url: existsCheck.url!,
        size: file.length,
        md5
      };
    }

    // 生成UID
    const uid = this.generateUid(filename);
    
    // 获取存储适配器
    const adapter = this.storageManager.getAdapter(storage);
    
    // 写入文件
    await adapter.writeFile(uid, file);
    
    // 获取存储配置ID
    const storageConfig = this.db.prepare('SELECT id FROM storage_config WHERE name = ?').get(adapter.name) as { id: number };
    
    // 保存到数据库
    const stmt = this.db.prepare(`
      INSERT INTO images (uid, md5, token, size, type, storage_id, time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      uid,
      md5,
      token,
      file.length,
      mimetype,
      storageConfig.id,
      Date.now()
    );

    return {
      uid,
      url: adapter.getFileUrl(uid),
      size: file.length,
      md5
    };
  }

  // 获取图片
  async getImage(uid: string): Promise<{ data: Buffer; mimetype: string }> {
    const image = this.db.prepare('SELECT * FROM images WHERE uid = ?').get(uid) as Image | undefined;
    
    if (!image) {
      throw new Error('Image not found');
    }

    // 获取存储配置
    const storageConfig = this.db.prepare('SELECT name FROM storage_config WHERE id = ?').get(image.storage_id) as { name: string };
    
    // 获取适配器并读取文件
    const adapter = this.storageManager.getAdapter(storageConfig.name);
    const data = await adapter.readFile(uid);
    
    return {
      data,
      mimetype: image.type
    };
  }

  // 删除图片
  async deleteImage(uid: string): Promise<void> {
    const image = this.db.prepare('SELECT * FROM images WHERE uid = ?').get(uid) as Image | undefined;
    
    if (!image) {
      throw new Error('Image not found');
    }

    // 获取存储配置
    const storageConfig = this.db.prepare('SELECT name FROM storage_config WHERE id = ?').get(image.storage_id) as { name: string };
    
    // 从存储中删除文件
    const adapter = this.storageManager.getAdapter(storageConfig.name);
    await adapter.deleteFile(uid);
    
    // 从数据库中删除记录
    this.db.prepare('DELETE FROM images WHERE uid = ?').run(uid);
  }

  // 批量删除图片
  async deleteImages(uids: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const uid of uids) {
      try {
        await this.deleteImage(uid);
        success.push(uid);
      } catch (error) {
        failed.push(uid);
      }
    }

    return { success, failed };
  }

  // 获取图片列表
  getImages(page: number = 1, limit: number = 20, sort: string = 'time', order: 'asc' | 'desc' = 'desc') {
    const offset = (page - 1) * limit;
    
    const images = this.db.prepare(`
      SELECT i.*, s.name as storage_name 
      FROM images i 
      LEFT JOIN storage_config s ON i.storage_id = s.id 
      ORDER BY ${sort} ${order.toUpperCase()} 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as (Image & { storage_name: string })[];
    
    const total = this.db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number };
    
    return {
      images,
      total: total.count,
      page,
      limit
    };
  }

  // 获取系统统计
  getStats() {
    const totalImages = this.db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number };
    const totalSize = this.db.prepare('SELECT SUM(size) as total FROM images').get() as { total: number };
    
    const storageStats = this.db.prepare(`
      SELECT 
        s.id as storage_id,
        s.name as storage_name,
        COUNT(i.uid) as image_count,
        COALESCE(SUM(i.size), 0) as total_size
      FROM storage_config s
      LEFT JOIN images i ON s.id = i.storage_id
      GROUP BY s.id, s.name
    `).all() as Array<{
      storage_id: number;
      storage_name: string;
      image_count: number;
      total_size: number;
    }>;

    return {
      total_images: totalImages.count,
      total_size: totalSize.total || 0,
      storage_stats: storageStats
    };
  }
}