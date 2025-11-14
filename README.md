# OmoePic - 基于 Fastify 的现代化图床

一个基于 Fastify 5.6.2 和 TypeScript 开发的高性能图床服务，支持多存储、秒传、图片代理等功能，采用模块化设计，易于扩展和维护。

## ✨ 特性

- 🚀 **高性能**: 基于 Fastify 5.6.2，提供极致的性能表现
- 📦 **模块化设计**: 插件化架构，支持热插拔存储适配器
- 💾 **多存储**: 支持本地存储、WebDAV 等多种存储方案
- 🔄 **秒传功能**: 基于 MD5 的文件去重，节省存储空间
- 🔒 **安全认证**: 用户令牌验证 + 管理后台 Basic Auth 双重保护
- 📊 **管理后台**: 完整的图片管理和系统配置界面
- 🛡️ **速率限制**: 智能限流，防止恶意请求和滥用
- 🔍 **实时监控**: 系统统计和性能监控
- 📱 **响应式设计**: 管理后台支持移动端访问

## 🛠️ 技术栈

### 核心框架
- **框架**: Fastify 5.6.2 (高性能 Node.js Web 框架)
- **语言**: TypeScript 5.x (类型安全的 JavaScript 超集)
- **运行时**: Node.js 18+ (ES 模块支持)

### 数据存储
- **数据库**: SQLite3 (better-sqlite3 驱动)
- **缓存**: Redis (ioredis 客户端，可选)

### 开发工具
- **包管理器**: pnpm (快速、节省磁盘空间的包管理)
- **构建工具**: TypeScript Compiler + tsx (开发时热重载)
- **代码规范**: ESLint + TypeScript ESLint

### 核心依赖
- **文件上传**: @fastify/multipart
- **静态文件**: @fastify/static
- **安全认证**: @fastify/basic-auth
- **跨域支持**: @fastify/cors
- **速率限制**: @fastify/rate-limit
- **唯一ID生成**: @sapphire/snowflake
- **WebDAV 支持**: webdav 客户端

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **pnpm**: 8.0.0 或更高版本
- **SQLite3**: 系统级支持
- **Redis** (可选): 用于缓存功能

### 1. 克隆项目

```bash
git clone <项目地址>
cd OmoePic
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 开发模式运行

```bash
# 使用 tsx 进行热重载开发
pnpm dev
```

服务器将在 `http://localhost:3000` 启动

### 4. 生产环境构建和运行

```bash
# 构建 TypeScript 代码
pnpm build

# 启动生产服务器
pnpm start
```

### 5. 代码检查和修复

```bash
# 检查代码规范
pnpm lint

# 自动修复代码问题
pnpm lint:fix
```

## ⚙️ 环境变量配置

创建 `.env` 文件来配置环境变量：

```bash
# ========================
# 服务器配置
# ========================

# 服务器端口 (默认: 3000)
PORT=3000

# 服务器绑定地址 (默认: 0.0.0.0)
HOST=0.0.0.0

# 运行环境 (development/production)
NODE_ENV=development

# ========================
# 管理后台认证
# ========================

# 管理后台用户名 (生产环境请修改)
ADMIN_USERNAME=admin

# 管理后台密码 (生产环境请修改)
ADMIN_PASSWORD=admin123

# ========================
# 数据库配置
# ========================

# SQLite 数据库文件路径 (默认: ./data/omoe-pic.db)
DB_PATH=./data/omoe-pic.db

# ========================
# Redis 缓存配置 (可选)
# ========================

# Redis 连接地址 (默认: redis://localhost:6379)
REDIS_URL=redis://localhost:6379

# Redis 数据库编号 (默认: 0)
REDIS_DB=0

# ========================
# 文件上传配置
# ========================

# 最大文件大小 (默认: 10MB)
MAX_FILE_SIZE=10485760

# 允许的文件类型 (默认: 图片类型)
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp

# ========================
# 安全配置
# ========================

# 速率限制 - 每分钟最大请求数
RATE_LIMIT_MAX=100

# 速率限制 - 时间窗口 (分钟)
RATE_LIMIT_TIME_WINDOW=1
```

## 📚 API 文档

### 🔑 认证方式

#### 用户令牌认证
- **Header**: `X-User-Token: your_token`
- **用途**: 文件上传等用户操作

#### 管理后台认证
- **认证方式**: HTTP Basic Auth
- **用户名**: `ADMIN_USERNAME` 环境变量
- **密码**: `ADMIN_PASSWORD` 环境变量

### 📤 核心功能 API

#### 1. 秒传检查
```http
GET /api/check/:md5
```
检查文件是否已存在，避免重复上传。

**参数:**
- `md5`: 文件的 MD5 哈希值

**响应:**
```json
{
  "exists": true,
  "uid": "图片唯一标识",
  "url": "图片访问地址"
}
```

#### 2. 文件上传
```http
POST /api/upload
Headers: 
  X-User-Token: your_token
  Content-Type: multipart/form-data
```
上传图片文件到指定存储。

**参数:**
- `file`: 图片文件 (multipart/form-data)
- `storage` (可选): 指定存储名称

**响应:**
```json
{
  "success": true,
  "uid": "图片唯一标识",
  "url": "图片访问地址",
  "size": 文件大小,
  "md5": "文件MD5哈希"
}
```

#### 3. 图片代理
```http
GET /i/:uid
```
根据 UID 获取图片内容，支持缓存和格式转换。

**参数:**
- `uid`: 图片唯一标识

**响应:** 图片二进制数据

### 🔧 管理后台 API

所有管理接口需要 Basic Auth 认证。

#### 1. 图片管理
```http
POST /api/admin/images
```
获取图片列表，支持分页、搜索和排序。

**请求体:**
```json
{
  "page": 1,
  "pageSize": 20,
  "search": "搜索关键词",
  "sortBy": "time",
  "sortOrder": "desc"
}
```

#### 2. 批量删除图片
```http
DELETE /api/admin/images
```
批量删除指定 UID 的图片。

**请求体:**
```json
{
  "uids": ["uid1", "uid2", "uid3"]
}
```

#### 3. 系统统计
```http
GET /api/admin/stats
```
获取系统运行统计信息。

**响应:**
```json
{
  "totalImages": 1000,
  "totalSize": "1.2 GB",
  "storageUsage": {
    "local": {"count": 800, "size": "800 MB"},
    "webdav": {"count": 200, "size": "400 MB"}
  },
  "uploadStats": {
    "today": 50,
    "week": 300,
    "month": 1200
  }
}
```

#### 4. 配置管理
```http
GET /api/admin/config
PUT /api/admin/config
```
获取和更新系统运行时配置。

#### 5. 存储配置管理
```http
GET /api/admin/storage
POST /api/admin/storage
PUT /api/admin/storage/:id
DELETE /api/admin/storage/:id
```
管理存储配置，支持动态添加和修改存储适配器。

## 数据库设计

### images 表
存储图片元数据
- `uid` (主键): 图片唯一标识
- `md5` (唯一): 文件 MD5 哈希
- `token`: 上传用户令牌
- `size`: 文件大小
- `type`: MIME 类型
- `storage_id`: 存储 ID
- `time`: 上传时间戳

### system_configs 表
系统配置缓存
- `key` (主键): 配置键
- `value`: 配置值
- `type`: 值类型
- `description`: 配置描述

### storage_config 表
存储配置
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

## 🛠️ 开发指南

### 📁 项目结构

```
OmoePic/
├── src/                    # 源代码目录
│   ├── app.ts             # 应用入口和服务器配置
│   ├── config/            # 配置管理模块
│   │   └── manager.ts     # 配置管理器
│   ├── database/          # 数据库相关
│   │   └── db.ts          # 数据库连接和初始化
│   ├── middleware/        # 中间件
│   │   └── auth.ts        # 认证中间件
│   ├── models/           # 数据模型
│   │   └── types.ts       # TypeScript 类型定义
│   ├── public/           # 静态文件
│   │   ├── admin.html    # 管理后台页面
│   │   ├── history.html  # 历史记录页面
│   │   ├── index.html    # 首页
│   │   ├── js/           # 前端 JavaScript
│   │   └── sw.js         # Service Worker
│   ├── routes/           # API 路由
│   │   ├── admin.ts      # 管理后台路由
│   │   └── api.ts        # 核心 API 路由
│   ├── services/         # 业务逻辑服务
│   │   └── image.ts      # 图片处理服务
│   └── storage/          # 存储适配器
│       ├── base.ts       # 存储适配器基类
│       └── manager.ts    # 存储管理器
├── docs/                 # 文档目录
│   └── API.md           # API 详细文档
├── dist/                # 构建输出目录
├── package.json         # 项目配置和依赖
├── tsconfig.json       # TypeScript 配置
├── .eslintrc.json      # ESLint 配置
├── pnpm-workspace.yaml # pnpm 工作区配置
└── README.md           # 项目说明文档
```

### 🔌 插件系统

项目采用插件化架构，核心功能通过 Fastify 插件实现：

- **认证插件**: 用户令牌和管理员认证
- **存储插件**: 多存储支持
- **路由插件**: API 路由注册
- **静态文件插件**: 前端页面服务

### 添加新的存储适配器

1. 在 `src/storage/base.ts` 中实现 `StorageAdapter` 接口
2. 在 `src/storage/manager.ts` 的 `createAdapter` 方法中添加适配器创建逻辑
3. 更新 `StorageConfig` 类型定义

### 自定义配置

系统启动时自动从数据库加载配置到内存缓存，可通过管理后台实时更新。

## 🚀 部署指南

### 📦 传统部署

#### 1. 服务器准备
```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 SQLite3
sudo apt-get install sqlite3

# 安装 Redis (可选)
sudo apt-get install redis-server
```

#### 2. 项目部署
```bash
# 克隆项目
git clone <项目地址> /opt/omoe-pic
cd /opt/omoe-pic

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 启动服务
pnpm start
```

### 🐳 Docker 部署

#### Dockerfile
```dockerfile
FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache sqlite

# 设置工作目录
WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 和依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm build

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["pnpm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  omoe-pic:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/omoe-pic.db
    restart: unless-stopped

  # Redis 服务 (可选)
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
```

### ☁️ 云平台部署

#### PM2 进程管理
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 保存配置
pm2 save
pm2 startup
```

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'omoe-pic',
    script: './dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## 🤝 贡献指南

### 开发流程

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/amazing-feature`)
3. **提交更改** (`git commit -m 'Add amazing feature'`)
4. **推送分支** (`git push origin feature/amazing-feature`)
5. **创建 Pull Request**

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 添加适当的类型注释
- 编写单元测试
- 更新相关文档

### 问题报告

请使用 GitHub Issues 报告 bug 或提出功能建议。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：
- [Fastify](https://fastify.dev/) - 高性能 Web 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [SQLite](https://sqlite.org/) - 轻量级数据库
- [pnpm](https://pnpm.io/) - 快速包管理器

---

## 📞 支持与联系

如果您在使用过程中遇到问题或有改进建议，欢迎通过以下方式联系：

- **GitHub Issues**: [提交问题报告](https://github.com/OuOumm/OmoePic/issues)
- **文档**: 查看 [docs/API.md](docs/API.md) 获取详细 API 文档
- **示例**: 参考项目中的示例配置和用法

---

**OmoePic** - 现代化图床后端解决方案 🚀

*让图片存储和管理变得简单高效*