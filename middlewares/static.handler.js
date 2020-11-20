const path = require('path');
const fs = require('fs');

const handler = (staticBasePath) => {
  return (req, res, next) => {
    if (req.httpMethod === 'GET' || req.httpMethod === 'HEAD') {
      const filePath = path.join(staticBasePath, req.path);
      if (fs.existsSync(filePath)) {
        const fileState = fs.statSync(filePath);
        if (fileState.isFile()) {
          res.file(filePath);
        } else {
          next();
        }
      } else {
        next();
      }
    } else {
      next();
    }
  };
};

module.exports = handler;
