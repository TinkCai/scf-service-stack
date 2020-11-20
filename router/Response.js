const cookie = require('cookie');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const jwt = require('jsonwebtoken');
const SECRET = process.env.ENCRYPTSECRET || 'scf-stack';

const TYPES = {
  '.aac': 'audio/aac',
  '.abw': 'application/x-abiword',
  '.arc': 'application/x-freearc',
  '.avi': 'video/x-msvideo',
  '.azw': 'application/vnd".amazon".ebook',
  '.bin': 'application/octet-stream',
  '.bmp': 'image/bmp',
  '.bz': 'application/x-bzip',
  '.bz2': 'application/x-bzip2',
  '.csh': 'application/x-csh',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd".openxmlformats-officedocument".wordprocessingml".document',
  '.eot': 'application/vnd".ms-fontobject',
  '.epub': 'application/epub+zip',
  '.gz': 'application/gzip',
  '.gif': 'image/gif',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.ico': 'image/vnd".microsoft".icon',
  '.ics': 'text/calendar',
  '.jar': 'application/java-archive',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.mid': 'audio/midi audio/x-midi',
  '.midi': 'audio/midi audio/x-midi',
  '.mjs': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.mpeg': 'video/mpeg',
  '.mpkg': 'application/vnd".apple".installer+xml',
  '.odp': 'application/vnd".oasis".opendocument".presentation',
  '.ods': 'application/vnd".oasis".opendocument".spreadsheet',
  '.odt': 'application/vnd".oasis".opendocument".text',
  '.oga': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.ogx': 'application/ogg',
  '.opus': 'audio/opus',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.php': 'application/x-httpd-php',
  '.ppt': 'application/vnd".ms-powerpoint',
  '.pptx':
    'application/vnd".openxmlformats-officedocument".presentationml".presentation',
  '.rar': 'application/vnd".rar',
  '.rtf': 'application/rtf',
  '.sh': 'application/x-sh',
  '.svg': 'image/svg+xml',
  '.swf': 'application/x-shockwave-flash',
  '.tar': 'application/x-tar',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ts': 'video/mp2t',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.vsd': 'application/vnd".visio',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xhtml': 'application/xhtml+xml',
  '.xls': 'application/vnd".ms-excel',
  '.xlsx':
    'application/vnd".openxmlformats-officedocument".spreadsheetml".sheet',
  '.xml': 'application/xml',
  '.xul': 'application/vnd".mozilla".xul+xml',
  '.zip': 'application/zip',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.7z': 'application/x-7z-compressed',
};

const resourceNotFound = (path) => {
  const response = {
    statusCode: 404,
    headers: {
      'content-type': 'application/html',
    },
    body: '<h1>404 Resource Not Found</h1>' + `<label>${path || ''}</label>`,
  };
  return response;
};

class Response {
  constructor(req, options) {
    this.req = req;
    this._res = {};
    this.headers = {};
    this.options = options;
    this.eventsOnFinish = [];
  }

  onFinish(callback) {
    this.eventsOnFinish.push(callback);
  }

  finally(callback) {
    this.finalEvent = callback;
  }

  _setStatus(code) {
    this.statusCode = code;
    this._res.statusCode = code;
  }

  status(code) {
    this._setStatus(code);
    return this;
  }

  end(value) {
    this._end = true;
    const onFinishEventResults = [];
    for (let i = 0; i < this.eventsOnFinish.length; i++) {
      onFinishEventResults.push(this.eventsOnFinish[i](this));
    }
    Promise.all(onFinishEventResults).then(() => {
      if (typeof value === 'object' && value.statusCode) {
        value.headers = Object.assign(value.headers, this.headers);
      } else {
        value = {
          statusCode: this.statusCode || 200,
          headers: {
            'content-type': 'application/json',
            ...this.headers,
          },
          body: value,
        };
      }
      this.result = value;
      this.finalEvent(this);
    });
  }

  json(value) {
    this.end(value);
    return this;
  }

  file(filePath) {
    if (fs.existsSync(filePath)) {
      let contentType;
      const filename = path.basename(filePath);
      if (filePath.indexOf('.') === -1) {
        contentType = 'text/plain';
      } else {
        const names = filename.split('.');
        const extension = names[names.length - 1];
        contentType = TYPES[`.${extension}`];
      }
      const response = {
        isBase64Encoded: true,
        statusCode: 200,
        headers: {
          'content-type': contentType,
        },
      };
      response.body = fs.readFileSync(filePath).toString('base64');
      this.end(response);
    } else {
      this.end(resourceNotFound(filePath));
    }
  }

  render(view, data) {
    const filePath = path.join(this.options.templateFolder, view + '.ejs');

    if (fs.existsSync(filePath)) {
      const tempResponse = {
        statusCode: this.statusCode || 200,
        headers: {
          'content-type': 'text/html',
        },
      };
      const headers = Object.assign(tempResponse.headers, this.headers);
      const response = { ...tempResponse, headers };
      let template = fs.readFileSync(filePath, 'utf-8');
      response.body = ejs.render(template, data);
      this.end(response);
    } else {
      this.end(resourceNotFound(view));
    }
  }

  redirect(url) {
    this.end({
      statusCode: this.statusCode || 302,
      headers: {
        'content-type': 'text/html',
        location: url,
      },
    });
  }

  cookie(name, value, opts = {}) {
    let maxAge, signedValue;
    let cookies = [];
    let val =
      typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value);
    if (opts.maxAge) {
      maxAge = opts.maxAge - 0;
      if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    }
    opts.path = opts.path || '/';
    opts.maxAge = opts.maxAge || 7200;
    const prevCookie = this.headers['Set-Cookie'] || '';
    if (opts.signed) {
      let signOption = opts.maxAge ? { expiresIn: opts.maxAge } : undefined;
      signedValue = jwt.sign(
        {
          data: val,
        },
        SECRET,
        signOption
      );
      signedValue = 's:' + signedValue;
    } else {
      signedValue = val;
    }
    if (prevCookie) {
      if (prevCookie instanceof Array) {
        cookies = prevCookie;
      } else {
        cookies.push(prevCookie);
      }
    }
    const latestCookie = cookie.serialize(name, String(signedValue), opts);
    cookies.push(latestCookie);
    this.headers['Set-Cookie'] = cookies;
    return this;
  }

  clearCookie(name, options) {
    const opts = Object.assign({ expires: new Date(1), path: '/' }, options);
    return this.cookie(name, '', opts);
  }

  error(e) {
    let body, headers;
    if (req.httpMethod === 'GET') {
      body = '<h1>500 Internal Error</h1>' + `<label>${e.stack}</label>`;
      headers = {
        'content-type': 'application/html',
      };
    } else {
      body = '500 Internal Error\r\n' + `${e.stack}`;
      headers = {
        'content-type': 'text/plain',
      };
    }
    this.end({
      statusCode: this.statusCode || 500,
      headers,
      body,
    });
  }

  text(str) {
    this.end({
      statusCode: this.statusCode || 200,
      headers: {
        'content-type': 'text/plain',
      },
      body: str,
    });
  }
}

module.exports = Response;
