import { BLOD } from "../../core/bilibili-old";
import { toast } from "../../core/toast";
import { urlCleaner } from "../../core/url";
import htmlChannel from "../../html/channel.html";
import { debug } from "../../utils/debug";
import { poll } from "../../utils/poll";
import { Header } from "../header";
import { Page } from "../page";

/** 频道名称到tid的映射 */
const channelTid: Record<string, number> = {
    'douga': 1,
    'music': 3,
    'game': 4,
    'ent': 5,
    'dance': 129,
    'kichiku': 119,
    'knowledge': 36,
    'fashion': 155,
    'life': 160,
    'cinephile': 181,
    'tech': 188,
    'information': 202,
};

/** 频道名称到中文标题的映射 */
const channelTitle: Record<string, string> = {
    'douga': '动画',
    'music': '音乐',
    'game': '游戏',
    'ent': '娱乐',
    'dance': '舞蹈',
    'kichiku': '鬼畜',
    'knowledge': '知识',
    'fashion': '时尚',
    'life': '生活',
    'cinephile': '影视',
    'tech': '科技',
    'information': '资讯',
};

export class PageChannel extends Page {
    constructor() {
        super(htmlChannel);
        const name = BLOD.path[4];
        // 旧版jinkela JS通过URL解析频道，需要将/c/改为/v/
        if (name && location.pathname.includes('/c/')) {
            urlCleaner.updateLocation(location.href.replace(new RegExp(`/c/${name}/?`), `/v/${name}/`));
        }
        // 设置页面标题
        if (name && channelTitle[name]) {
            document.title = `${channelTitle[name]} - 哔哩哔哩 (゜-゜)つロ 干杯~-bilibili`;
        }
        this.setChannelWindow();
        Header.primaryMenu();
        Header.banner();
        this.updateDom();
        this.sliderData();
        this.checkChannelLoad();
    }
    /** 设置频道页所需的window全局变量 */
    private setChannelWindow() {
        const name = BLOD.path[4];
        if (name && channelTid[name]) {
            (<any>window).tid = channelTid[name];
        }
    }
    get carousel() {
        switch (BLOD.path[4]) {
            case 'douga': return 4973;
            case 'music': return 4991;
        }
    }
    private sliderData() {
        const carousel = this.carousel;
        if (carousel) {
            poll(() => document.querySelector<any>('.channel-m>.nominate-m'), slider => {
                fetch(`https://api.bilibili.com/x/web-show/res/locs?pf=0&ids=${carousel}`)
                    .then(d => d.json())
                    .then(d => {
                        if (slider && slider.__vue__ && d.data && d.data[carousel]) {
                            slider.__vue__.sliderData = d.data[carousel].filter((d: any) => d.name);
                        }
                    })
                    .catch(e => {
                        debug.error('channel carousel', e);
                    });
            });
        }
    }
    /** 检测旧版频道JS是否加载成功 */
    private checkChannelLoad() {
        setTimeout(() => {
            const app = document.querySelector('#channel-app');
            if (app && (!app.children.length || !app.innerHTML.trim())) {
                toast.warning('频道页旧版资源加载失败');
                debug.warn('Channel jinkela JS failed to load');
            }
        }, 8000);
    }
}
