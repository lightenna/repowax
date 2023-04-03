const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const logger = require('./modules/logger');
const indexRouter = require('./routes/index');
const pkg = require('../package.json');
const { updateSlack } = require('./modules/slack');
const debug = require('debug')('repowax:app');
const bodyParser = require('body-parser')
const env = require('process').env;
require('dotenv').config();

const app = express();
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', indexRouter);

// notify on start/re-starts
const hostname = env.REPW_HOSTALIAS || 'unnamed host';
const msg = `Starting ${pkg.name} v${pkg.version} on ${hostname}`;
updateSlack(msg);
logger.info(msg);
debug(msg);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler to only show errors in development
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    console.error(err.message, err);
    res.end(err.message);
});

module.exports = app;
