# Warning(Experimental)

>  This is just a pilot project, please used with caution in production

## Wrap Meteor DDP for wechat-mina(微信小程序)

> inspired by [react-native-meteor](https://github.com/inProgress-team/react-native-meteor)

Meteor-like methods for wechat-mina

> example for ddp test
[wechat-mina-ddp-example](https://github.com/Micjoyce/wechat-mina-ddp-example)

## Todos

> Local cache for mimimongo



# Support meteor-streamer

## How to use meteor-streamer for wechat-mina

### You must add meteor-streamer to you meteor project

```shell
cd wxMeteor  // You meteor project
meteor add meteor-streamer
```

### Create streamer at server

```shell
cd wxMeteor/server
touch streamer.js
vi streamer.js
```

### Write a streamer

```javascript
msgStreamer = new Meteor.Streamer('message');

msgStreamer.allowRead('all');
msgStreamer.allowWrite('all');


Meteor.startup(function(){
  Meteor.setInterval(function(){
    msgStreamer.emit("message", {msg: "hello"});
  }, 1000);
});

```


###  Use it At wx-mina

```javascript
// Meteor streamer
var Streamer = require('./meteor/stream/Streamer');
wx.Streamer = Streamer;

var msgStreamer = new Streamer("message");
wx.msgStreamer = msgStreamer;
msgStreamer.on('message', function(msg) {
  console.log(msg);
});

```

> Then You wxapp will get a message for each second


# API

## Meteor DDP connection

### Meteor.connect(url, options)

Connect to a DDP server. You only have to do this once in your app.

```javascript
//app.js
App({
  onLaunch: function () {
    //调用API从本地缓存中获取数据
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs);

    // User Meteor.connect(endpoint, options);
    var Meteor = require('./meteor/Meteor')
    var _ = Meteor.underscore;
    Meteor.connect('ws://localhost:3000/websocket');
    wx.Meteor = Meteor;
  },
  getUserInfo:function(cb){
    var that = this
    if(this.globalData.userInfo){
      typeof cb == "function" && cb(this.globalData.userInfo)
    }else{
      //调用登录接口
      wx.login({
        success: function () {
          wx.getUserInfo({
            success: function (res) {
              that.globalData.userInfo = res.userInfo
              typeof cb == "function" && cb(that.globalData.userInfo)
            }
          })
        }
      })
    }
  },
  globalData:{
    userInfo:null
  }
})
```
> Use at pages

```javascript
//index.js
//获取应用实例
var app = getApp()
var Meteor = wx.Meteor;
var util = require('../../utils/util.js')
var _ = Meteor.underscore;

function sortMessage(msgArr){
  if (!_.isArray(msgArr)) {
    return msgArr;
  }
  return msgArr.sort(function(a, b){
    return new Date(b._updateAt) - new Date(a._updateAt);
  });
}

Page({
  data: {
    messages: [],
    userInfo: {},
    inputValue: ""
  },
  //事件处理函数
  bindKeyInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },
  sendMessage: function(e) {
    var self = this;
    var msg = this.data.inputValue;
    if (!msg || msg.length < 1) {
      return;
    }
    Meteor.call("sendMessage", msg, function(err, result) {
      if (!err) {
        self.setData({
          inputValue: ""
        })
        console.log("发送成功");
      }
    })
  },
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    var that = this
    //调用应用实例的方法获取全局数据
    app.getUserInfo(function(userInfo){
      //更新数据
      that.setData({
        userInfo:userInfo
      })
    });
    // 数据订阅
    var subReady = Meteor.subscribe('message.all');
    var DDP = Meteor.getData().ddp;
    Meteor.Tracker.autorun(function(){
      console.log("message.all 订阅状态",subReady.ready())
    });
    DDP.on("added", ({collection, id, fields}) => {
      this.setData({
        messages: sortMessage(Meteor.collection(collection).find())
      })
    });
    DDP.on("changed", ({collection, id, fields}) => {
      this.setData({
        messages: sortMessage(Meteor.collection(collection).find())
      })
    });
    DDP.on("removed", ({collection, id}) => {
      this.setData({
        messages: sortMessage(Meteor.collection(collection).find())
      })
    });
  }
})
```

*Arguments*

### Meteor.connect(url, options)

- `url` **string** *required*
- `options` **object** Available options are :
  - autoConnect **boolean** [true] whether to establish the connection to the server upon instantiation. When false, one can manually establish the connection with the Meteor.ddp.connect method.
  - autoReconnect **boolean** [true] whether to try to reconnect to the server when the socket connection closes, unless the closing was initiated by a call to the disconnect method.
  - reconnectInterval **number** [10000] the interval in ms between reconnection attempts.

### Meteor.disconnect()

Disconnect from the DDP server.

## Meteor methods

* [Meteor.call](http://docs.meteor.com/#/full/meteor_call)
* [Meteor.loginWithPassword](http://docs.meteor.com/#/full/meteor_loginwithpassword) (Please note that user is auto-resigned in - like in Meteor Web applications - use wx Storage store user token.)
* [Meteor.logout](http://docs.meteor.com/#/full/meteor_logout)
* [Meteor.logoutOtherClients](http://docs.meteor.com/#/full/meteor_logoutotherclients)

## Availables packages

###  Convenience packages
Example `var Meteor = require('./meteor/Meteor');``

* Meteor.EJSON
* Meteor.Tracker
* Meteor.JSON
* Meteor.underscore

### ReactiveDict

See [documentation](https://atmospherejs.com/meteor/reactive-dict).


### Meteor.Accounts

* [Accounts.createUser](http://docs.meteor.com/#/full/accounts_createuser)
* [Accounts.changePassword](http://docs.meteor.com/#/full/accounts_forgotpassword)
* [Accounts.forgotPassword](http://docs.meteor.com/#/full/accounts_changepassword)
* [Accounts.resetPassword](http://docs.meteor.com/#/full/accounts_resetpassword)
* [Accounts.onLogin](http://docs.meteor.com/#/full/accounts_onlogin)
* [Accounts.onLoginFailure](http://docs.meteor.com/#/full/accounts_onloginfailure)

### Meteor.ddp

Once connected to the ddp server, you can access every method available in [ddp.js](https://github.com/mondora/ddp.js/).
* Meteor.ddp.on('connected')
* Meteor.ddp.on('added')
* Meteor.ddp.on('changed')
* ...


# Author
* Michaelxu ([Michaelxu](https://github.com/Micjoyce))

Thanks for [react-native-meteor](https://github.com/inProgress-team/react-native-meteor)
* Théo Mathieu ([@Mokto](https://github.com/Mokto))
* From [inProgress](https://in-progress.io)

# Want to help ?

Pull Requests and issues reported are welcome ! :)
