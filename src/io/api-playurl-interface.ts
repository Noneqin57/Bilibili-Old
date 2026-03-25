import { IPlayurlDurl } from "./api-playurl";
import { ApiSign } from "./api-sign";
import { fnval, fnver } from "./fnval";
import { URLS } from "./urls";
import { jsonCheck } from "./api";

export class ApiPlayurlInterface extends ApiSign {
    constructor(protected data: IApiPlayurlInterface, pgc = false) {
        super(pgc ? URLS.PLAYURL_BANGUMI : URLS.PLAYURL_INTERFACE, 'YvirImLGlLANCLvM');
        this.data = Object.assign({
            otype: 'json',
            qn: data.quality,
            type: '',
            fnver,
            fnval
        }, data, pgc ? { module: "bangumi", season_type: 1 } : {});
    }
    async getData() {
        const response = await fetch(this.sign().toJSON(), { credentials: 'include' });
        const json = await response.json();
        return <IPlayurlDurl>jsonCheck(json);
    }
}

interface IApiPlayurlInterface {
    otype?: string;
    quality?: number;
    type?: string;
    cid: number;
}