// 文件上传处理类
class UploadManager {
    constructor() {
        this.config = window.OMOE_CONFIG;
        this.uploadQueue = [];
        this.currentUploads = new Map();
        this.maxConcurrentUploads = 3;
        this.isUploading = false;
        this.storage = 'local';
        
        this.initEventListeners();
    }
    
    // 初始化事件监听器
    initEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (!uploadArea || !fileInput) return;
        
        // 拖拽事件
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // 点击事件
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // 文件选择事件
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // 粘贴事件
        document.addEventListener('paste', this.handlePaste.bind(this));
    }
    
    // 处理拖拽悬停
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.add('dragover');
    }
    
    // 处理拖拽离开
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('dragover');
        }
    }
    
    // 处理拖拽放置
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }
    
    // 处理文件选择
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        
        // 清空input，允许重复选择相同文件
        e.target.value = '';
    }
    
    // 处理粘贴事件
    handlePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        const files = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        
        if (files.length > 0) {
            this.processFiles(files);
        }
    }
    
    // 处理文件列表
    async processFiles(files) {
        const validFiles = files.filter(file => 
            this.config.validateFileType(file) && this.config.validateFileSize(file)
        );
        
        const invalidFiles = files.filter(file => 
            !this.config.validateFileType(file) || !this.config.validateFileSize(file)
        );
        
        // 显示无效文件警告
        invalidFiles.forEach(file => {
            const errorMsg = !this.config.validateFileType(file) ? 
                `不支持的文件类型: ${file.name}` : 
                `文件过大: ${file.name} (${this.config.formatFileSize(file.size)})`;
            
            this.config.showNotification(errorMsg, 'error');
        });
        
        if (validFiles.length === 0) return;
        
        // 添加上传队列
        validFiles.forEach(file => {
            const uploadId = this.config.generateId();
            this.uploadQueue.push({
                id: uploadId,
                file: file,
                status: 'pending',
                progress: 0
            });
            
            // 创建上传卡片
            this.createUploadCard(uploadId, file);
        });
        
        // 开始上传
        if (!this.isUploading) {
            this.startUpload();
        }
        
        this.config.showNotification(`已添加 ${validFiles.length} 个文件到上传队列`, 'info');
    }
    
    // 创建上传卡片
    createUploadCard(uploadId, file) {
        const resultsContainer = document.getElementById('uploadResults');
        if (!resultsContainer) return;
        
        const card = document.createElement('div');
        card.className = 'upload-card neumorphism p-4';
        card.id = `upload-card-${uploadId}`;
        
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white truncate max-w-xs" title="${file.name}">${file.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${this.config.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400" id="status-${uploadId}">等待上传</span>
                    <button class="text-red-500 hover:text-red-700" onclick="window.OMOE_UPLOAD.cancelUpload('${uploadId}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mt-3 hidden" id="progress-${uploadId}">
                <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>上传进度</span>
                    <span id="progress-text-${uploadId}">0%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="progress-bar bg-blue-500 h-2 rounded-full" id="progress-bar-${uploadId}" style="width: 0%"></div>
                </div>
            </div>
        `;
        
        resultsContainer.insertBefore(card, resultsContainer.firstChild);
    }
    
    // 开始上传
    async startUpload() {
        if (this.isUploading) return;
        
        this.isUploading = true;
        
        while (this.uploadQueue.length > 0 && this.currentUploads.size < this.maxConcurrentUploads) {
            const upload = this.uploadQueue.shift();
            if (upload) {
                this.currentUploads.set(upload.id, upload);
                this.uploadFile(upload);
            }
        }
        
        // 显示上传进度
        this.showUploadProgress();
    }
    
    // 上传单个文件
    async uploadFile(upload) {
        const { id, file } = upload;
        
        try {
            // 更新状态
            this.updateUploadStatus(id, 'uploading', 0);
            
            // 计算文件MD5（秒传检查）
            const md5 = await this.calculateMD5(file);
            
            // 检查秒传
            const instantUploadResult = await this.checkInstantUpload(md5);
            if (instantUploadResult.exists) {
                this.handleUploadSuccess(id, file, {
                    ...instantUploadResult,
                    instant: true
                });
                return;
            }
            
            // 正常上传
            const formData = new FormData();
            formData.append('file', file);
            formData.append('md5', md5);
            formData.append('storage', this.storage);
            
            const response = await this.sendUploadRequest(formData, (progress) => {
                this.updateUploadStatus(id, 'uploading', progress);
            });
            
            if (response.success) {
                this.handleUploadSuccess(id, file, response.data);
            } else {
                throw new Error(response.message || '上传失败');
            }
            
        } catch (error) {
            this.handleUploadError(id, file, error);
        }
    }
    
    // 计算文件MD5
    async calculateMD5(file) {
        return new Promise((resolve) => {
            // 使用crypto.subtle.digest计算MD5
            const reader = new FileReader();
            reader.onloadend = () => {
                const arrayBuffer = reader.result;
                const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
                const md5 = CryptoJS.MD5(wordArray).toString();
                resolve(md5);
            };
            reader.readAsArrayBuffer(file);
        });
    }
    
    // 检查秒传
    async checkInstantUpload(md5) {
        try {
            const response = await fetch(`${this.config.API_BASE}${this.config.API_ENDPOINTS.CHECK_HASH}/${md5}`, {
                headers: {
                    'X-User-Token': this.config.getUserToken()
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            }
            
            return { exists: false };
        } catch (error) {
            console.error('秒传检查失败:', error);
            return { exists: false };
        }
    }
    
    // 发送上传请求
    async sendUploadRequest(formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', `${this.config.API_BASE}${this.config.API_ENDPOINTS.UPLOAD}`);
            xhr.setRequestHeader('X-User-Token', this.config.getUserToken());
            
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            };
            
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('响应解析失败'));
                    }
                } else {
                    reject(new Error(`上传失败: ${xhr.status}`));
                }
            };
            
            xhr.onerror = () => {
                reject(new Error('网络错误'));
            };
            
            xhr.ontimeout = () => {
                reject(new Error('上传超时'));
            };
            
            xhr.send(formData);
        });
    }
    
    // 处理上传成功
    async handleUploadSuccess(uploadId, file, result) {
        this.updateUploadStatus(uploadId, 'completed', 100);
        
        // 更新卡片显示结果
        this.updateUploadCard(uploadId, file, result);
        
        // 保存到数据库
        const record = {
            uid: result.uid,
            filename: result.filename,
            originalName: file.name,
            size: file.size,
            md5: result.md5,
            url: result.url,
            uploadTime: Date.now(),
            instant: result.instant || false
        };
        
        try {
            await window.OMOE_DB.addUploadRecord(record);
        } catch (error) {
            console.error('保存上传记录失败:', error);
        }
        
        this.currentUploads.delete(uploadId);
        this.continueUpload();
        
        const message = result.instant ? '秒传成功！' : '上传成功！';
        this.config.showNotification(message, 'success');
    }
    
    // 处理上传错误
    handleUploadError(uploadId, _file, error) {
        this.updateUploadStatus(uploadId, 'error', 0);
        
        // 更新卡片显示错误
        const statusElement = document.getElementById(`status-${uploadId}`);
        if (statusElement) {
            statusElement.textContent = '上传失败';
            statusElement.className = 'text-sm text-red-500';
        }
        
        this.currentUploads.delete(uploadId);
        this.continueUpload();
        
        this.config.showNotification(`上传失败: ${error.message}`, 'error');
    }
    
    // 更新上传状态
    updateUploadStatus(uploadId, status, progress) {
        const statusElement = document.getElementById(`status-${uploadId}`);
        const progressContainer = document.getElementById(`progress-${uploadId}`);
        const progressBar = document.getElementById(`progress-bar-${uploadId}`);
        const progressText = document.getElementById(`progress-text-${uploadId}`);
        
        if (statusElement) {
            const statusTexts = {
                pending: '等待上传',
                uploading: '上传中',
                completed: '上传完成',
                error: '上传失败'
            };
            
            statusElement.textContent = statusTexts[status] || status;
            
            const statusColors = {
                pending: 'text-gray-500',
                uploading: 'text-blue-500',
                completed: 'text-green-500',
                error: 'text-red-500'
            };
            
            statusElement.className = `text-sm ${statusColors[status] || 'text-gray-500'}`;
        }
        
        if (progressContainer) {
            progressContainer.classList.toggle('hidden', status !== 'uploading');
        }
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }
    }
    
    // 更新上传卡片显示结果
    updateUploadCard(uploadId, file, result) {
        const card = document.getElementById(`upload-card-${uploadId}`);
        if (!card) return;
        
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <img src="${result.url}" alt="${file.name}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                    </div>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white truncate max-w-xs" title="${file.name}">${file.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${this.config.formatFileSize(file.size)}</div>
                        ${result.instant ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">秒传</span>' : ''}
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-green-500">上传完成</span>
                    <div class="flex space-x-1">
                        <button class="text-blue-500 hover:text-blue-700" onclick="window.OMOE_UPLOAD.copyUrl('${result.url}')" title="复制URL">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                        <button class="text-gray-500 hover:text-gray-700" onclick="window.OMOE_UPLOAD.showCopyOptions('${uploadId}', '${result.url}', '${file.name}')" title="更多复制选项">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                        </button>
                        <button class="text-red-500 hover:text-red-700" onclick="window.OMOE_UPLOAD.removeCard('${uploadId}')" title="删除卡片">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 继续上传
    continueUpload() {
        if (this.uploadQueue.length > 0 && this.currentUploads.size < this.maxConcurrentUploads) {
            this.startUpload();
        } else if (this.uploadQueue.length === 0 && this.currentUploads.size === 0) {
            this.isUploading = false;
            this.hideUploadProgress();
        }
    }
    
    // 显示上传进度
    showUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
    }
    
    // 隐藏上传进度
    hideUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }
    
    // 取消上传
    cancelUpload(uploadId) {
        // 从队列中移除
        this.uploadQueue = this.uploadQueue.filter(u => u.id !== uploadId);
        
        // 如果正在上传，中止请求（实际项目中需要实现）
        if (this.currentUploads.has(uploadId)) {
            this.currentUploads.delete(uploadId);
        }
        
        // 移除卡片
        this.removeCard(uploadId);
        
        this.continueUpload();
    }
    
    // 移除卡片
    removeCard(uploadId) {
        const card = document.getElementById(`upload-card-${uploadId}`);
        if (card) {
            card.remove();
        }
    }
    
    // 复制URL
    async copyUrl(url) {
        const success = await this.config.copyToClipboard(url);
        if (success) {
            this.config.showNotification('URL已复制到剪贴板', 'success');
        }
    }
    
    // 显示复制选项
    showCopyOptions(_uploadId, url, filename) {
        // 实现复制选项弹窗
        const formats = {
            'URL': url,
            'Markdown': `![${filename}](${url})`,
            'BBCode': `[img]${url}[/img]`
        };
        
        let optionsHtml = '';
        for (const [name, content] of Object.entries(formats)) {
            optionsHtml += `
                <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                        onclick="window.OMOE_UPLOAD.copyFormat('${name}', '${content.replace(/'/g, "\\'")}')">
                    ${name}
                </button>
            `;
        }
        
        // 简单的弹窗实现
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white">复制选项</h3>
                </div>
                <div class="py-2">
                    ${optionsHtml}
                </div>
                <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-right">
                    <button class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" onclick="this.closest('.fixed').remove()">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // 复制格式
    async copyFormat(name, content) {
        const success = await this.config.copyToClipboard(content);
        if (success) {
            this.config.showNotification(`${name}已复制到剪贴板`, 'success');
        }
        
        // 关闭所有弹窗
        document.querySelectorAll('.fixed.bg-black').forEach(modal => modal.remove());
    }
}

// 创建全局上传管理器实例
window.OMOE_UPLOAD = new UploadManager();