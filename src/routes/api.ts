import { FastifyInstance } from 'fastify';
import { ImageService } from '../services/image.js';
import { userTokenAuth } from '../middleware/auth.js';
import { ConfigManager } from '../config/manager.js';

const imageService = new ImageService();
const configManager = ConfigManager.getInstance();

export async function apiRoutes(fastify: FastifyInstance) {
  // 秒传检查接口
  fastify.get('/api/check/:md5', {
    schema: {
      params: {
        type: 'object',
        properties: {
          md5: { type: 'string', pattern: '^[a-f0-9]{32}$' }
        },
        required: ['md5']
      }
    }
  }, async (request, _reply) => {
    const { md5 } = request.params as { md5: string };
    const result = await imageService.checkExists(md5);
    return result;
  });

  // 文件上传接口
  fastify.post('/api/upload', {
    preHandler: [
      userTokenAuth
    ]
  }, async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }
    // 验证文件类型
    const allowedTypes = configManager.getAllowedTypes();
    if (data.mimetype && !allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // 检查文件大小
    const uploadLimit = configManager.getUploadLimit();
    if (data.file.bytesRead > uploadLimit) {
      return reply.status(413).send({
        error: 'Payload Too Large',
        message: `File size exceeds limit of ${uploadLimit} bytes`
      });
    }

    try {
      const buffer = await data.toBuffer();
      // 对于multipart/form-data，body是undefined，storage参数应该从表单字段获取
      const storage = data.fields?.storage?.toString() || '';
      const token = (request as any).userToken;

      const result = await imageService.upload({
        file: buffer,
        filename: data.filename || '',
        mimetype: data.mimetype,
        storage: storage || '',
        token
      });

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload file'
      });
    }
  });

  // 图片代理接口
  fastify.get('/i/:uid', {
    schema: {
      params: {
        type: 'object',
        properties: {
          uid: { type: 'string' }
        },
        required: ['uid']
      }
    }
  }, async (request, reply) => {
    const { uid } = request.params as { uid: string };
    
    try {
      const { data, mimetype } = await imageService.getImage(uid);
      
      reply.header('Content-Type', mimetype);
      reply.header('Cache-Control', 'public, max-age=31536000'); // 1年缓存
      
      return data;
    } catch (error) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Image not found'
      });
    }
  });
}