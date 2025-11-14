# OmoePic - 基于 Fastify 的图床后端

一个基于 Fastify 5.6.2 和 TypeScript 开发的现代化图床后端服务，支持多存储后端、秒传、图片代理等功能。

## 特性

- 🚀 **高性能**: 基于 Fastify 5.6.2，提供极致的性能
- 📦 **模块化设计**: 插件化架构，易于扩展和维护
- 💾 **多存储后端**: 支持本地存储、WebDAV 等存储适配器
- 🔄 **秒传功能**: 基于 MD5 的文件去重
- 🔒 **安全认证**: 用户令牌验证和管理后台 Basic Auth
- 📊 **管理后台**: 完整的图片管理和系统配置界面
- 🛡️ **速率限制**: 防止恶意请求和滥用

## 技术栈

- **框架**: Fastify 5.6.2
- **语言**: TypeScript
- **数据库**: SQLite (better-sqlite3)
- **缓存**: Redis (ioredis)
- **包管理器**: pnpm

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 开发模式运行

```bash
pnpm dev
```

### 3. 生产环境构建和运行

```bash
pnpm build
pnpm start
```

## 环境变量

```bash
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 管理后台认证 (生产环境请修改)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## API 文档

### 核心功能

#### 1. 秒传检查
```http
GET /api/check/:md5
```
检查文件是否已存在，返回文件信息或不存在状态。

#### 2. 文件上传
```http
POST /api/upload
Headers: X-User-Token: your_token
Content-Type: multipart/form-data
```
上传图片文件，支持指定存储后端。

#### 3. 图片代理
```http
GET /i/:uid
```
根据 UID 获取图片内容。

### 管理后台

所有管理接口需要 Basic Auth 认证。

#### 1. 图片管理
```http
POST /api/admin/images
```
获取图片列表，支持分页和排序。

#### 2. 批量删除
```http
DELETE /api/admin/images
```
批量删除指定 UID 的图片。

#### 3. 系统统计
```http
GET /api/admin/stats
```
获取系统统计信息。

#### 4. 配置管理
```http
GET /api/admin/config
PUT /api/admin/config
```
获取和更新系统配置。

#### 5. 存储配置
```http
GET /api/admin/storage
POST /api/admin/storage
PUT /api/admin/storage/:id
DELETE /api/admin/storage/:id
```
管理存储后端配置。

## 数据库设计

### images 表
存储图片元数据
- `uid` (主键): 图片唯一标识
- `md5` (唯一): 文件 MD5 哈希
- `token`: 上传用户令牌
- `size`: 文件大小
- `type`: MIME 类型
- `storage_id`: 存储后端 ID
- `time`: 上传时间戳

### system_configs 表
系统配置缓存
- `key` (主键): 配置键
- `value`: 配置值
- `type`: 值类型
- `description`: 配置描述

### storage_config 表
存储后端配置
- `id` (主键): 配置 ID
- `name` (唯一): 存储名称
- `type`: 存储类型 (local/webdav)
- `is_default`: 是否默认存储
- `enabled`: 是否启用
- `config`: JSON 格式的存储配置

## 存储适配器

### 本地存储 (local)
```json
{
  "path": "./uploads"
}
```

### WebDAV 存储
```json
{
  "url": "https://your-webdav-server.com",
  "username": "username",
  "password": "password",
  "basePath": "/images"
}
```

## 开发指南

### 项目结构
```
src/
├── app.ts              # 应用入口
├── config/             # 配置管理
├── database/           # 数据库连接
├── middleware/         # 中间件
├── models/             # 数据模型
├── routes/             # API 路由
├── services/           # 业务逻辑
└── storage/            # 存储适配器
```

### 添加新的存储适配器

1. 在 `src/storage/base.ts` 中实现 `StorageAdapter` 接口
2. 在 `src/storage/manager.ts` 的 `createAdapter` 方法中添加适配器创建逻辑
3. 更新 `StorageConfig` 类型定义

### 自定义配置

系统启动时自动从数据库加载配置到内存缓存，可通过管理后台实时更新。

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- SQLite3
- Redis (可选，用于缓存)

## 许可证

MIT License