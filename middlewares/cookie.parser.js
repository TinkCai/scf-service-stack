const SECRET = process.env.ENCRYPTSECRET || 'scf-stack';
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

async function cookieParser(req, res, next) {
  if (req.cookies) {
    return next();
  }
  const cookies = req.headers.cookie;
  req.cookies = Object.create(null);

  // no cookies
  if (!cookies) {
    return next();
  }
  // parse signed cookies
  const unSignedCookies = unSignCookies(cookies);

  // parse JSON cookies
  req.cookies = convertCookieToJson(unSignedCookies);

  next();
}

function parseCookie(str) {
  if (typeof str === 'string' && str.startsWith('j:')) {
    try {
      return JSON.parse(str.slice(2));
    } catch (err) {
      return null;
    }
  } else {
    return str;
  }
}

function convertCookieToJson(obj) {
  const result = {};
  for (let key in obj) {
    const val = parseCookie(obj[key]);
    if (val) {
      result[key] = val;
    }
  }
  return result;
}

function unSignCookies(cookiesFromHeader) {
  return cookie.parse(cookiesFromHeader, {
    decode: (str) => {
      const decodedStr = decodeURIComponent(str);
      if (decodedStr.startsWith('s:')) {
        try {
          return jwt.verify(decodedStr.substr(2), SECRET).data;
        } catch (e) {
          return null;
        }
      } else {
        return decodedStr;
      }
    },
  });
}

module.exports = cookieParser;
