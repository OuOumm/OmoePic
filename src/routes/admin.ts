import { FastifyInstance } from 'fastify';
import { ImageService } from '../services/image.js';
import { ConfigManager } from '../config/manager.js';
import { StorageManager } from '../storage/manager.js';
import { adminBasicAuth } from '../middleware/auth.js';

const imageService = new ImageService();
const configManager = ConfigManager.getInstance();
const storageManager = StorageManager.getInstance();

export async function adminRoutes(fastify: FastifyInstance) {
  // 管理后台认证
  fastify.register(async (fastify) => {
    fastify.addHook('preHandler', adminBasicAuth);

    // 图片列表查询
    fastify.post('/api/admin/images', {
      schema: {
        body: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            sort: { type: 'string', enum: ['uid', 'time', 'size'], default: 'time' },
            order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          }
        }
      }
    }, async (request, _reply) => {
      const { page, limit, sort, order } = request.body as any;
      return imageService.getImages(page, limit, sort, order);
    });

    // 批量删除图片
    fastify.delete('/api/admin/images', {
      schema: {
        body: {
          type: 'object',
          properties: {
            uids: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1
            }
          },
          required: ['uids']
        }
      }
    }, async (request, _reply) => {
      const { uids } = request.body as { uids: string[] };
      const result = await imageService.deleteImages(uids);
      return result;
    });

    // 系统统计
    fastify.get('/api/admin/stats', async (_request, _reply) => {
      return imageService.getStats();
    });

    // 获取系统配置
    fastify.get('/api/admin/config', async (_request, _reply) => {
      const configs = configManager.getAll();
      const configArray = Array.from(configs.entries()).map(([key, value]) => ({
        key,
        value,
        type: typeof value
      }));
      return { configs: configArray };
    });

    // 更新系统配置
    fastify.put('/api/admin/config', {
      schema: {
        body: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
            type: { type: 'string', enum: ['string', 'number', 'boolean', 'object'] },
            description: { type: 'string' }
          },
          required: ['key', 'value']
        }
      }
    }, async (request, _reply) => {
      const { key, value, type = 'string', description } = request.body as any;
      
      configManager.set(key, value, type, description);
      
      return { 
        success: true, 
        message: 'Configuration updated successfully' 
      };
    });

    // 获取存储配置列表
    fastify.get('/api/admin/storage', async (_request, _reply) => {
      const db = (await import('../database/db.js')).default.getInstance().getDatabase();
      const storageConfigs = db.prepare('SELECT * FROM storage_config').all();
      
      const adapters = storageManager.getAllAdapters();
      const adapterStatus = Array.from(adapters.entries()).map(([name, adapter]) => ({
        name: adapter.name,
        type: adapter.type,
        enabled: adapter.enabled,
        isDefault: storageManager.getDefaultAdapter()?.name === name
      }));

      return {
        configs: storageConfigs,
        adapters: adapterStatus
      };
    });

    // 添加存储配置
    fastify.post('/api/admin/storage', {
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['local', 'webdav'] },
            is_default: { type: 'boolean', default: false },
            enabled: { type: 'boolean', default: true },
            config: { type: 'object' }
          },
          required: ['name', 'type', 'config']
        }
      }
    }, async (request, _reply) => {
      const { name, type, is_default, enabled, config } = request.body as any;
      
      const db = (await import('../database/db.js')).default.getInstance().getDatabase();
      
      // 如果设置为默认，先取消其他默认设置
      if (is_default) {
        db.prepare('UPDATE storage_config SET is_default = FALSE WHERE is_default = TRUE').run();
      }
      
      const stmt = db.prepare(`
        INSERT INTO storage_config (name, type, is_default, enabled, config)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(name, type, is_default, enabled, JSON.stringify(config));
      
      // 刷新存储管理器
      storageManager.refresh();
      
      return { 
        success: true, 
        message: 'Storage configuration added successfully' 
      };
    });

    // 更新存储配置
    fastify.put('/api/admin/storage/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['local', 'webdav'] },
            is_default: { type: 'boolean' },
            enabled: { type: 'boolean' },
            config: { type: 'object' }
          }
        }
      }
    }, async (request, _reply) => {
      const { id } = request.params as any;
      const { name, type, is_default, enabled, config } = request.body as any;
      
      const db = (await import('../database/db.js')).default.getInstance().getDatabase();
      
      // 如果设置为默认，先取消其他默认设置
      if (is_default) {
        db.prepare('UPDATE storage_config SET is_default = FALSE WHERE is_default = TRUE').run();
      }
      
      const stmt = db.prepare(`
        UPDATE storage_config 
        SET name = ?, type = ?, is_default = ?, enabled = ?, config = ?
        WHERE id = ?
      `);
      
      stmt.run(name, type, is_default, enabled, JSON.stringify(config), id);
      
      // 刷新存储管理器
      storageManager.refresh();
      
      return { 
        success: true, 
        message: 'Storage configuration updated successfully' 
      };
    });

    // 删除存储配置
    fastify.delete('/api/admin/storage/:id', {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      }
    }, async (request, reply) => {
      const { id } = request.params as any;
      
      const db = (await import('../database/db.js')).default.getInstance().getDatabase();
      
      // 检查是否有图片使用此存储
      const imageCount = db.prepare('SELECT COUNT(*) as count FROM images WHERE storage_id = ?').get(id) as { count: number };
      
      if (imageCount.count > 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot delete storage configuration that is being used by images'
        });
      }
      
      db.prepare('DELETE FROM storage_config WHERE id = ?').run(id);
      
      // 刷新存储管理器
      storageManager.refresh();
      
      return { 
        success: true, 
        message: 'Storage configuration deleted successfully' 
      };
    });
  });
}