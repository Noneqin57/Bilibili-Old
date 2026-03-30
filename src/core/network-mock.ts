import { xhrHook } from "../utils/hook/xhr";
import { user } from "./user";

let networkMocked = false;

const responseProperties = ['status', 'statusText', 'response', 'responseText', 'responseXML'];

function defineRes(target: XMLHttpRequest, res: any, v: () => void) {
    for (const prop of responseProperties) {
        Object.defineProperty(target, prop, {
            configurable: true,
            writable: true,
            value: res[prop]
        });
    }
    Object.defineProperty(target, 'responseURL', {
        configurable: true,
        writable: true,
        value: res.finalUrl
    });
    v();
}
/** 模拟APP端取流 */
export function networkMock() {
    if (!networkMocked) {
        networkMocked = true;
        if (_UserScript_) {
            xhrHook.ultra('.m4s', function (target, args) {
                const obj: any = {
                    method: <"GET" | "HEAD" | "POST">args[0],
                    url: args[1],
                    headers: {
                        "user-agent": user.userStatus!.userAgent
                    },
                    onloadstart: (res: any) => {
                        defineRes(this, res, () => { });
                    }
                }
                args[2] || (obj.anonymous = true);
                Object.defineProperties(this, {
                    responseType: {
                        configurable: true,
                        set: v => {
                            obj.responseType = v;
                        },
                        get: () => obj.responseType
                    },
                    onload: {
                        configurable: true,
                        set: v => {
                            obj.onload = (res: any) => {
                                defineRes(this, res, v);
                            }
                        },
                        get: () => obj.onload
                    },
                    onerror: {
                        configurable: true,
                        set: v => {
                            obj.onerror = (res: any) => {
                                defineRes(this, res, v);
                            }
                        },
                        get: () => obj.onerror
                    },
                    timeout: {
                        configurable: true,
                        set: v => {
                            obj.timeout = v
                        },
                        get: () => obj.timeout
                    },
                    ontimeout: {
                        configurable: true,
                        set: v => {
                            obj.ontimeout = (res: any) => {
                                defineRes(this, res, v);
                            }
                        },
                        get: () => obj.ontimeout
                    },
                    onprogress: {
                        configurable: true,
                        set: v => {
                            obj.onprogress = (res: any) => {
                                defineRes(this, res, v.bind(this, new ProgressEvent("progress", {
                                    lengthComputable: res.lengthComputable,
                                    loaded: res.loaded,
                                    total: res.total
                                })));
                            }
                        },
                        get: () => obj.onprogress
                    },
                    onabort: {
                        configurable: true,
                        set: v => {
                            obj.onabort = (res: any) => {
                                defineRes(this, res, v);
                            }
                        },
                        get: () => obj.onabort
                    },
                    onreadystatechange: {
                        configurable: true,
                        set: v => {
                            obj.onreadystatechange = (res: any) => {
                                defineRes(this, res, v);
                            }
                        },
                        get: () => obj.onreadystatechange
                    },
                    setRequestHeader: {
                        configurable: true,
                        value: (name: string, value: string) => {
                            obj.headers && (obj.headers[name] = value);
                        }
                    },
                    send: {
                        configurable: true,
                        value: (body?: any) => {
                            obj.method === "POST" && body && (obj.data = body);
                            const tar = GM.xmlHttpRequest(obj);
                            this.abort = tar.abort.bind(tar);
                            return true;
                        }
                    }
                })
            })
        } else {
            GM.modifyRequestheader('.m4s?', {
                'user-agent': 'Bilibili Freedoooooom/MarkII',
                referer: undefined
            });
            GM.modifyRequestheader('.flv?', {
                'user-agent': 'Bilibili Freedoooooom/MarkII',
                referer: undefined
            });
        }
    }
}