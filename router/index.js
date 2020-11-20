const { match } = require('path-to-regexp');
const Response = require('./Response');

class SCFServiceRouter {
  constructor(request, options) {
    this._handlers = [];
    this._request = request;
    this.options = options || {};
    this._response = new Response(this._request, this.options);
  }

  /**
   * add handlers
   * @param paths
   * @param handler
   * @param method
   */
  add(paths, handler, method) {
    if (typeof paths === 'function') {
      handler = paths;
      this._handlers.push({ func: handler });
      return;
    }
    if (method === 'ALL' || method === this._request.httpMethod) {
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      for (const path of paths) {
        const regTester = match(path, { decode: decodeURIComponent });
        const testResult = regTester(this._request.path);
        if (testResult) {
          this._handlers.push({ func: handler, params: testResult.params });
        }
      }
    }
  }

  extends(addRoute) {
    const sr = new SCFServiceRouter(this._request);
    addRoute(sr);
    for (let i = 0; i < sr._handlers.length; i++) {
      this._handlers.push(sr._handlers[i]);
    }
  }

  put(paths, handler) {
    this.add(paths, handler, 'PUT');
  }

  get(paths, handler) {
    this.add(paths, handler, 'GET');
  }

  post(paths, handler) {
    this.add(paths, handler, 'POST');
  }

  del(paths, handler) {
    this.add(paths, handler, 'DELETE');
  }

  use(paths, handler) {
    this.add(paths, handler, 'ALL');
  }

  executeHandler(handler, flags) {
    return new Promise(async (resolve, reject) => {
      try {
        this._response.finally(() => {
          if (flags.next) {
            console.error('the next() was executed, so there is no result');
          } else {
            flags.result = true;
            resolve({
              continue: false,
              result: this._response.result,
            });
          }
        });
        this._request.params = handler.params;
        await handler.func(
          this._request,
          this._response,
          () => {
            if (flags.result) {
              console.error('the response has been responded');
            } else {
              flags.next = true;
              resolve({
                continue: true,
              });
            }
          },
          this.options
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * start the route server
   */
  async serve() {
    for (const handler of this._handlers) {
      const flags = {
        next: false,
        result: false,
      };
      const out = await this.executeHandler(handler, flags);
      if (out.continue === false) {
        return out.result;
      }
    }
  }
}

module.exports = SCFServiceRouter;
