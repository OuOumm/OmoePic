import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigManager } from '../config/manager';

const configManager = ConfigManager.getInstance();

// 用户令牌验证中间件
export const userTokenAuth = async (request: FastifyRequest, reply: FastifyReply) => {

  const token = request.headers['x-user-token'] as string;
  
  if (!token) {
    return reply.status(401).send({ 
      error: 'Unauthorized', 
      message: 'X-User-Token header is required' 
    });
  }

  // 验证令牌格式：不超过32位即可
  if (token.length > 32) {
    return reply.status(400).send({ 
      error: 'Bad Request', 
      message: 'Invalid token format. Must be max 32 characters' 
    });
  }

  // 将令牌添加到请求对象中，供后续使用
  (request as any).userToken = token;
};

// 管理后台 Basic Auth 中间件
export const adminBasicAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new Error('Missing or invalid Basic auth header');
    }
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (!username || !password) {
      throw new Error('Invalid Basic auth format');
    }
    // 验证用户名和密码
    if (username !== configManager.getAdminUser() || password !== configManager.getAdminPassword()) {
      throw new Error('Invalid credentials');
    }
  } catch (err) {
    reply.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Admin authentication required' 
    });
  }
};

// 速率限制配置
export const rateLimitConfig = {
  max: configManager.getRateLimit(), // 每分钟最大请求数
  timeWindow: '1 minute',
  keyGenerator: (request: FastifyRequest) => {
    // 基于IP和用户令牌进行限流
    const token = request.headers['x-user-token'] as string;
    return `${request.ip}-${token || 'anonymous'}`;
  }
};

// CORS 配置
export const corsConfig = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-User-Token', 'Authorization']
};