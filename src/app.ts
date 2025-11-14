import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import basicAuth from '@fastify/basic-auth';
import cors from '@fastify/cors';
import { apiRoutes } from './routes/api.js';
import { adminRoutes } from './routes/admin.js';
import { rateLimitConfig, corsConfig } from './middleware/auth.js';
import { ConfigManager } from './config/manager.js';
import DatabaseManager from './database/db.js';
import { StorageManager } from './storage/manager.js';
import fastifyStatic from '@fastify/static';
import path from 'path';

// 初始化配置管理器
const configManager = ConfigManager.getInstance();

// 创建 Fastify 应用实例
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  }
});

// 注册插件
async function registerPlugins() {
  // CORS
  await fastify.register(cors, corsConfig);

  // 速率限制
  await fastify.register(rateLimit, {
    ...rateLimitConfig,
    max: configManager.getRateLimit()
  });

  // 文件上传
  await fastify.register(multipart, {
    limits: {
      fileSize: configManager.getUploadLimit()
    }
  });

  // 管理后台 Basic Auth
  await fastify.register(basicAuth, {
    validate: async (username, password, _req, _reply) => {
      // 从配置管理器获取管理员账号密码
      const adminUser = configManager.getAdminUser();
      const adminPass = configManager.getAdminPassword();
      if (username === adminUser && password === adminPass) {
        return;
      }
      throw new Error('Invalid credentials');
    },
    authenticate: true
  });
}

// 注册路由
async function registerRoutes() {
  // API 路由
  await fastify.register(apiRoutes);
  
  // 管理后台路由
  await fastify.register(adminRoutes);

  // 健康检查
  fastify.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  // 引入静态文件服务
  fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'src/public'),
    prefix: '/',
    decorateReply: false
  });
}

// 错误处理
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);
  
  if ((error as any).statusCode === 429) {
    return reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded'
    });
  }
  
  if ((error as any).statusCode === 413) {
    return reply.status(413).send({
      error: 'Payload Too Large',
      message: 'File size exceeds limit'
    });
  }
  
  return reply.status((error as any).statusCode || 500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : (error as any).message || 'Unknown error'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库和存储管理器
    console.log('🔄 Initializing database...');
    DatabaseManager.getInstance();
    console.log('✅ Database initialized successfully');
    
    console.log('🔄 Loading storage adapters...');
    StorageManager.getInstance();
    console.log('✅ Storage initialized successfully');

    await registerPlugins();
    await registerRoutes();

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    
    fastify.log.info(`🚀 Server running on http://${host}:${port}`);
    fastify.log.info('📊 Database initialized successfully');
    fastify.log.info('💾 Storage adapters loaded');
    
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
});


startServer();

export default fastify;