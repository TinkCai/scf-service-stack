const cookieParser = require('./cookie.parser');

/**
 * first come,generate a sid
 * save to remote_storage_data
 * @param {Object} [options.key=sid] Session key in the cookie
 * @param {Object} [options.maxAge=7200000] how long this session will be expired
 * @param {Object} [options.secret] the secret token
 */
const parser = (client, options) => {
  const key = options.key || 'sid';
  const maxAge = options.maxAge || 7200;
  // TODO 加密存储
  const secret = options.secret;
  return async (req, res, next) => {
    if (!req.cookies) {
      await cookieParser(req, res, next);
    }
    const now = new Date();
    const expiredDate = new Date(now.getTime() + maxAge * 1000);
    const sid = req.cookies[key];
    if (!sid) {
      req.session = {};
    } else {
      const sessionObj = await client.get(sid);
      if (sessionObj && sessionObj.data) {
        res._sessionId = sessionObj._id;
        req.session = sessionObj.data;
      } else {
        req.session = {};
      }
    }
    res.onFinish(async (response) => {
      const _request = response.req;
      let newSessionObj = {
        ..._request.session,
        expiredDate,
      };
      try {
        const result = await client.set(res._sessionId, newSessionObj);
        if (result._id) {
          response.cookie(key, result._id, {maxAge: maxAge});
        }
      } catch (e) {
        console.error(e);
      }
    });
    next();
  };
};

module.exports = parser;
