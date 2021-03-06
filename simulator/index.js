const http = require('http');
const https = require('https');

const parse = (rawBody) => {
  const params = rawBody.split('&');
  const body = {};
  for (let i = 0; i < params.length; i++) {
    const str = params[i].split('=');
    body[str[0]] = str[1];
  }
  return body;
};

class SCFSimulator {
  setEnv(env) {
    for (let key in env) {
      console.log(`put ${key} to the environment`);
      process.env[key] = env[key];
    }
  }

  getDecoratedRequest(req, rawBody) {
    const getPathAndParameters = (url) => {
      let pathEndIndex = url.indexOf('?');
      pathEndIndex = pathEndIndex > -1 ? pathEndIndex : url.length;
      return {
        path: url.substring(0, pathEndIndex),
        parameters:
          pathEndIndex === url.length
            ? {}
            : parse(url.substring(pathEndIndex + 1)),
      };
    };
    const request = {};
    const queryObject = getPathAndParameters(req.url);
    request.headers = req.headers;
    request.path = queryObject.path;
    request.httpMethod = req.method;
    request.requestContext = {
      requestId: 'mock-request-' + new Date().getTime(),
      envId: this.envConfig.context.envId,
      appId: this.envConfig.context.appId,
      uin: this.envConfig.context.uin,
    };
    request.queryStringParameters = queryObject.parameters;
    request.body = rawBody;
    if (req.headers) {
      req.headers[`x-forwarded-proto`] = req.headers[`x-client-proto`] = (this.envConfig.protocol === 'https') ? 'https' : 'http';
      req.headers[`x-client-proto-ver`] = `HTTP/${req.httpVersion}`;
      req.headers[`x-real-ip`] = req.headers[`x-forwarded-for`] = req.connection.remoteAddress;
    }
    req.headers[`isBase64Encoded`] = false;
    return request;
  }

  resolve(req, res, body) {
    this.entrance(this.getDecoratedRequest(req, body), {})
      .then((response) => {
        if (typeof response === 'string' || typeof response === 'number') {
          res
            .writeHead(200, {
              'Content-Length': Buffer.byteLength(response + ''),
              'Content-Type': 'text/plain',
            })
            .end(response);
        } else if (typeof response === 'object') {
          if (response.statusCode) {
            if (typeof response.body === 'object') {
              res
                .writeHead(response.statusCode, response.headers)
                .end(JSON.stringify(response.body));
            } else {
              res
                .writeHead(response.statusCode, response.headers)
                .end(response.body);
            }
          } else {
            res
              .writeHead(200, {
                'Content-Length': Buffer.byteLength(JSON.stringify(response)),
                'Content-Type': 'application/json',
              })
              .end(JSON.stringify(response));
          }
        }
      })
      .catch((e) => {
        res
          .writeHead(500, {
            'Content-Length': Buffer.byteLength(e.stack),
            'Content-Type': 'text/plain',
          })
          .end(e.stack);
      });
  }

  constructor(envConfig) {
    // TODO deploy different scfs
    this.envConfig = envConfig;
    this.setEnv(envConfig.functionEnvVariables);
  }

  deploy(entrance, httpsOptions) {
    this.entrance = entrance;
    const self = this;
    const handler = function (req, res) {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        self.resolve(req, res, body);
      });
    };
    let server;
    if (this.envConfig.protocol === 'https') {
      server = https.createServer(httpsOptions, handler);
    } else {
      server = http.createServer(handler);
    }
    server.listen(this.envConfig.port || 3001);

    console.log(
      `the mock service has been setup at ${
        this.envConfig.protocol === 'https' ? 'https' : 'http'
      }://localhost:${this.envConfig.port || 3001}`
    );
  }
}

module.exports = SCFSimulator;
