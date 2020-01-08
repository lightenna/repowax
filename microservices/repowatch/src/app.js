const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const logger = require('./modules/logger');
const indexRouter = require('./routes/index');
const pkg = require('../package.json');
const { updateSlack } = require('./modules/slack');
const debug = require('debug')('repowatch:app');
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

module.exports = app;
