# OmoePic API 文档

## 概述

OmoePic 是一个基于 Fastify 的图床服务，提供图片上传、秒传、图片代理和管理功能。

**基础信息**
- 服务地址: `http://localhost:3000` (开发环境)
- 默认端口: `3000`
- API 版本: `v1.0.0`

## 认证方式

### 1. 用户令牌认证
用于普通用户上传和操作图片
- **Header**: `X-User-Token`
- **格式**: 1-32位字母数字组合
- **示例**: `X-User-Token: user123token456`

### 2. 管理后台认证
用于管理后台操作
- **认证方式**: Basic Auth
- **默认账号**: `admin` / `admin123`
- **Header**: `Authorization: Basic YWRtaW46YWRtaW4xMjM=`

## API 端点

### 公共接口

#### 1. 健康检查
```http
GET /health
```
**响应示例**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### 2. 服务信息
```http
GET /
```
**响应示例**
```json
{
  "message": "OmoePic Image Hosting Service",
  "version": "1.0.0",
  "endpoints": {
    "upload": "POST /api/upload",
    "check": "GET /api/check/:md5",
    "image": "GET /i/:uid",
    "admin": "GET/POST/PUT/DELETE /api/admin/*"
  }
}
```

### 图片上传相关

#### 1. 秒传检查
```http
GET /api/check/:md5
```
**参数**
- `md5`: 文件的 MD5 哈希值 (32位十六进制)

**响应示例 - 文件已存在**
```json
{
  "exists": true,
  "uid": "1234567890123456789",
  "url": "http://localhost:3000/i/1234567890123456789"
}
```

**响应示例 - 文件不存在**
```json
{
  "exists": false
}
```

#### 2. 图片上传
```http
POST /api/upload
```
**Headers**
```
Content-Type: multipart/form-data
X-User-Token: your-user-token
```

**Body** (multipart/form-data)
- `file`: 图片文件 (支持 jpg, png, gif, webp)

**响应示例 - 成功**
```json
{
  "success": true,
  "uid": "1234567890123456789",
  "md5": "d41d8cd98f00b204e9800998ecf8427e",
  "size": 1024,
  "type": "image/jpeg",
  "url": "http://localhost:3000/i/1234567890123456789",
  "message": "Upload successful"
}
```

**响应示例 - 失败**
```json
{
  "success": false,
  "error": "File size exceeds limit",
  "message": "File size exceeds 10MB limit"
}
```

#### 3. 图片访问
```http
GET /i/:uid
```
**参数**
- `uid`: 图片的唯一标识符

**响应**
- 直接返回图片二进制流
- 支持缓存和重定向

### 管理后台接口

#### 1. 图片列表
```http
GET /api/admin/images
```
**查询参数**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `token`: 按用户令牌筛选
- `start_time`: 开始时间戳
- `end_time`: 结束时间戳

**Headers**
```
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "uid": "1234567890123456789",
        "md5": "d41d8cd98f00b204e9800998ecf8427e",
        "token": "user123",
        "size": 1024,
        "type": "image/jpeg",
        "storage_id": 1,
        "time": 1704067200000,
        "url": "http://localhost:3000/i/1234567890123456789"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### 2. 批量删除图片
```http
DELETE /api/admin/images
```
**Headers**
```
Authorization: Basic YWRtaW46YWRtaW4xMjM=
Content-Type: application/json
```

**Body**
```json
{
  "uids": ["1234567890123456789", "9876543210987654321"]
}
```

**响应示例**
```json
{
  "success": true,
  "deleted": 2,
  "message": "2 images deleted successfully"
}
```

#### 3. 系统统计
```http
GET /api/admin/stats
```
**Headers**
```
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "total_images": 150,
    "total_size": 157286400,
    "today_uploads": 5,
    "storage_usage": {
      "local": {
        "images": 120,
        "size": 125829120
      },
      "webdav": {
        "images": 30,
        "size": 31457280
      }
    }
  }
}
```

#### 4. 系统配置管理

##### 获取所有配置
```http
GET /api/admin/configs
```

##### 获取单个配置
```http
GET /api/admin/configs/:key
```

##### 更新配置
```http
PUT /api/admin/configs/:key
```
**Body**
```json
{
  "value": "new_value"
}
```

#### 5. 存储配置管理

##### 获取存储配置列表
```http
GET /api/admin/storage
```

##### 添加存储配置
```http
POST /api/admin/storage
```
**Body**
```json
{
  "name": "webdav-backup",
  "type": "webdav",
  "is_default": false,
  "enabled": true,
  "config": {
    "url": "https://webdav.example.com",
    "username": "user",
    "password": "pass",
    "path": "/uploads"
  }
}
```

##### 更新存储配置
```http
PUT /api/admin/storage/:id
```

##### 删除存储配置
```http
DELETE /api/admin/storage/:id
```

## 错误码说明

| 状态码 | 错误类型 | 说明 |
|--------|----------|------|
| 200 | OK | 请求成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 413 | Payload Too Large | 文件大小超限 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

## 请求限制

- **文件大小**: 默认 10MB (可配置)
- **请求频率**: 默认 100次/分钟 (可配置)
- **允许类型**: jpeg, png, gif, webp

## 前端集成示例

### JavaScript/TypeScript

```javascript
const API_BASE = 'http://localhost:3000';
const USER_TOKEN = 'your-user-token';

// 上传图片
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: {
      'X-User-Token': USER_TOKEN
    },
    body: formData
  });
  
  return await response.json();
}

// 秒传检查
async function checkFileExists(md5) {
  const response = await fetch(`${API_BASE}/api/check/${md5}`);
  return await response.json();
}

// 获取图片列表 (管理后台)
async function getImageList(page = 1, limit = 20) {
  const auth = btoa('admin:admin123');
  
  const response = await fetch(
    `${API_BASE}/api/admin/images?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  return await response.json();
}
```

### Python

```python
import requests

API_BASE = "http://localhost:3000"
USER_TOKEN = "your-user-token"

def upload_image(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        headers = {'X-User-Token': USER_TOKEN}
        
        response = requests.post(
            f"{API_BASE}/api/upload",
            files=files,
            headers=headers
        )
        
    return response.json()

def check_file_exists(md5):
    response = requests.get(f"{API_BASE}/api/check/{md5}")
    return response.json()
```

## 配置说明

### 环境变量

```bash
# 服务器配置
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# 数据库配置
DB_PATH=./data/omoe-pic.db
```

### 默认系统配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| upload_limit | 10485760 | 单文件上传限制 (10MB) |
| rate_limit | 100 | 每分钟请求限制 |
| allowed_types | image/jpeg,image/png,image/gif,image/webp | 允许的文件类型 |
| admin_username | admin | 管理员用户名 |
| admin_password | admin123 | 管理员密码 |

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持图片上传、秒传、图片代理
- 管理后台功能
- 多存储适配器支持

---

**技术支持**: 如有问题请查看项目 README.md 或提交 Issue。