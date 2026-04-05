import { debug } from "../utils/debug";
import { handleError, ErrorLevel } from "../utils/error";
import { toast } from "./toast";

enum RecoveryEvent {
    NETWORK_ERROR = "网络错误",
    DECODE_ERROR = "解码错误",
    STALLED = "播放卡顿",
    ABORT = "加载中止",
    CRASH = "播放器崩溃"
}

interface RetryState {
    count: number;
    maxRetries: number;
    baseDelay: number;
    lastError: Error | null;
    lastAttempt: number;
    isRetrying: boolean;
}

const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    stallThreshold: 5000,
    crashThreshold: 3,
    crashWindowMs: 30000
};

export class PlayerRecovery {
    private video: HTMLVideoElement | null = null;
    private boundHandlers: { event: string; handler: EventListener }[] = [];
    private retry: RetryState = {
        count: 0,
        maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
        baseDelay: DEFAULT_RETRY_CONFIG.baseDelay,
        lastError: null,
        lastAttempt: 0,
        isRetrying: false
    };
    private errorHistory: { time: number; type: RecoveryEvent }[] = [];
    private stallTimer?: number;
    private enabled = true;
    private onCrashCallback?: () => void;

    constructor(config?: Partial<typeof DEFAULT_RETRY_CONFIG>) {
        Object.assign(this.retry, {
            maxRetries: config?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
            baseDelay: config?.baseDelay ?? DEFAULT_RETRY_CONFIG.baseDelay
        });
    }

    watch(video: HTMLVideoElement | null): void {
        this.dispose();
        if (!video) return;
        this.video = video;
        this.bindEvents();
        debug('PlayerRecovery', '开始监控视频元素');
    }

    onCrash(callback: () => void): void {
        this.onCrashCallback = callback;
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    private bindEvents(): void {
        if (!this.video) return;
        const events: [string, (e: Event) => void][] = [
            ['error', this.onVideoError.bind(this)],
            ['stalled', this.onStalled.bind(this)],
            ['waiting', this.onWaiting.bind(this)],
            ['playing', this.onPlaying.bind(this)],
            ['abort', this.onAbort.bind(this)]
        ];
        events.forEach(([event, handler]) => {
            const bound = handler as EventListener;
            this.video!.addEventListener(event, bound);
            this.boundHandlers.push({ event, handler: bound });
        });
    }

    private onVideoError(e: Event): void {
        if (!this.enabled || !this.video) return;
        const videoError = this.video.error;
        const errorCode = videoError?.code ?? 0;
        const errorMessages: Record<number, string> = {
            1: 'MEDIA_ERR_ABORTED - 加载被中止',
            2: 'MEDIA_ERR_NETWORK - 网络错误',
            3: 'MEDIA_ERR_DECODE - 解码错误',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - 格式不支持'
        };
        const message = errorMessages[errorCode] || `未知错误 (code=${errorCode})`;
        handleError(new Error(message), 'PlayerRecovery',
            errorCode === 2 ? ErrorLevel.WARN : ErrorLevel.ERROR,
            `${RecoveryEvent.NETWORK_ERROR}: ${message}`);
        if (errorCode === 2 || errorCode === 3) {
            this.attemptRetry(RecoveryEvent.NETWORK_ERROR);
        }
        this.recordError(errorCode === 4 ? RecoveryEvent.DECODE_ERROR : RecoveryEvent.NETWORK_ERROR);
    }

    private onStalled(_e: Event): void {
        if (!this.enabled) return;
        this.stallTimer = window.setTimeout(() => {
            if (this.video && !this.video.paused && !this.video.ended) {
                handleError(new Error('视频播放卡顿超过5秒'), 'PlayerRecovery', ErrorLevel.WARN, RecoveryEvent.STALLED);
                this.attemptRetry(RecoveryEvent.STALLED);
            }
        }, DEFAULT_RETRY_CONFIG.stallThreshold);
    }

    private onWaiting(_e: Event): void {
        if (this.stallTimer) clearTimeout(this.stallTimer);
        this.stallTimer = window.setTimeout(() => {
            if (this.video && !this.video.paused) {
                debug.warn('PlayerRecovery', '视频缓冲等待超过5秒');
            }
        }, DEFAULT_RETRY_CONFIG.stallThreshold);
    }

    private onPlaying(_e: Event): void {
        this.resetStall();
        if (this.retry.isRetrying) {
            debug('PlayerRecovery', '重连成功，播放恢复正常');
            this.resetRetry();
        }
    }

    private onAbort(_e: Event): void {
        if (!this.enabled) return;
        handleError(new Error('视频加载被中止'), 'PlayerRecovery', ErrorLevel.WARN, RecoveryEvent.ABORT);
    }

    private resetStall(): void {
        if (this.stallTimer) {
            clearTimeout(this.stallTimer);
            this.stallTimer = undefined;
        }
    }

    private recordError(type: RecoveryEvent): void {
        const now = Date.now();
        this.errorHistory.push({ time: now, type });
        this.errorHistory = this.errorHistory.filter(e => now - e.time < DEFAULT_RETRY_CONFIG.crashWindowMs);
        if (this.errorHistory.length >= DEFAULT_RETRY_CONFIG.crashThreshold) {
            this.handleCrash();
        }
    }

    private attemptRetry(triggerEvent: RecoveryEvent): void {
        if (this.retry.isRetrying || this.retry.count >= this.retry.maxRetries) {
            if (this.retry.count >= this.retry.maxRetries) {
                toast.warning('重连已达最大次数', `已尝试 ${this.retry.maxRetries} 次，请检查网络或刷新页面`)();
            }
            return;
        }
        this.retry.isRetrying = true;
        this.retry.count++;
        const delay = this.retry.baseDelay * Math.pow(2, this.retry.count - 1);
        this.retry.lastAttempt = Date.now();
        toast.warning(`检测到 ${triggerEvent}`, `${delay / 1000}s 后自动重连 (${this.retry.count}/${this.retry.maxRetries})`)();
        debug('PlayerRecovery', `将在 ${delay}ms 后尝试第 ${this.retry.count} 次重连`);
        setTimeout(() => {
            if (this.video) {
                const currentTime = this.video.currentTime;
                const paused = this.video.paused;
                this.retry.isRetrying = false;
                try {
                    this.video.load();
                    if (!paused) {
                        this.video.play().catch(e => {
                            handleError(e, 'PlayerRecovery', ErrorLevel.WARN, '自动播放恢复失败');
                        });
                    }
                    if (currentTime > 0) {
                        this.video.currentTime = currentTime;
                    }
                    this.retry.lastError = null;
                } catch (e) {
                    this.retry.lastError = e instanceof Error ? e : new Error(String(e));
                    handleError(e, 'PlayerRecovery', ErrorLevel.ERROR, `重连 #${this.retry.count} 失败`);
                }
            }
        }, delay);
    }

    private resetRetry(): void {
        this.retry.count = 0;
        this.retry.isRetrying = false;
        this.retry.lastError = null;
    }

    private handleCrash(): void {
        handleError(new Error(`连续 ${DEFAULT_RETRY_CONFIG.crashThreshold} 次错误，判定为播放器崩溃`),
            'PlayerRecovery', ErrorLevel.FATAL, RecoveryEvent.CRASH);
        const msg = toast.list('播放器出现严重错误 >>>',
            `> 连续 ${DEFAULT_RETRY_CONFIG.crashThreshold} 次异常`,
            '> 正在尝试自动恢复...');
        setTimeout(() => {
            msg.type = 'error';
            msg.delay = 6;
            this.dispose();
            if (this.onCrashCallback) {
                this.onCrashCallback();
            }
        }, 2000);
    }

    dispose(): void {
        this.resetStall();
        if (this.video) {
            this.boundHandlers.forEach(({ event, handler }) => {
                this.video!.removeEventListener(event, handler);
            });
            this.boundHandlers = [];
            this.video = null;
        }
        this.resetRetry();
        this.errorHistory = [];
    }
}
