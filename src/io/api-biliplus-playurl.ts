import { objUrl } from "../utils/format/url";
import { IPlayurlDash, IPlayurlDurl } from "./api-playurl";

export async function apiBiliplusPlayurl(data: IBiliplusPlayurl) {
    try {
        const response = await fetch(objUrl('//www.biliplus.com/BPplayurl.php', <any>data));
        return <IPlayurlDash | IPlayurlDurl>await response.json();
    } catch (e) {
        throw new Error('BiliPlus API不可用，请使用官方API或更换代理服务器');
    }
}

interface IBiliplusPlayurl {
    module: 'movie' | 'bangumi' | 'pgc';
    cid?: number;
    avid?: number;
    aid?: number;
    ep_id?: number;
    access_key?: string;
    [key: string]: any;
}