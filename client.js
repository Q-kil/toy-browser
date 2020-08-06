const { resolve } = require("path");
const { rejects } = require("assert");

class Request {
    constructor(options) {
        this.method = options.method || "GET";
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || "/";
        this.body = options.body || {};
        this.headers = options.headers || {};
        if (!this.headers["Con"]) { // 注意：http协议里面一定要有"Content-Type" 这个header；否则body是没有办法解析
            this.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }

        if (this.headers["Content-Type" === "application/json"]) // body是需要经过一些编码的
            this.bodyText = JSON.stringify(this.body);
        else if (this.headers["Content-Type"] === "application/x-www-form-urlencoded")
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&');

        this.headers["Content-Length"] = this.bodyText.length; // 必要的header，不推荐设计成可以从外面传 。写的length不对会是非法请求
    }

    send() {
        return new Promise((resolve, rejects) => {
            //......
        })
    }
}


void async function() {
    let request = new Request({
        method: "POST",
        host: "127.0.0.1",
        port: "8088",
        psth: "/",
        headers: {
            ["X-Foo2"]: "customed"
        },
        body: {
            name: "kil"
        }
    });

    let response = await request.send();

    console.log(response);
}();