const createError = require('http-errors');
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./modules/logger');
const indexRouter = require('./routes/index');
const pkg = require('../package.json');
const { updateSlack } = require('./modules/slack');
const debug = require('debug')('repowax:app');

const env = require('process').env;
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// Rate limit webhook endpoint
app.use('/repowax/', rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
}));

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

// error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    const statusCode = (err.isBoom && err.output && err.output.statusCode) || err.status || 500;
    res.status(statusCode);
    logger.error(err.message, err);
    const safeMessage = req.app.get('env') === 'development' ? err.message : 'Internal Server Error';
    res.end(safeMessage);
});

module.exports = app;
