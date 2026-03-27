const env = require('process').env;
require('dotenv').config();
const debug = require('debug')('repowax:slack');
const { IncomingWebhook } = require('@slack/webhook');

const updateSlack = (message) => {
    if (env.REPW_SLACKWEBHOOK && env.REPW_SLACKWEBHOOK.length > 20) {
        const webhook = new IncomingWebhook(env.REPW_SLACKWEBHOOK);
        webhook.send({ text: message }).then((response) => {
            debug(response);
        }).catch((err) => {
            debug(err);
        });
    }
};

module.exports = {
    updateSlack
};
