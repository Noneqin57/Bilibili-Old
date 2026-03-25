import { debug } from "../utils/debug";

/** 新版B站元素CSS选择器 */
const NEW_BILIBILI_SELECTORS = [
    // 新版顶栏/导航栏
    '#internationalHeader',
    '#biliMainHeader',
    '#bili-header-container',
    '#home_nav',
    '.bili-header__bar',
    '.large-header',
    '.header-channel',
    '.z_top_container',

    // 新版页脚
    '.international-footer',
    '#biliMainFooter',

    // 新版播放器容器
    '.bili-player-video-progress-detail-img',

    // 新版布局干扰元素
    '.lt-row',
    '.bili-header.large-header',

    // 新版样式文件
    '[href*="laputa-header"]'
];

/** 新版页面主容器 */
const NEW_MAIN_CONTAINER = '.main-container';

/** 脚本清理管理器 */
class CleanupManager {
    private observer: MutationObserver | null = null;
    private isActive = false;
    /** 排除的选择器，不会被清理 */
    private excludedSelectors = new Set<string>();
    /** 防抖定时器 */
    private debounceTimer = 0;

    /** 排除指定选择器，使其不被清理 */
    exclude(selector: string) {
        this.excludedSelectors.add(selector);
    }

    /** 开始监听并清理新版元素 */
    start() {
        if (this.isActive) return;
        this.isActive = true;

        // 立即清理一次
        this.cleanup();

        // 监听DOM变化（防抖处理，避免高频DOM更新导致性能问题）
        this.observer = new MutationObserver(() => {
            if (this.debounceTimer) return;
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = 0;
                this.cleanup();
            }, 100) as unknown as number;
        });

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        debug('cleanup manager started');
    }

    /** 停止监听 */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = 0;
        }
        this.isActive = false;
        debug('cleanup manager stopped');
    }

    /** 清理新版元素 */
    private cleanup() {
        try {
            NEW_BILIBILI_SELECTORS.forEach(selector => {
                if (this.excludedSelectors.has(selector)) return;
                document.querySelectorAll(selector).forEach(el => {
                    if (el instanceof HTMLElement) {
                        el.style.display = 'none';
                    }
                });
            });

            const mainContainer = document.querySelector(NEW_MAIN_CONTAINER);
            if (mainContainer instanceof HTMLElement) {
                mainContainer.removeAttribute('style');
            }
        } catch (e) {
            debug.error('cleanup error:', e);
        }
    }
}

/** 导出清理管理器实例 */
export const cleanup = new CleanupManager();
