import { debug } from "../../utils/debug";
import { poll } from "../../utils/poll";
import { toast } from "../toast";

/** 倍速档位 */
const RATE_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

/** 长按触发时间(ms) */
const LONG_PRESS_DELAY = 300;

export class PlaybackRateController {
    /** 当前倍速 */
    private currentRate = 1;
    /** 临时倍速前的倍速 */
    private previousRate = 1;
    /** 是否处于临时倍速状态 */
    private isTemporary = false;
    /** 倍速按钮元素 */
    private rateButton?: HTMLElement;
    /** 下拉菜单元素 */
    private rateMenu?: HTMLElement;
    /** 键盘长按定时器 */
    private keyTimer?: number;
    /** 当前按下的键 */
    private pressedKey?: string;
    /** 是否已销毁 */
    private destroyed = false;
    /** 是否启用控制栏按钮 */
    private enableButton: boolean;
    /** 是否启用键盘长按 */
    private enableKey: boolean;

    constructor(enableButton = true, enableKey = true) {
        this.enableButton = enableButton;
        this.enableKey = enableKey;
        this.init();
    }

    /** 初始化 */
    private init() {
        if (this.enableButton) {
            // 等待播放器控制栏加载
            poll(() => this.findControlBar(), (controlBar) => {
                if (this.destroyed) return;
                this.createRateButton(controlBar);
            }, 500, 30000);
        }

        if (this.enableKey) {
            this.bindKeyboardEvents();
        }
    }

    /** 查找播放器控制栏 */
    private findControlBar(): HTMLElement | null {
        // 重构播放器控制栏选择器
        const player = document.querySelector('#bilibiliPlayer') || document.querySelector('#bofqi');
        if (!player) return null;
        // 控制栏通常在播放器底部
        const controlBar = player.querySelector('.bilibili-player-video-control-bottom') 
            || player.querySelector('.bilibili-player-video-control-wrap')
            || player.querySelector('.bilibili-player-video-sendbar');
        return controlBar as HTMLElement;
    }

    /** 创建倍速按钮 */
    private createRateButton(controlBar: HTMLElement) {
        // 检查是否已存在
        if (controlBar.querySelector('.blod-playback-rate-btn')) return;

        // 创建按钮
        this.rateButton = document.createElement('div');
        this.rateButton.className = 'blod-playback-rate-btn';
        this.rateButton.textContent = '1.0x';
        this.rateButton.title = '播放倍速';
        this.rateButton.style.cssText = `
            display: inline-block;
            padding: 0 8px;
            height: 28px;
            line-height: 28px;
            color: #fff;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            border-radius: 2px;
            transition: background-color 0.2s;
        `;

        // 鼠标悬停效果
        this.rateButton.addEventListener('mouseenter', () => {
            this.rateButton && (this.rateButton.style.backgroundColor = 'rgba(255,255,255,0.2)');
        });
        this.rateButton.addEventListener('mouseleave', () => {
            this.rateButton && (this.rateButton.style.backgroundColor = 'transparent');
        });

        // 点击事件
        this.rateButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // 插入到控制栏右侧（设置按钮之前）
        const rightArea = controlBar.querySelector('.bilibili-player-video-btn-setting') 
            || controlBar.lastElementChild;
        if (rightArea && rightArea.parentNode) {
            rightArea.parentNode.insertBefore(this.rateButton, rightArea);
        } else {
            controlBar.appendChild(this.rateButton);
        }

        // 创建下拉菜单（初始隐藏）
        this.createRateMenu();
    }

    /** 创建下拉菜单 */
    private createRateMenu() {
        this.rateMenu = document.createElement('div');
        this.rateMenu.className = 'blod-playback-rate-menu';
        this.rateMenu.style.cssText = `
            position: absolute;
            bottom: 40px;
            right: 10px;
            background: rgba(33, 33, 33, 0.9);
            border-radius: 4px;
            padding: 4px 0;
            min-width: 80px;
            display: none;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;

        // 创建菜单项
        RATE_PRESETS.forEach(rate => {
            const item = document.createElement('div');
            item.className = 'blod-playback-rate-item';
            item.textContent = rate.toFixed(2).replace(/\.00$/, '.0').replace(/\.0$/, '') + 'x';
            item.dataset.rate = String(rate);
            item.style.cssText = `
                padding: 6px 16px;
                color: #fff;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
                text-align: center;
            `;

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgba(255,255,255,0.1)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setRate(rate);
                this.hideMenu();
            });

            this.rateMenu!.appendChild(item);
        });

        // 将菜单添加到播放器容器
        const player = document.querySelector('#bilibiliPlayer') || document.querySelector('#bofqi');
        if (player) {
            (player as HTMLElement).style.position = 'relative';
            player.appendChild(this.rateMenu);
        }

        // 点击外部关闭菜单
        document.addEventListener('click', () => this.hideMenu());
    }

    /** 切换菜单显示 */
    private toggleMenu() {
        if (!this.rateMenu) return;
        const isVisible = this.rateMenu.style.display === 'block';
        if (isVisible) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }

    /** 显示菜单 */
    private showMenu() {
        if (!this.rateMenu) return;
        // 更新当前选中项样式
        const items = this.rateMenu.querySelectorAll('.blod-playback-rate-item');
        items.forEach(item => {
            const rate = parseFloat((item as HTMLElement).dataset.rate || '1');
            if (Math.abs(rate - this.currentRate) < 0.01) {
                (item as HTMLElement).style.color = '#00a1d6';
            } else {
                (item as HTMLElement).style.color = '#fff';
            }
        });
        this.rateMenu.style.display = 'block';
    }

    /** 隐藏菜单 */
    private hideMenu() {
        if (!this.rateMenu) return;
        this.rateMenu.style.display = 'none';
    }

    /** 绑定键盘事件 */
    private bindKeyboardEvents() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    /** 键盘按下处理 */
    private handleKeyDown = (e: KeyboardEvent) => {
        // 只处理左右方向键
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        
        // 如果已经在长按状态，不重复处理
        if (this.pressedKey) return;
        
        this.pressedKey = e.key;
        
        // 启动长按定时器
        this.keyTimer = window.setTimeout(() => {
            // 长按触发：临时倍速
            const video = this.getVideoElement();
            if (video && !video.paused && this.currentRate < 2.0) {
                this.setTemporaryRate(2.0);
            }
        }, LONG_PRESS_DELAY);
    };

    /** 键盘释放处理 */
    private handleKeyUp = (e: KeyboardEvent) => {
        if (e.key !== this.pressedKey) return;
        
        // 清除定时器
        if (this.keyTimer) {
            clearTimeout(this.keyTimer);
            this.keyTimer = undefined;
        }
        
        this.pressedKey = undefined;
        
        // 如果处于临时倍速状态，恢复原倍速
        if (this.isTemporary) {
            this.restoreRate();
        }
    };

    /** 获取视频元素 */
    private getVideoElement(): HTMLVideoElement | null {
        return document.querySelector<HTMLVideoElement>('#bilibiliPlayer video') 
            || document.querySelector<HTMLVideoElement>('#bofqi video');
    }

    /** 设置倍速 */
    setRate(rate: number) {
        const video = this.getVideoElement();
        if (!video) {
            toast.warning('未找到播放器！');
            return;
        }
        
        this.currentRate = rate;
        this.isTemporary = false;
        video.playbackRate = rate;
        
        // 更新按钮显示
        if (this.rateButton) {
            this.rateButton.textContent = rate.toFixed(2).replace(/\.00$/, '.0').replace(/\.0$/, '') + 'x';
        }
        
        debug('PlaybackRate', `倍速已设置为 ${rate}x`);
    }

    /** 获取当前倍速 */
    getRate(): number {
        return this.currentRate;
    }

    /** 设置临时倍速 */
    setTemporaryRate(rate: number) {
        if (this.isTemporary) return;
        
        const video = this.getVideoElement();
        if (!video) return;
        
        this.previousRate = this.currentRate;
        this.isTemporary = true;
        video.playbackRate = rate;
        
        // 更新按钮显示（临时状态）
        if (this.rateButton) {
            this.rateButton.textContent = rate.toFixed(1) + 'x';
            this.rateButton.style.color = '#00a1d6';
        }
        
        debug('PlaybackRate', `临时倍速 ${rate}x`);
    }

    /** 恢复倍速 */
    restoreRate() {
        if (!this.isTemporary) return;
        
        this.isTemporary = false;
        this.setRate(this.previousRate);
        
        // 恢复按钮样式
        if (this.rateButton) {
            this.rateButton.style.color = '#fff';
        }
        
        debug('PlaybackRate', `恢复倍速 ${this.previousRate}x`);
    }

    /** 销毁 */
    destroy() {
        this.destroyed = true;
        
        // 清除定时器
        if (this.keyTimer) {
            clearTimeout(this.keyTimer);
        }
        
        // 移除事件监听
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        // 移除DOM元素
        this.rateButton?.remove();
        this.rateMenu?.remove();
        
        this.rateButton = undefined;
        this.rateMenu = undefined;
    }
}
