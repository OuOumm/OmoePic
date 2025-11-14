// 配置文件 - 系统配置和常量定义
class Config {
    constructor() {
        this.API_BASE = window.location.origin;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        this.ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        this.CHUNK_SIZE = 1024 * 1024; // 1MB分片上传
        this.RETRY_COUNT = 3;
        this.RETRY_DELAY = 1000;
        
        // 本地存储键名
        this.STORAGE_KEYS = {
            USER_TOKEN: 'omoe_pic_user_token',
            THEME_MODE: 'omoe_pic_theme_mode',
            UPLOAD_HISTORY: 'omoe_pic_upload_history'
        };
        
        // API端点
        this.API_ENDPOINTS = {
            UPLOAD: '/api/upload',
            CHECK_HASH: '/api/check',
            GET_IMAGE: '/i',
            HEALTH: '/health',
            ADMIN_STATS: '/admin/stats',
            ADMIN_IMAGES: '/admin/images',
            ADMIN_CONFIG: '/admin/config'
        };
    }
    
    // 获取用户令牌
    getUserToken() {
        return localStorage.getItem(this.STORAGE_KEYS.USER_TOKEN) || this.generateUserToken();
    }
    
    // 生成新的用户令牌
    generateUserToken() {
        const token = 'user_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem(this.STORAGE_KEYS.USER_TOKEN, token);
        return token;
    }
    
    // 设置用户令牌
    setUserToken(token) {
        localStorage.setItem(this.STORAGE_KEYS.USER_TOKEN, token);
    }
    
    // 获取主题模式
    getThemeMode() {
        return localStorage.getItem(this.STORAGE_KEYS.THEME_MODE) || 'light';
    }
    
    // 设置主题模式
    setThemeMode(mode) {
        localStorage.setItem(this.STORAGE_KEYS.THEME_MODE, mode);
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.classList.toggle('dark', mode === 'dark');
    }
    
    // 切换主题
    toggleTheme() {
        const currentMode = this.getThemeMode();
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        this.setThemeMode(newMode);
        return newMode;
    }
    
    // 验证文件类型
    validateFileType(file) {
        return this.ALLOWED_TYPES.includes(file.type);
    }
    
    // 验证文件大小
    validateFileSize(file) {
        return file.size <= this.MAX_FILE_SIZE;
    }
    
    // 获取文件扩展名
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 格式化时间
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // 复制文本到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }
    
    // 显示通知
    showNotification(message, type = 'info', duration = 3000) {
        // 获取所有现有通知
        const existingNotifications = document.querySelectorAll('[data-notification]');
        const notificationCount = existingNotifications.length;
        
        const notification = document.createElement('div');
        notification.setAttribute('data-notification', 'true');
        notification.className = `fixed right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 mb-2 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        // 计算垂直位置，每个通知间隔*8px，从顶部开始
        const topPosition = 8 * (notificationCount * (notification.offsetHeight + 8));
        notification.style.top = `${topPosition}px`;
        notification.style.transform = 'translateX(100%)';
        
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">${this.getNotificationIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 动画进入
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // 自动消失
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    // 移除后重新排列剩余通知
                    this.rearrangeNotifications();
                }
            }, 300);
        }, duration);
        
        // 点击关闭
        notification.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    // 移除后重新排列剩余通知
                    this.rearrangeNotifications();
                }
            }, 300);
        });
    }
    
    // 重新排列通知
    rearrangeNotifications() {
        const notifications = document.querySelectorAll('[data-notification]');
        notifications.forEach((notification, index) => {
            const topPosition = 4 + (index * (notification.offsetHeight + 8));
            notification.style.top = `${topPosition}px`;
        });
    }
    
    // 获取通知图标
    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 创建全局配置实例
window.OMOE_CONFIG = new Config();