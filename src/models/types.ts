// 图片元数据接口
export interface Image {
  uid: string;
  md5: string;
  token: string;
  size: number;
  type: string;
  storage_id: number;
  time: number;
}

// 系统配置接口
export interface SystemConfig {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
}

// 存储配置接口
export interface StorageConfig {
  id: number;
  name: string;
  type: 'local' | 'webdav' | 's3';
  is_default: boolean;
  enabled: boolean;
  config: Record<string, any>;
}

// 上传请求接口
export interface UploadRequest {
  file: Buffer;
  filename: string;
  mimetype: string;
  storage?: string;
  token: string;
}

// 上传响应接口
export interface UploadResponse {
  uid: string;
  url: string;
  size: number;
  md5: string;
}

// 秒传检查响应接口
export interface CheckResponse {
  exists: boolean;
  uid?: string;
  url?: string;
}

// 分页查询参数
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// 图片查询响应
export interface ImageListResponse {
  images: Image[];
  total: number;
  page: number;
  limit: number;
}

// 系统统计信息
export interface SystemStats {
  total_images: number;
  total_size: number;
  storage_stats: Array<{
    storage_id: number;
    storage_name: string;
    image_count: number;
    total_size: number;
  }>;
}