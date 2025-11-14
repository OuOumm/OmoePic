// IndexedDB 数据库操作类
class Database {
    constructor() {
        this.dbName = 'OmoePicDB';
        this.version = 1;
        this.db = null;
        this.init();
    }
    
    // 初始化数据库
    async init() {
        return new Promise((resolve, reject) => {
            // 先尝试打开数据库但不指定版本，以获取当前版本号
            const versionRequest = indexedDB.open(this.dbName);
            
            versionRequest.onsuccess = () => {
                const currentVersion = versionRequest.result.version || 1;
                versionRequest.result.close();
                
                // 使用当前版本号+1来打开数据库，确保能触发升级
                const targetVersion = currentVersion + 1;
                const request = indexedDB.open(this.dbName, targetVersion);
                
                request.onerror = () => {
                    console.error('IndexedDB 初始化失败:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB 初始化成功，版本:', this.db.version);
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const oldVersion = event.oldVersion;
                    
                    console.log('数据库升级中，旧版本:', oldVersion, '新版本:', event.newVersion);
                    
                    // 创建上传记录表（如果不存在）
                    if (!db.objectStoreNames.contains('uploads')) {
                        const uploadStore = db.createObjectStore('uploads', { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        
                        // 创建索引
                        uploadStore.createIndex('uid', 'uid', { unique: true });
                        uploadStore.createIndex('filename', 'filename', { unique: false });
                        uploadStore.createIndex('uploadTime', 'uploadTime', { unique: false });
                        uploadStore.createIndex('md5', 'md5', { unique: false });
                        console.log('创建 uploads 表');
                    }
                    
                    // 创建配置表（如果不存在）
                    if (!db.objectStoreNames.contains('settings')) {
                        const settingsStore = db.createObjectStore('settings', { 
                            keyPath: 'key' 
                        });
                        console.log('创建 settings 表');
                    }
                    
                    console.log('IndexedDB 数据库结构已更新');
                };
            };
            
            versionRequest.onerror = () => {
                // 如果数据库不存在，使用版本1创建
                const request = indexedDB.open(this.dbName, 1);
                
                request.onerror = () => {
                    console.error('IndexedDB 初始化失败:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB 初始化成功，版本:', this.db.version);
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 创建上传记录表
                    const uploadStore = db.createObjectStore('uploads', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    
                    // 创建索引
                    uploadStore.createIndex('uid', 'uid', { unique: true });
                    uploadStore.createIndex('filename', 'filename', { unique: false });
                    uploadStore.createIndex('uploadTime', 'uploadTime', { unique: false });
                    uploadStore.createIndex('md5', 'md5', { unique: false });
                    
                    // 创建配置表
                    const settingsStore = db.createObjectStore('settings', { 
                        keyPath: 'key' 
                    });
                    
                    console.log('IndexedDB 数据库结构已创建');
                };
            };
        });
    }
    
    // 添加上传记录
    async addUploadRecord(record) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readwrite');
            const store = transaction.objectStore('uploads');
            
            // 确保记录包含必要字段
            const completeRecord = {
                ...record,
                id: record.id || Date.now(),
                uploadTime: record.uploadTime || Date.now(),
                status: record.status || 'completed'
            };
            
            const request = store.add(completeRecord);
            
            request.onsuccess = () => {
                console.log('上传记录添加成功:', completeRecord);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('添加上传记录失败:', request.error);
                reject(request.error);
            };
        });
    }
    
    // 获取所有上传记录
    async getAllUploads(limit = 100, offset = 0) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readonly');
            const store = transaction.objectStore('uploads');
            const index = store.index('uploadTime');
            const request = index.openCursor(null, 'prev'); // 按时间倒序
            
            const results = [];
            let count = 0;
            let skipped = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && count < limit) {
                    if (skipped < offset) {
                        skipped++;
                        cursor.continue();
                    } else {
                        results.push(cursor.value);
                        count++;
                        cursor.continue();
                    }
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 根据ID获取上传记录
    async getUploadById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readonly');
            const store = transaction.objectStore('uploads');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 根据UID获取上传记录
    async getUploadByUid(uid) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readonly');
            const store = transaction.objectStore('uploads');
            const index = store.index('uid');
            const request = index.get(uid);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 搜索上传记录
    async searchUploads(query, limit = 50) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readonly');
            const store = transaction.objectStore('uploads');
            const request = store.openCursor();
            
            const results = [];
            const lowerQuery = query.toLowerCase();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    const record = cursor.value;
                    
                    // 搜索文件名和原始文件名
                    if (record.filename.toLowerCase().includes(lowerQuery) ||
                        (record.originalName && record.originalName.toLowerCase().includes(lowerQuery))) {
                        results.push(record);
                    }
                    
                    if (results.length < limit) {
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 删除上传记录
    async deleteUpload(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readwrite');
            const store = transaction.objectStore('uploads');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('上传记录删除成功:', id);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('删除上传记录失败:', request.error);
                reject(request.error);
            };
        });
    }
    
    // 批量删除上传记录
    async deleteUploads(ids) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readwrite');
            const store = transaction.objectStore('uploads');
            
            let completed = 0;
            const total = ids.length;
            
            if (total === 0) {
                resolve(0);
                return;
            }
            
            ids.forEach(id => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        resolve(total);
                    }
                };
                
                request.onerror = () => {
                    completed++;
                    if (completed === total) {
                        resolve(total);
                    }
                };
            });
        });
    }
    
    // 清空所有上传记录
    async clearAllUploads() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readwrite');
            const store = transaction.objectStore('uploads');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('所有上传记录已清空');
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('清空上传记录失败:', request.error);
                reject(request.error);
            };
        });
    }
    
    // 获取上传记录统计
    async getUploadStats() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['uploads'], 'readonly');
            const store = transaction.objectStore('uploads');
            const request = store.count();
            
            request.onsuccess = () => {
                const totalCount = request.result;
                
                // 获取最近7天的上传数量
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                const index = store.index('uploadTime');
                const range = IDBKeyRange.lowerBound(sevenDaysAgo);
                const recentRequest = index.count(range);
                
                recentRequest.onsuccess = () => {
                    const recentCount = recentRequest.result;
                    
                    resolve({
                        total: totalCount,
                        recent7Days: recentCount,
                        averagePerDay: recentCount / 7
                    });
                };
                
                recentRequest.onerror = () => {
                    reject(recentRequest.error);
                };
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 保存设置
    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 获取设置
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 导出数据
    async exportData() {
        const uploads = await this.getAllUploads(1000);
        const settings = await this.getAllSettings();
        
        return {
            uploads,
            settings,
            exportTime: Date.now(),
            version: this.version
        };
    }
    
    // 获取所有设置
    async getAllSettings() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    // 导入数据
    async importData(data) {
        if (!data || !data.uploads) {
            throw new Error('无效的导入数据');
        }
        
        // 清空现有数据
        await this.clearAllUploads();
        
        // 批量导入上传记录
        for (const upload of data.uploads) {
            await this.addUploadRecord(upload);
        }
        
        // 导入设置
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await this.saveSetting(key, value);
            }
        }
        
        return true;
    }
}

// 创建全局数据库实例
window.OMOE_DB = new Database();