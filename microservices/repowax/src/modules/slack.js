const env = require('process').env;
require('dotenv').config();
const debug = require('debug')('repowax:slack');
const Slack = require('slack-node');

const updateSlack = (message) => {
    if (env.REPW_SLACKWEBHOOK && env.REPW_SLACKWEBHOOK.length > 20) {
        const slack = new Slack();
        slack.setWebhook(env.REPW_SLACKWEBHOOK);
        slack.webhook({
            channel: "#auto",
            username: "repowax",
            text: message
        }, function(err, response) {
            if (err) {
                debug(err);
            } else {
                debug(response);
            }
        });
    }
};

module.exports = {
    updateSlack
};
