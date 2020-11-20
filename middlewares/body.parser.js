const multipartParser = require('aws-lambda-multipart-parser');
const CONTENT_TYPE = {
  MULTIPART_FORM_DATA: 'multipart/form-data',
  APPLICATION_JSON: 'application/json',
  TEXT_PLAIN: 'text/plain',
  APPLICATION_XML: 'application/xml',
  TEXT_XML: 'text/xml',
};

const getContentType = (headers) => {
  const contentTypes = headers['content-type'];
  let types;
  if (!contentTypes) {
    return CONTENT_TYPE.APPLICATION_JSON;
  } else {
    if (typeof contentTypes === 'string') {
      types = contentTypes.split(';');
    } else if (typeof contentTypes === 'object' && Array instanceof contentTypes) {
      types = contentTypes;
    }
  }
  let contentType = CONTENT_TYPE.APPLICATION_JSON;
  for (let i = 0; i < types.length; i++) {
    switch (types[i].toLowerCase()) {
      case CONTENT_TYPE.MULTIPART_FORM_DATA: {
        contentType = CONTENT_TYPE.MULTIPART_FORM_DATA;
        break;
      }
      case CONTENT_TYPE.APPLICATION_JSON: {
        contentType = CONTENT_TYPE.APPLICATION_JSON;
        break;
      }
      case CONTENT_TYPE.TEXT_PLAIN: {
        contentType = CONTENT_TYPE.TEXT_PLAIN;
        break;
      }
      case CONTENT_TYPE.APPLICATION_XML: {
        contentType = CONTENT_TYPE.APPLICATION_XML;
        break;
      }
      case CONTENT_TYPE.TEXT_XML: {
        contentType = CONTENT_TYPE.TEXT_XML;
        break;
      }
    }
  }
  return contentType;
};

const parse = async (req, res, next) => {
  if (typeof res === 'function') {
    next = res;
    res = {};
  }
  if (!req.body) {
    next();
    return;
  }
  const contentType = getContentType(req.headers);
  let body;
  if (contentType === CONTENT_TYPE.APPLICATION_JSON) {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      throw new Error(`Not a valid json in the body: ${req.body}`);
    }
  } else if (contentType === CONTENT_TYPE.MULTIPART_FORM_DATA) {
    body = multipartParser.parse(req);
  } else {
    body = req.body;
  }
  req._body = req.body;
  req.body = body;
  next();
};

module.exports = parse;
