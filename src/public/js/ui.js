// UI 界面控制类
class UIManager {
    constructor() {
        this.config = window.OMOE_CONFIG;
        this.init();
    }
    
    // 初始化UI
    init() {
        this.initTheme();
        this.initUserToken();
        this.initEventListeners();
    }
    
    // 初始化主题
    initTheme() {
        const savedTheme = this.config.getThemeMode();
        this.config.setThemeMode(savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    // 初始化用户令牌
    initUserToken() {
        const token = this.config.getUserToken();
        const tokenElement = document.getElementById('userToken');
        if (tokenElement) {
            tokenElement.textContent = token;
        }
        
        // 复制令牌功能
        const copyButton = document.getElementById('copyToken');
        if (copyButton) {
            copyButton.addEventListener('click', async () => {
                const success = await this.config.copyToClipboard(token);
                if (success) {
                    this.config.showNotification('用户令牌已复制', 'success');
                }
            });
        }
    }
    
    // 初始化事件监听器
    initEventListeners() {
        // 主题切换
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = this.config.toggleTheme();
                this.updateThemeIcon(newTheme);
            });
        }
        
        // 移动端菜单（如果需要）
        this.initMobileMenu();
    }
    
    // 更新主题图标
    updateThemeIcon(theme) {
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        
        if (sunIcon && moonIcon) {
            if (theme === 'light') {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }
    }
    
    // 初始化移动端菜单
    initMobileMenu() {
        // 简单的移动端菜单实现
        const nav = document.querySelector('nav');
        if (!nav) return;
        
        // 创建移动端菜单按钮
        const mobileMenuButton = document.createElement('button');
        mobileMenuButton.className = 'md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
        mobileMenuButton.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        `;
        
        // 插入到导航栏
        const navContainer = nav.querySelector('.flex.justify-between');
        if (navContainer) {
            navContainer.insertBefore(mobileMenuButton, navContainer.children[1]);
        }
        
        // 移动端菜单功能
        mobileMenuButton.addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.toggle('hidden');
            } else {
                this.createMobileMenu();
            }
        });
    }
    
    // 创建移动端菜单
    createMobileMenu() {
        const mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobileMenu';
        mobileMenu.className = 'md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700';
        
        mobileMenu.innerHTML = `
            <div class="px-2 pt-2 pb-3 space-y-1">
                <a href="/" class="block px-3 py-2 text-base font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md">上传</a>
                <a href="/history.html" class="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white rounded-md">历史记录</a>
                <a href="/admin.html" class="block px-3 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white rounded-md">管理后台</a>
                <div class="px-3 py-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400">用户令牌:</span>
                    <code class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200 block mt-1 truncate">${this.config.getUserToken()}</code>
                </div>
            </div>
        `;
        
        const nav = document.querySelector('nav');
        nav.appendChild(mobileMenu);
    }
    
    // 显示加载状态
    showLoading(container, message = '加载中...') {
        const loadingHtml = `
            <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p class="mt-2 text-gray-600 dark:text-gray-400">${message}</p>
            </div>
        `;
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = loadingHtml;
        }
    }
    
    // 显示空状态
    showEmptyState(container, message = '暂无数据', icon = '📁') {
        const emptyHtml = `
            <div class="text-center py-12">
                <div class="text-4xl mb-4">${icon}</div>
                <p class="text-gray-500 dark:text-gray-400">${message}</p>
            </div>
        `;
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = emptyHtml;
        }
    }
    
    // 显示错误状态
    showErrorState(container, message = '加载失败', retryCallback = null) {
        const errorHtml = `
            <div class="text-center py-8">
                <div class="text-red-500 text-4xl mb-4">⚠️</div>
                <p class="text-gray-600 dark:text-gray-400 mb-4">${message}</p>
                ${retryCallback ? `
                    <button class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" onclick="${retryCallback}">
                        重试
                    </button>
                ` : ''}
            </div>
        `;
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = errorHtml;
        }
    }
    
    // 创建分页控件
    createPagination(currentPage, totalPages, containerId, onPageChange) {
        if (totalPages <= 1) return '';
        
        let paginationHtml = '<div class="flex justify-center items-center space-x-2 mt-6">';
        
        // 上一页
        if (currentPage > 1) {
            paginationHtml += `
                <button class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" 
                        onclick="${onPageChange}(${currentPage - 1})">
                    上一页
                </button>
            `;
        }
        
        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHtml += `
                    <button class="px-3 py-2 rounded-lg bg-blue-500 text-white">
                        ${i}
                    </button>
                `;
            } else {
                paginationHtml += `
                    <button class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" 
                            onclick="${onPageChange}(${i})">
                        ${i}
                    </button>
                `;
            }
        }
        
        // 下一页
        if (currentPage < totalPages) {
            paginationHtml += `
                <button class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" 
                        onclick="${onPageChange}(${currentPage + 1})">
                    下一页
                </button>
            `;
        }
        
        paginationHtml += '</div>';
        
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = paginationHtml;
        }
        
        return paginationHtml;
    }
    
    // 创建搜索框
    createSearchBox(containerId, onSearch, placeholder = '搜索...') {
        const searchHtml = `
            <div class="relative">
                <input type="text" 
                       id="searchInput" 
                       placeholder="${placeholder}" 
                       class="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                       oninput="window.OMOE_UI.debouncedSearch(this.value)">
                <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>
        `;
        
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = searchHtml;
            
            // 防抖搜索
            this.debouncedSearch = this.config.debounce((query) => {
                onSearch(query);
            }, 300);
        }
        
        return searchHtml;
    }
    
    // 显示确认对话框
    async showConfirm(message, title = '确认操作') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4">
                    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white">${title}</h3>
                    </div>
                    <div class="px-4 py-4">
                        <p class="text-gray-600 dark:text-gray-400">${message}</p>
                    </div>
                    <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                        <button class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" id="confirmCancel">取消</button>
                        <button class="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600" id="confirmOk">确认</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const confirmOk = document.getElementById('confirmOk');
            const confirmCancel = document.getElementById('confirmCancel');
            
            const cleanup = () => {
                modal.remove();
                confirmOk.removeEventListener('click', onConfirm);
                confirmCancel.removeEventListener('click', onCancel);
            };
            
            const onConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const onCancel = () => {
                cleanup();
                resolve(false);
            };
            
            confirmOk.addEventListener('click', onConfirm);
            confirmCancel.addEventListener('click', onCancel);
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    onCancel();
                }
            });
        });
    }
    
    // 显示提示信息
    showTooltip(element, message, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = `absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg transform -translate-x-1/2 ${position === 'top' ? '-top-8' : 'top-full mt-1'}`;
        tooltip.textContent = message;
        tooltip.style.left = '50%';
        
        element.style.position = 'relative';
        element.appendChild(tooltip);
        
        // 自动隐藏
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 12000);
    }
}

// 创建全局UI管理器实例
window.OMOE_UI = new UIManager();