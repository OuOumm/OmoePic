class HistoryManager {
    constructor() {
        this.config = window.OMOE_CONFIG;
        this.db = window.OMOE_DB;
        this.ui = window.OMOE_UI;

        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.selectedItems = new Set();
        this.allUploads = [];
        this.filteredUploads = [];

        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadHistory();
        this.setupEventListeners();
        this.setupSearch();
    }

    // 加载统计信息
    async loadStats() {
        try {
            const stats = await this.db.getUploadStats();
            document.getElementById('totalCount').textContent = stats.total;
            document.getElementById('recentCount').textContent = stats.recent7Days;
            document.getElementById('dailyAvg').textContent = stats.dailyAverage.toFixed(1);
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    // 加载历史记录
    async loadHistory(page = 1) {
        this.currentPage = page;

        try {
            this.allUploads = await this.db.getAllUploads();
            this.filteredUploads = [...this.allUploads];

            this.renderHistoryList();
            this.updatePagination();
            this.updateSelectionUI();
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.ui.showErrorState(document.getElementById('historyContainer'), '加载失败', 'historyManager.loadHistory()');
        }
    }

    // 渲染历史记录列表
    renderHistoryList() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        if (this.filteredUploads.length === 0) {
            this.ui.showEmptyState(container, '暂无上传记录', '📁');
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = this.filteredUploads.slice(startIndex, endIndex);

        let html = '<div class="space-y-3">';

        currentItems.forEach(upload => {
            const isSelected = this.selectedItems.has(upload.id);
            html += `
                        <div class="history-item neumorphism p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}" data-id="${upload.id}">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} 
                                           onchange="historyManager.toggleSelect(${upload.id})">
                                    <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                        <img src="${upload.url}" alt="${upload.originalName}" 
                                             class="w-full h-full object-cover" onerror="this.style.display='none'">
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="font-medium text-gray-900 dark:text-white truncate" title="${upload.originalName}">
                                            ${upload.originalName}
                                        </div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">
                                            ${this.config.formatFileSize(upload.size)} • 
                                            ${this.config.formatTime(upload.uploadTime)}
                                            ${upload.instant ? '<span class="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded ml-2">秒传</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button class="text-blue-500 hover:text-blue-700" onclick="historyManager.copyUrl('${upload.url}')" title="复制URL">URL</button>
                                    <button class="text-green-500 hover:text-green-700" onclick="historyManager.copyMarkdown('${upload.url}', '${upload.originalName}')" title="复制Markdown">MD</button>
                                    <button class="text-purple-500 hover:text-purple-700" onclick="historyManager.copyBBCode('${upload.url}')" title="复制BBCode">BB</button>
                                    <button class="text-red-500 hover:text-red-700" onclick="historyManager.deleteItem(${upload.id})" title="删除">删除</button>
                                </div>
                            </div>
                        </div>
                    `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // 更新分页
    updatePagination() {
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (!pagination) return;

        const totalPages = Math.ceil(this.filteredUploads.length / this.itemsPerPage);

        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');
        pageInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    // 设置事件监听器
    setupEventListeners() {
        // 分页按钮
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadHistory(this.currentPage - 1);
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredUploads.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.loadHistory(this.currentPage + 1);
            }
        });

        // 全选按钮
        document.getElementById('selectAll')?.addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // 删除选中按钮
        document.getElementById('deleteSelected')?.addEventListener('click', () => {
            this.deleteSelected();
        });

        // 导出数据
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportData();
        });

        // 清空全部
        document.getElementById('clearAll')?.addEventListener('click', () => {
            this.clearAll();
        });
    }

    // 设置搜索功能
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const debouncedSearch = this.config.debounce((query) => {
            this.searchHistory(query);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }

    // 搜索历史记录
    searchHistory(query) {
        if (!query) {
            this.filteredUploads = [...this.allUploads];
        } else {
            this.filteredUploads = this.allUploads.filter(upload =>
                upload.originalName.toLowerCase().includes(query.toLowerCase()) ||
                upload.filename.toLowerCase().includes(query.toLowerCase())
            );
        }

        this.currentPage = 1;
        this.selectedItems.clear();
        this.renderHistoryList();
        this.updatePagination();
        this.updateSelectionUI();
    }

    // 切换选择状态
    toggleSelect(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.updateSelectionUI();
    }

    // 全选/取消全选
    toggleSelectAll() {
        const currentItems = this.filteredUploads.slice(
            (this.currentPage - 1) * this.itemsPerPage,
            this.currentPage * this.itemsPerPage
        );

        const allSelected = currentItems.every(item => this.selectedItems.has(item.id));

        currentItems.forEach(item => {
            if (allSelected) {
                this.selectedItems.delete(item.id);
            } else {
                this.selectedItems.add(item.id);
            }
        });

        this.renderHistoryList();
        this.updateSelectionUI();
    }

    // 更新选择UI
    updateSelectionUI() {
        const deleteBtn = document.getElementById('deleteSelected');
        const selectAllBtn = document.getElementById('selectAll');

        if (this.selectedItems.size > 0) {
            deleteBtn?.classList.remove('hidden');
            selectAllBtn.textContent = '取消全选';
        } else {
            deleteBtn?.classList.add('hidden');
            selectAllBtn.textContent = '全选';
        }
    }

    // 删除选中项
    async deleteSelected() {
        if (this.selectedItems.size === 0) return;

        const confirmed = await this.ui.showConfirm(
            `确定要删除选中的 ${this.selectedItems.size} 条记录吗？`,
            '确认删除'
        );

        if (!confirmed) return;

        try {
            for (const id of this.selectedItems) {
                await this.db.deleteUpload(id);
            }

            this.selectedItems.clear();
            await this.loadStats();
            await this.loadHistory(this.currentPage);
            this.config.showNotification(`成功删除 ${this.selectedItems.size} 条记录`, 'success');
        } catch (error) {
            console.error('删除记录失败:', error);
            this.config.showNotification('删除失败', 'error');
        }
    }

    // 删除单个项
    async deleteItem(id) {
        const confirmed = await this.ui.showConfirm('确定要删除这条记录吗？', '确认删除');
        if (!confirmed) return;

        try {
            await this.db.deleteUpload(id);
            this.selectedItems.delete(id);
            await this.loadStats();
            await this.loadHistory(this.currentPage);
            this.config.showNotification('记录已删除', 'success');
        } catch (error) {
            console.error('删除记录失败:', error);
            this.config.showNotification('删除失败', 'error');
        }
    }

    // 导出数据
    async exportData() {
        try {
            const data = await this.db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `omoe-pic-backup-${new Date().toISOString().split('T')[0]}.json`;
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

    // 清空全部
    async clearAll() {
        const confirmed = await this.ui.showConfirm(
            '确定要清空所有历史记录吗？此操作不可恢复。',
            '确认清空'
        );

        if (!confirmed) return;

        try {
            await this.db.clearAllUploads();
            this.selectedItems.clear();
            await this.loadStats();
            await this.loadHistory();
            this.config.showNotification('所有记录已清空', 'success');
        } catch (error) {
            console.error('清空记录失败:', error);
            this.config.showNotification('清空失败', 'error');
        }
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
}

// 创建全局历史记录管理器实例
window.historyManager = new HistoryManager();