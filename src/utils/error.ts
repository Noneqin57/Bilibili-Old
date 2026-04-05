import { debug } from "./debug";
import { toast } from "../core/toast";

export enum ErrorLevel {
    SILENT = "SILENT",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}

export class BilibiliError extends Error {
    constructor(
        message: string,
        public readonly module: string,
        public readonly code: string,
        public readonly level: ErrorLevel = ErrorLevel.ERROR,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = "BilibiliError";
    }
}

const LEVEL_LOGGERS: Record<ErrorLevel, (...data: any[]) => void> = {
    [ErrorLevel.SILENT]: (...data: any[]) => debug.debug("[SILENT]", ...data),
    [ErrorLevel.WARN]: (...data: any[]) => debug.warn("[WARN]", ...data),
    [ErrorLevel.ERROR]: (...data: any[]) => debug.error("[ERROR]", ...data),
    [ErrorLevel.FATAL]: (...data: any[]) => debug.error("[FATAL]", ...data)
};

export function handleError(
    error: unknown,
    module: string,
    level: ErrorLevel = ErrorLevel.WARN,
    context?: string
): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const prefix = context ? `[${module}] ${context}` : `[${module}]`;
    LEVEL_LOGGERS[level](prefix, err.message || err);
    if (level === ErrorLevel.FATAL) {
        toast.error("发生严重错误", `${prefix}`, err)();
    } else if (level === ErrorLevel.ERROR) {
        toast.warning("操作出现异常", `${prefix}`)();
    }
}

export function safeCall<T>(fn: () => T, module: string, context?: string, fallback?: T): T | undefined {
    try {
        return fn();
    } catch (e) {
        handleError(e, module, ErrorLevel.SILENT, context);
        return fallback;
    }
}

export function safeAsyncCall<T>(
    fn: () => Promise<T>,
    module: string,
    context?: string
): Promise<T | undefined> {
    return fn().catch(e => {
        handleError(e, module, ErrorLevel.WARN, context);
        return undefined;
    });
}
