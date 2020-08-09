const net = require('net');
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

    send(connection) {
        return new Promise((resolve, reject) => {
            // resolve("");
            const parser = new ResponseParser;
            if (connection) {
                connection.write(this.toString());
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString());
                })
            }
            connection.on('data', (data) => {
                console.log(data.toString());
                parser.receive(data.toString());
                if (parser.isFinished) {
                    resolve(parser.response);
                    connection.end();
                }
            });
            connection.on('error', (err) => {
                console.log('err ---', err);
                reject(err);
                connection.end();
            })
        })
    }

    toString() {
            return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`
            // return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`
        }
        // toString() {
        //     let stream = [
        //         `${this.method} ${this.path} HTTP/1.1\r\n`,
        //         ...Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}\r\n`),
        //         '\r\n',
        //         `${this.bodyText}\r\n`
        //     ]
        //     return stream.join('');
        // }
}

class ResponseParser {
    constructor() {}
    receive(string) {
        for (let i = 0; i < string.length; i++) {
            this.receiveChar(string.charAt(i));
        }
    }
    receiveChar(char) {

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