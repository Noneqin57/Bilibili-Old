interface BilibiliPlayer {
    getManifest(): any;
    disconnect(): void;
    connect(): void;
    appendTopMessage(data: any): void;
    appendDm(data: any, merge: boolean): void;
    changeNaiveVideo(file: File): void;
    addEventListener(event: string, callback: Function): void;
    directiveDispatcher: any;
    editorCenter: any;
    exitFullScreen(): void;
    getCurrentTime(): number;
    getDuration(): number;
    next(): void;
    ogvUpdate(): void;
    pause(): void;
    play(): void;
    prev(): void;
    reload(): void;
    seek(time: number): void;
    stop(): void;
    volume: number;
    isInitialized(): boolean;
}

interface BilibiliInitialData {
    aid?: number;
    cid?: number;
    upInfo?: {
        mid: number;
        name: string;
        face: string;
    };
    [key: string]: any;
}

interface BilibiliPlayinfo {
    quality: number;
    accept_quality: number[];
    [key: string]: any;
}

interface BilibiliWindow extends Window {
    aid?: number;
    cid?: number;
    player?: BilibiliPlayer;
    __INITIAL_STATE__?: BilibiliInitialData;
    __playinfo__?: BilibiliPlayinfo;
    nano?: {
        createPlayer(initData: any): any;
    };
    jQuery?: any;
    EmbedPlayer?: Function;
    webpackJsonp?: any[];
    _babelPolyfill?: any;
    [key: string]: any;
}

declare global {
    interface Window extends BilibiliWindow {}
}

export {};
