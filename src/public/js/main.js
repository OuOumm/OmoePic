// 主入口文件 - 整合所有功能模块
class Main {
    constructor() {
        this.config = window.OMOE_CONFIG;
        this.db = window.OMOE_DB;
        this.upload = window.OMOE_UPLOAD;
        this.ui = window.OMOE_UI;
        
        this.init();
    }
    
    // 初始化应用
    async init() {
        console.log('OmoePic 前端应用初始化...');
        // 等待 Dexie.js 加载完成
        await this.waitForDexie();
        
        // 等待数据库初始化完成
        this.waitForDB().then(() => {
            this.setupPageSpecificFeatures();
            this.setupGlobalFeatures();
            this.checkServerHealth();
        }).catch(error => {
            console.error('应用初始化失败:', error);
            this.config.showNotification('应用初始化失败，请刷新页面重试', 'error');
        });
    }

    // 等待 Dexie.js 加载完成
    async waitForDexie() {
        return new Promise((resolve, _reject) => {
            if (window.Dexie) {
                resolve();
            } else {
                window.addEventListener('DexieLoaded', resolve);
            }
        });
    }
    
    // 等待数据库初始化
    async waitForDB() {
        return new Promise((resolve, _reject) => {
            const checkDB = () => {
                if (this.db.db) {
                    resolve();
                } else {
                    setTimeout(checkDB, 100);
                }
            };
            checkDB();
        });
    }
    
    // 设置页面特定功能
    setupPageSpecificFeatures() {
        const pathname = window.location.pathname;
        
        if (pathname === '/' || pathname.endsWith('index.html')) {
            this.setupUploadPage();
        } else if (pathname.endsWith('history.html')) {
            this.setupHistoryPage();
        } else if (pathname.endsWith('admin.html')) {
            this.setupAdminPage();
        }
    }
    
    // 设置上传页面功能
    setupUploadPage() {
        console.log('设置上传页面功能');
        
        // 添加快捷键支持
        this.setupKeyboardShortcuts();
        
        // 添加上传限制提示
        this.setupUploadLimits();
        
        // 加载最近的上传记录
        this.loadRecentUploads();
    }
    
    // 设置历史记录页面功能
    setupHistoryPage() {
        console.log('设置历史记录页面功能');
        
        // 初始化历史记录管理
        if (typeof window.HistoryManager !== 'undefined') {
            window.historyManager = new window.HistoryManager();
            window.historyManager.loadHistory();
        } else {
            // 简单的历史记录显示
            this.setupSimpleHistory();
        }
    }
    
    // 设置管理后台页面功能
    setupAdminPage() {
        console.log('设置管理后台页面功能');
        
        // 检查管理员权限
        this.checkAdminAccess();
        
        // 加载管理功能
        if (typeof window.AdminManager !== 'undefined') {
            window.adminManager = new window.AdminManager();
            window.adminManager.loadStats();
        }
    }
    
    // 设置全局功能
    setupGlobalFeatures() {
        // 设置移动端菜单
        this.setupMobileMenu();
        
        // 设置服务工作者（如果启用PWA）
        this.setupServiceWorker();
        
        // 设置离线检测
        this.setupOfflineDetection();
        
        // 设置性能监控
        this.setupPerformanceMonitoring();
        
        // 设置错误处理
        this.setupErrorHandling();
    }
    
    // 设置移动端菜单
    setupMobileMenu() {
        const menuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (!menuToggle || !mobileMenu) return;
        
        // 点击汉堡菜单切换移动端菜单
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        
        // 点击菜单项关闭菜单
        mobileMenu.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
        
        // 点击页面其他区域关闭菜单
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
        
        // 窗口大小变化时关闭菜单
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }
    
    // 添加快捷键支持
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + U 触发文件选择
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                document.getElementById('fileInput')?.click();
            }
            
            // Ctrl/Cmd + , 切换主题
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                document.getElementById('themeToggle')?.click();
            }
            
            // Escape 键关闭所有弹窗
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    // 添加上传限制提示
    setupUploadLimits() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;
        
        // 添加限制信息提示
        const limitInfo = document.createElement('div');
        limitInfo.className = 'mt-4 text-xs text-gray-500 dark:text-gray-500';
        limitInfo.innerHTML = `
            <div>支持格式: ${this.config.ALLOWED_TYPES.map(type => type.split('/')[1]).join(', ').toUpperCase()}</div>
            <div>最大文件: ${this.config.formatFileSize(this.config.MAX_FILE_SIZE)}</div>
        `;
        
        uploadArea.appendChild(limitInfo);
    }
    
    // 加载最近的上传记录
    async loadRecentUploads() {
        try {
            const recentUploads = await this.db.getAllUploads(5);
            if (recentUploads.length > 0) {
                this.showRecentUploads(recentUploads);
            }
        } catch (error) {
            console.error('加载最近上传记录失败:', error);
        }
    }
    
    // 显示最近上传记录
    showRecentUploads(uploads) {
        const container = document.getElementById('uploadResults');
        if (!container) return;
        
        const recentSection = document.createElement('div');
        recentSection.className = 'mb-8';
        recentSection.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">最近上传</h3>
                <a href="/history.html" class="text-sm text-blue-500 hover:text-blue-700">查看全部</a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="recentUploads">
            </div>
        `;
        
        container.insertBefore(recentSection, container.firstChild);
        
        const recentContainer = document.getElementById('recentUploads');
        uploads.forEach(upload => {
            const card = this.createHistoryCard(upload);
            recentContainer.appendChild(card);
        });
    }
    
    // 创建历史记录卡片
    createHistoryCard(upload) {
        const card = document.createElement('div');
        card.className = 'neumorphism p-3';
        
        card.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <img src="${upload.url}" alt="${upload.originalName}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 dark:text-white truncate" title="${upload.originalName}">${upload.originalName}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">${this.config.formatTime(upload.uploadTime)}</div>
                </div>
                <button class="text-blue-500 hover:text-blue-700" onclick="window.OMOE_MAIN.copyUrl('${upload.url}')" title="复制URL">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                </button>
            </div>
        `;
        
        return card;
    }
    
    // 简单的历史记录实现
    async setupSimpleHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        try {
            this.ui.showLoading(container, '加载历史记录...');
            
            const uploads = await this.db.getAllUploads(50);
            
            if (uploads.length === 0) {
                this.ui.showEmptyState(container, '暂无上传记录', '📁');
                return;
            }
            
            let html = `
                <div class="mb-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">上传历史</h2>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-600 dark:text-gray-400">共 ${uploads.length} 条记录</span>
                            <button class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600" onclick="window.OMOE_MAIN.clearAllHistory()">清空全部</button>
                        </div>
                    </div>
                </div>
                <div class="space-y-3" id="historyList">
            `;
            
            uploads.forEach(upload => {
                html += this.createHistoryItem(upload);
            });
            
            html += '</div>';
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.ui.showErrorState(container, '加载失败', 'window.OMOE_MAIN.setupSimpleHistory()');
        }
    }
    
    // 创建历史记录项
    createHistoryItem(upload) {
        return `
            <div class="neumorphism p-4" data-id="${upload.id}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                            <img src="${upload.url}" alt="${upload.originalName}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">${upload.originalName}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                ${this.config.formatFileSize(upload.size)} • ${this.config.formatTime(upload.uploadTime)}
                                ${upload.instant ? '<span class="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded ml-2">秒传</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="text-blue-500 hover:text-blue-700" onclick="window.OMOE_MAIN.copyUrl('${upload.url}')" title="复制URL">URL</button>
                        <button class="text-green-500 hover:text-green-700" onclick="window.OMOE_MAIN.copyMarkdown('${upload.url}', '${upload.originalName}')" title="复制Markdown">MD</button>
                        <button class="text-purple-500 hover:text-purple-700" onclick="window.OMOE_MAIN.copyBBCode('${upload.url}')" title="复制BBCode">BB</button>
                        <button class="text-red-500 hover:text-red-700" onclick="window.OMOE_MAIN.deleteHistoryItem(${upload.id})" title="删除">删除</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 检查服务器健康状态
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.config.API_BASE}${this.config.API_ENDPOINTS.HEALTH}`);
            if (!response.ok) {
                this.config.showNotification('服务器连接异常', 'warning');
            }
        } catch (error) {
            console.warn('服务器健康检查失败:', error);
        }
    }
    
    // 设置服务工作者
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker 注册成功:', registration);
                })
                .catch(error => {
                    console.log('ServiceWorker 注册失败:', error);
                });
        }
    }
    
    // 设置离线检测
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.config.showNotification('网络连接已恢复', 'success', 2000);
        });
        
        window.addEventListener('offline', () => {
            this.config.showNotification('网络连接已断开', 'warning', 5000);
        });
    }
    
    // 设置性能监控
    setupPerformanceMonitoring() {
        // 简单的性能监控
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`页面加载时间: ${loadTime}ms`);
        });
    }
    
    // 设置错误处理
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
        });
    }
    
    // 关闭所有弹窗
    closeAllModals() {
        document.querySelectorAll('.fixed.bg-black').forEach(modal => modal.remove());
    }
    
    // 复制URL
    async copyUrl(url) {
        const success = await this.config.copyToClipboard(url);
        if (success) {
            this.config.showNotification('URL已复制到剪贴板', 'success');
        }
    }
    
    // 复制Markdown格式
    async copyMarkdown(url, filename) {
        const markdown = `![${filename}](${url})`;
        const success = await this.config.copyToClipboard(markdown);
        if (success) {
            this.config.showNotification('Markdown格式已复制', 'success');
        }
    }
    
    // 复制BBCode格式
    async copyBBCode(url) {
        const bbcode = `[img]${url}[/img]`;
        const success = await this.config.copyToClipboard(bbcode);
        if (success) {
            this.config.showNotification('BBCode格式已复制', 'success');
        }
    }
    
    // 删除历史记录项
    async deleteHistoryItem(id) {
        const confirmed = await this.ui.showConfirm('确定要删除这条记录吗？', '确认删除');
        if (!confirmed) return;
        
        try {
            await this.db.deleteUpload(id);
            document.querySelector(`[data-id="${id}"]`)?.remove();
            this.config.showNotification('记录已删除', 'success');
        } catch (error) {
            console.error('删除记录失败:', error);
            this.config.showNotification('删除失败', 'error');
        }
    }
    
    // 清空所有历史记录
    async clearAllHistory() {
        const confirmed = await this.ui.showConfirm('确定要清空所有历史记录吗？此操作不可恢复。', '确认清空');
        if (!confirmed) return;
        
        try {
            await this.db.clearAllUploads();
            const container = document.getElementById('historyContainer');
            if (container) {
                this.ui.showEmptyState(container, '暂无上传记录', '📁');
            }
            this.config.showNotification('所有记录已清空', 'success');
        } catch (error) {
            console.error('清空记录失败:', error);
            this.config.showNotification('清空失败', 'error');
        }
    }
    
    // 检查管理员访问权限
    async checkAdminAccess() {
        // 简单的权限检查（实际项目中应使用更安全的验证）
        const token = this.config.getUserToken();
        if (!token.includes('admin')) {
            this.config.showNotification('需要管理员权限访问此页面', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    }
}

// 创建全局主应用实例
window.OMOE_MAIN = new Main();