export function poll<T>(check: () => T, callback: (tar: Exclude<T, null | false | undefined>) => void, delay: number = 100, stop: number = 180) {
    const result = check();
    if (result) {
        callback(<Exclude<T, null | false | undefined>>result);
        return;
    }

    let timer: ReturnType<typeof setInterval>;
    let stopped = false;

    const stopPolling = () => {
        if (!stopped) {
            stopped = true;
            clearInterval(timer);
        }
    };

    timer = setInterval(() => {
        if (stopped) return;
        const d = check();
        if (d) {
            stopPolling();
            callback(<Exclude<T, null | false | undefined>>d);
        }
    }, delay);

    if (stop > 0) {
        setTimeout(stopPolling, stop * 1000);
    }
}