import { debug } from "../utils/debug";

const nodelist: Function[] = [];
const pendingNodes: HTMLElement[] = [];
let isProcessing = false;
const BATCH_SIZE = 10;

function processNodeQueue() {
    if (isProcessing || pendingNodes.length === 0) return;
    isProcessing = true;

    queueMicrotask(() => {
        const nodesToProcess = pendingNodes.splice(0, BATCH_SIZE);
        
        for (const node of nodesToProcess) {
            for (const callback of nodelist) {
                try {
                    callback(node);
                } catch (e) {
                    debug.error('MutationObserver callback error', e);
                }
            }
        }

        isProcessing = false;
        
        if (pendingNodes.length > 0) {
            processNodeQueue();
        }
    });
}

const observe = new MutationObserver(mutations => {
    let hasNewNodes = false;
    
    for (const mutation of mutations) {
        const addedNode = mutation.addedNodes[0];
        if (addedNode && addedNode instanceof HTMLElement) {
            pendingNodes.push(addedNode);
            hasNewNodes = true;
        }
    }

    if (hasNewNodes && nodelist.length > 0) {
        processNodeQueue();
    }
});

observe.observe(document, { childList: true, subtree: true });
/**
 * 监听新添节点
 * @param callback 添加节点回调，将新添节点信息作为第一个参数传入
 */
export function observerAddedNodes(callback: (node: HTMLElement) => void) {
    try {
        if (typeof callback === "function") nodelist.push(callback);
        return nodelist.length - 1;
    } catch (e) { debug.error(e) }
}
const switchlist: Function[] = [];
/**
 * 切P回调，播放器初次载入也会触发
 * @param callback 回调函数
 */
export function switchVideo(callback: Function) {
    try {
        if (typeof callback === "function") switchlist.push(callback);
    } catch (e) { debug.error("switchVideo", e) }
}
observerAddedNodes((node) => {
    if (/video-state-pause|bpx-player-state-wrap/.test((<HTMLElement>node).className || '')) {
        switchlist.forEach(async d => {
            try {
                d()
            } catch (e) { debug.error(d); }
        });
    }
})