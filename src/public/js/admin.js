class AdminManager {
    constructor() {
        this.config = window.OMOE_CONFIG;
        this.db = window.OMOE_DB;
        this.ui = window.OMOE_UI;

        this.currentImagePage = 1;
        this.imagesPerPage = 10;
        this.allImages = [];

        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadImages();
        this.setupEventListeners();
        this.loadStorageInfo();
        this.loadCurrentConfig();
    }

    // 加载统计信息
    async loadStats() {
        try {
            const stats = await this.db.getUploadStats();
            document.getElementById('totalUploads').textContent = stats.total;
            document.getElementById('recentUploads').textContent = stats.recent7Days;
            document.getElementById('dailyAverage').textContent = stats.dailyAverage.toFixed(1);

            // 计算今日上传数
            const today = new Date().toDateString();
            const todayUploads = this.allImages.filter(img =>
                new Date(img.uploadTime).toDateString() === today
            ).length;
            document.getElementById('todayUploads').textContent = todayUploads;
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    // 加载图片列表
    async loadImages(page = 1) {
        this.currentImagePage = page;

        try {
            this.allImages = await this.db.getAllUploads();
            this.renderImageList();
            this.updateImagePagination();
        } catch (error) {
            console.error('加载图片列表失败:', error);
        }
    }

    // 渲染图片列表
    renderImageList() {
        const container = document.getElementById('imageList');
        if (!container) return;

        const startIndex = (this.currentImagePage - 1) * this.imagesPerPage;
        const endIndex = startIndex + this.imagesPerPage;
        const currentImages = this.allImages.slice(startIndex, endIndex);

        if (currentImages.length === 0) {
            container.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center py-8 text-gray-500 dark:text-gray-400">
                                暂无上传记录
                            </td>
                        </tr>
                    `;
            return;
        }

        let html = '';
        currentImages.forEach(image => {
            html += `
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <td class="py-3">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                        <img src="${image.url}" alt="${image.originalName}" 
                                             class="w-full h-full object-cover" onerror="this.style.display='none'">
                                    </div>
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-white">${image.originalName}</div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">${image.filename}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                                ${this.config.formatFileSize(image.size)}
                            </td>
                            <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                                ${this.config.formatTime(image.uploadTime)}
                            </td>
                            <td class="py-3">
                                <div class="flex space-x-2">
                                    <button class="text-blue-500 hover:text-blue-700 text-sm" onclick="adminManager.viewImage('${image.url}')">查看</button>
                                    <button class="text-green-500 hover:text-green-700 text-sm" onclick="adminManager.copyUrl('${image.url}')">复制</button>
                                    <button class="text-red-500 hover:text-red-700 text-sm" onclick="adminManager.deleteImage(${image.id})">删除</button>
                                </div>
                            </td>
                        </tr>
                    `;
        });

        container.innerHTML = html;
    }

    // 更新图片分页
    updateImagePagination() {
        const pagination = document.getElementById('imagePagination');
        const pageInfo = document.getElementById('imagePageInfo');
        const prevBtn = document.getElementById('prevImagePage');
        const nextBtn = document.getElementById('nextImagePage');

        if (!pagination) return;

        const totalPages = Math.ceil(this.allImages.length / this.imagesPerPage);

        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');
        pageInfo.textContent = `第 ${this.currentImagePage} 页，共 ${totalPages} 页`;
        prevBtn.disabled = this.currentImagePage <= 1;
        nextBtn.disabled = this.currentImagePage >= totalPages;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 刷新按钮
        document.getElementById('refreshImages')?.addEventListener('click', () => {
            this.loadStats();
            this.loadImages(this.currentImagePage);
        });

        // 导出全部
        document.getElementById('exportAll')?.addEventListener('click', () => {
            this.exportAllData();
        });

        // 图片分页
        document.getElementById('prevImagePage')?.addEventListener('click', () => {
            if (this.currentImagePage > 1) {
                this.loadImages(this.currentImagePage - 1);
            }
        });

        document.getElementById('nextImagePage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.allImages.length / this.imagesPerPage);
            if (this.currentImagePage < totalPages) {
                this.loadImages(this.currentImagePage + 1);
            }
        });

        // 保存配置
        document.getElementById('saveConfig')?.addEventListener('click', () => {
            this.saveConfig();
        });

        // 导出数据
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportAllData();
        });

        // 导入数据
        document.getElementById('importData')?.addEventListener('click', () => {
            document.getElementById('importFile')?.click();
        });

        document.getElementById('importFile')?.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // 清空所有数据
        document.getElementById('clearAllData')?.addEventListener('click', () => {
            this.clearAllData();
        });
    }

    // 加载存储信息
    loadStorageInfo() {
        // 本地存储使用情况
        let localStorageSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                localStorageSize += localStorage[key].length * 2; // 估算大小（UTF-16）
            }
        }

        const localStorageMB = (localStorageSize / 1024).toFixed(1);
        const localStorageMax = 5120; // 5MB
        const localStoragePercent = Math.min((localStorageSize / (localStorageMax * 1024)) * 100, 100);

        document.getElementById('localStorageUsage').textContent = `${localStorageMB} KB / ${localStorageMax / 1024} MB`;
        document.getElementById('localStorageBar').style.width = `${localStoragePercent}%`;

        // IndexedDB 存储使用情况（估算）
        const indexedDBSize = this.allImages.reduce((total, img) => total + JSON.stringify(img).length * 2, 0);
        const indexedDBMB = (indexedDBSize / 1024).toFixed(1);
        const indexedDBMax = 51200; // 50MB
        const indexedDBPercent = Math.min((indexedDBSize / (indexedDBMax * 1024)) * 100, 100);

        document.getElementById('indexedDBUsage').textContent = `${indexedDBMB} KB / ${indexedDBMax / 1024} MB`;
        document.getElementById('indexedDBBar').style.width = `${indexedDBPercent}%`;
    }

    // 加载当前配置
    loadCurrentConfig() {
        document.getElementById('maxFileSize').value = this.config.MAX_FILE_SIZE;
        document.getElementById('allowedTypes').value = this.config.ALLOWED_TYPES.join(',');
        document.getElementById('chunkSize').value = this.config.CHUNK_SIZE;
    }

    // 保存配置
    async saveConfig() {
        try {
            const maxFileSize = parseInt(document.getElementById('maxFileSize').value);
            const allowedTypes = document.getElementById('allowedTypes').value.split(',').map(t => t.trim());
            const chunkSize = parseInt(document.getElementById('chunkSize').value);

            // 验证输入
            if (!maxFileSize || maxFileSize < 1048576) {
                this.config.showNotification('最大文件大小至少为1MB', 'error');
                return;
            }

            if (allowedTypes.length === 0) {
                this.config.showNotification('请至少指定一种文件类型', 'error');
                return;
            }

            if (!chunkSize || chunkSize < 262144) {
                this.config.showNotification('分片大小至少为256KB', 'error');
                return;
            }

            // 保存到数据库
            await this.db.saveSetting('maxFileSize', maxFileSize);
            await this.db.saveSetting('allowedTypes', allowedTypes);
            await this.db.saveSetting('chunkSize', chunkSize);

            // 更新配置实例
            this.config.MAX_FILE_SIZE = maxFileSize;
            this.config.ALLOWED_TYPES = allowedTypes;
            this.config.CHUNK_SIZE = chunkSize;

            this.config.showNotification('配置保存成功', 'success');
        } catch (error) {
            console.error('保存配置失败:', error);
            this.config.showNotification('保存配置失败', 'error');
        }
    }

    // 查看图片
    viewImage(url) {
        window.open(url, '_blank');
    }

    // 复制URL
    async copyUrl(url) {
        const success = await this.config.copyToClipboard(url);
        if (success) {
            this.config.showNotification('URL已复制到剪贴板', 'success');
        }
    }

    // 删除图片
    async deleteImage(id) {
        const confirmed = await this.ui.showConfirm('确定要删除这张图片吗？', '确认删除');
        if (!confirmed) return;

        try {
            await this.db.deleteUpload(id);
            await this.loadStats();
            await this.loadImages(this.currentImagePage);
            this.loadStorageInfo();
            this.config.showNotification('图片删除成功', 'success');
        } catch (error) {
            console.error('删除图片失败:', error);
            this.config.showNotification('删除失败', 'error');
        }
    }

    // 导出所有数据
    async exportAllData() {
        try {
            const data = await this.db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `omoe-pic-admin-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.config.showNotification('数据导出成功', 'success');
        } catch (error) {
            console.error('导出数据失败:', error);
            this.config.showNotification('导出失败', 'error');
        }
    }

    // 导入数据
    async importData(file) {
        if (!file) return;

        const confirmed = await this.ui.showConfirm(
            '导入数据将覆盖现有数据，确定要继续吗？',
            '确认导入'
        );

        if (!confirmed) return;

        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            await this.db.importData(data);

            await this.loadStats();
            await this.loadImages();
            this.loadStorageInfo();
            this.config.showNotification('数据导入成功', 'success');
        } catch (error) {
            console.error('导入数据失败:', error);
            this.config.showNotification('导入失败', 'error');
        }
    }

    // 读取文件为文本
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // 清空所有数据
    async clearAllData() {
        const confirmed = await this.ui.showConfirm(
            '确定要清空所有数据吗？此操作不可恢复！',
            '确认清空'
        );

        if (!confirmed) return;

        try {
            await this.db.clearAllUploads();
            await this.db.clearAllSettings();

            await this.loadStats();
            await this.loadImages();
            this.loadStorageInfo();
            this.config.showNotification('所有数据已清空', 'success');
        } catch (error) {
            console.error('清空数据失败:', error);
            this.config.showNotification('清空失败', 'error');
        }
    }
}

// 创建全局管理后台实例
window.adminManager = new AdminManager();