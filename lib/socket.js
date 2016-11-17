var EventEmitter = require('./EventEmitter');
var EJSON = require('./ejson');

class Socket extends EventEmitter {

    constructor (SocketConstructor, endpoint, platform) {
        super();
        this.SocketConstructor = SocketConstructor;
        this.endpoint = endpoint;
        this.rawSocket = null;
        this.platform = platform || "wx";
        this.firstRun = true
    }

    send (object) {
        if (this.closing) {
          console.log("DDP has closed");
          return;
        }
        if (this.platform === 'wx') {
          const message = EJSON.stringify(object);
          // console.log(message, typeof message);
          wx.sendSocketMessage({
            data: message,
          })
          // this.rawSocket.send(message);
          // Emit a copy of the object, as the listener might mutate it.
          this.emit("message:out", EJSON.parse(message));
        }
    }

    open () {

        /*
        *   Makes `open` a no-op if there's already a `rawSocket`. This avoids
        *   memory / socket leaks if `open` is called twice (e.g. by a user
        *   calling `ddp.connect` twice) without properly disposing of the
        *   socket connection. `rawSocket` gets automatically set to `null` only
        *   when it goes into a closed or error state. This way `rawSocket` is
        *   disposed of correctly: the socket connection is closed, and the
        *   object can be garbage collected.
        */
        if (this.rawSocket) {
            return;
        }
        this.closing = false;
        const self = this;
        // console.log(this.platform);
        if (this.platform === 'wx') {
          // 微信初始化连接
          wx.connectSocket({
            url: self.endpoint
          });
          if (self.firstRun) {
            // 监听打开事件
            wx.onSocketOpen(function (res) {
              self.rawSocket = res;
              self.emit("open");
            });
            // 监听关闭事件
            wx.onSocketClose(function (res) {
              // console.log('WebSocket 已关闭！');
              self.rawSocket = null;
              self.emit("close");
              self.closing = false;
            });
            // 监听消息事件
            wx.onSocketMessage(function (message) {
              // console.log('收到服务器内容：' + message.data, message);
              var object;
              try {
                object = EJSON.parse(message.data);
              } catch (ignore) {
                // Simply ignore the malformed message and return
                return;
              }
              // Outside the try-catch block as it must only catch JSON parsing
              // errors, not errors that may occur inside a "message:in" event
              // handler
              self.emit("message:in", object);
            });
            self.firstRun = false
          }
        }else {
          // console.log("----------------" ,this.platform, '----------------');
        }


        // /*
        // *   Calls to `onopen` and `onclose` directly trigger the `open` and
        // *   `close` events on the `Socket` instance.
        // */
        // this.rawSocket.onopen = () => this.emit("open");
        // this.rawSocket.onclose = () => {
        //     this.rawSocket = null;
        //     this.emit("close");
        //     this.closing = false;
        // };
        // /*
        // *   Calls to `onmessage` trigger a `message:in` event on the `Socket`
        // *   instance only once the message (first parameter to `onmessage`) has
        // *   been successfully parsed into a javascript object.
        // */
        // this.rawSocket.onmessage = message => {
        //     var object;
        //     try {
        //         object = EJSON.parse(message.data);
        //     } catch (ignore) {
        //         // Simply ignore the malformed message and return
        //         return;
        //     }
        //     // Outside the try-catch block as it must only catch JSON parsing
        //     // errors, not errors that may occur inside a "message:in" event
        //     // handler
        //     this.emit("message:in", object);
        // };

    }

    close () {
        /*
        *   Avoid throwing an error if `rawSocket === null`
        */
        if (!this.rawSocket) {
          return;
        }
        if (this.platform === 'wx') {
            this.closing = true;
            wx.closeSocket()
        }
    }

}
module.exports = Socket;
