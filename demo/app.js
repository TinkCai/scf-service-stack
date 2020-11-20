const SCFRouter = require('scf-service-stack').router;
const {
  bodyParser,
  staticHandler,
  cookieParser,
  LocalStorageClient,
  TCBStorageClient,
  sessionParser,
} = require('scf-service-stack').middlewares;
const test = require('./routers/test.router');
const path = require('path');

module.exports = async (request, context) => {
  const app = new SCFRouter(request, {
    templateFolder: path.join(__dirname, 'templates'),
  });
  console.log(request);
  app.use(staticHandler(path.join(__dirname, 'public')));
  app.use(bodyParser);
  app.use(cookieParser);
  app.use(sessionParser(new LocalStorageClient(), {maxAge: 600}));
  // app.use(
  //   sessionParser(
  //     new TCBStorageClient(
  //       process.env['REMOTE_CACHE_SECRET_ID'],
  //       process.env['REMOTE_CACHE_SECRET_KEY'],
  //       process.env['REMOTE_CACHE_ENVID'],
  //       process.env['REMOTE_CACHE_COLLECTION']
  //     ),
  //     {maxAge: 600}
  //   )
  // );
  app.extends(test);

  app.use(async (req, res, next) => {
    throw new Error('no mapping routers');
  });

  return app.serve();
};
