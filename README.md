# SCF Service Stack

本模块是一个工具集，在开发腾讯小程序的云函数时，为了实现一个serverless的http/https服务，旧的tcb-router无法对实际的path做有效的判断，无法统一做异常处理，在对path进行判断时也不够精确，例如'/user/:name'这种类型的路径无法识别，所以自己新开发了一个router，让会用express开发的开发者们快速上手。

本模块目前有两功能：
- 云函数在开发时模拟express的开发，让开发者平滑过渡，也方便移植。
- 本地开发时，启动一个本地服务，模拟腾讯云转换请求的过程，调用所开发的云函数，增加开发效率，方便debug

准备：
有一个微信小程序的云函数，并且该云函数已部署到云端开通了云接入(HTTP访问)，[官方文档](https://docs.cloudbase.net/service/access-cloud-function.html)

---

### **Router功能：**


```javascript
// webservice/index.js
const { bodyParser, staticHandler, cookieParser, LocalStorageClient, TCBStorageClient, sessionParser } = require('scf-service-stack').middlewares;
const SCFRouter = require('scf-service-stack').router;
const wechatRouter = require('./routers/wechat.router');
// 这是一个云函数的的入口
exports.main = async (request, context) => {
  // 此时的request，结构参照[腾讯文档](https://docs.cloudbase.net/service/access-cloud-function.html#yun-han-shu-de-ru-can)
  const app = new SCFRouter(request, {
    templateFolder: path.join(__dirname, 'templates'),  // 存放ejs文件的目录
  });
  // 中间件的导入
  app.use(staticHandler(path.join(__dirname, 'public')));   // 静态文件地址
  app.use(bodyParser);
  app.use(cookieParser);
  app.use(sessionParser(new LocalStorageClient(), {maxAge: 600}));  // session存入本地，但是因为云函数为动态资源，所以不推荐使用，有很大概率取不到值
  // app.use(   // 用云数据库来存放session可以保证session跨资源也不丢失
  //   sessionParser(
  //     new TCBStorageClient(
  //       process.env['REMOTE_CACHE_SECRET_ID'],   // session对应云环境的secret ID
  //       process.env['REMOTE_CACHE_SECRET_KEY'],  // session对应云环境的secret Key
  //       process.env['REMOTE_CACHE_ENVID'],       // session对应云环境的ENV ID
  //       process.env['REMOTE_CACHE_COLLECTION']   // 将session存入该环境中的某个collection名称
  //     ),
  //     {maxAge: 600}
  //   )
  // );

  // 同express一样，use代表不过滤 httpMethod
  app.use(async (req, res, next) => {
    // 这里可以写一些中间件的逻辑，鉴权等等
    next();
  });

  app.get('/', async (req, res) => {
    res.render('index');    // 请求页面
  });

  app.post('/test/:user', async (req, res) => {
    res.json(req.params);   // 请求返回json数据,req.params为url中path的参数
  });

  app.extends(wechatRouter);    // 继承另一个router

  // 此段逻辑可以写在最后，用来处理未定义的path
  app.use(async (req, res, next) => {
    throw new Error('no mapping routers');  // 有任何报错都会返回500的请求码
  });

  return app.serve();
};
```

```js
// webservice/routers/wechatRouter.js
const route = async (sr) => {
    // 设置一个cookie
  sr.use('/test', async (req, res) => {
    console.log(req.cookies);
    res.cookie('sid', 'asdasdsadasdas');
    res.json(req.cookies);
  });

  sr.use('/text', async (req, res) => {
    res.text('123');
  });

  sr.use('/test/session', async (req, res) => {
    // session 模块在本地可以用local
    console.log(req.cookies['sid']);
    req.session.a = 1;
    req.session.b = 1;
    res.text('123');
  });

  sr.use('/test/session2', async (req, res) => {
    console.log(req.cookies['sid']);
    req.session.a++;
    res.json(req.session);
  });

  sr.use('/test/delete-session', async (req, res) => {
    delete req.session.a;
    res.json(req.session);
  });

  sr.get('/test-regex/:a/:b', async (req, res, next) => {
    console.log(req.params);
    next();
  });

  sr.get('/test-regex/:c/:d', async (req, res, next) => {
    console.log(req.params);
    next();
  });
};

module.exports = route;

```
### Router功能备注：
1. `app.use(func)`这个方法可以多次使用，只要前面的handler都调用了next()方法，则所有符合规则的都会顺次执行
2. (已优化)~~集成响应相关内容[参照文档](https://docs.cloudbase.net/service/access-cloud-function.html#fan-hui-ji-cheng-xiang-ying)，若有需要，请在issue里写明需求。后续上线responseGenerator功能可以更简便的返回复杂类型，比如用ejs模版引擎等。~~
3. 目前大部分使用场景都在以上代码里有范例

---


### **Simulator功能**

假设有一个云函数叫做webservice,代码内容如Router里的demo类似。为了尽可能便捷的开发测试，可以启动一本地模拟服务去转换请求。
目录结构为：
```
root
 - public
   - ...    // 静态资源
 - routes
   - *.js   // 所有的子路由
 - app.js   // 逻辑入口
 - env.json // 环境变量配置
 - index.js // 主入口
 - package.json
```
```javascript
// index.js
const fs = require('fs');
const Simulator = require('scf-service-stack').simulator;
const simulator = new Simulator(require('./env.json'));
simulator.deploy(require('./app'), {
  key: fs.readFileSync(`cert.key`),
  cert: fs.readFileSync(`cert.pem`),
});
// deploy方法第二个参数在本地启动时如果是http请求可为空
```
```javascript
// app.js
// 同第一部分webservice/index.js，也就是云函数的入口文件
```
这里有一个配置文件的env.json:
```javascript
{
  "functionEnvVariables": {
    "ENV1": "1",  // 环境变量都写在这里，只能是字符串
    "ENV2": "2"
  },
  "context": {
    "appId": "wxtinkcaiappid831",
    "uin": "mockuintinkcai831",
    "envId": "local"
  },
  "port": 3000, // 启动的本地端口
  "protocol": "http" // 是否开启https，或者为http
}


```


---
### 后续：
目前已经有一个功能很全的CI/CD流程，可实现一个云函数做成一个综合性的网站，利用云开发提供的存储和数据库功能提供完整服务，在一定流量内免费使用。如有需要请联系236976861@qq.com或者在该资源下留言。
