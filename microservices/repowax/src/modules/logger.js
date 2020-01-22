const appRoot = require('app-root-path');
const winston = require('winston');

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: `${appRoot}/app.log`,
            handleExceptions: true,
            json: true,
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            colorize: false,
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};