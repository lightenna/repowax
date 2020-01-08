const express = require('express');
const router = express.Router();
const { validateEnvironment, validateSecret, getRepoList, env } = require('../modules/envcheck');
const logger = require('../modules/logger');
const { updateSlack } = require('../modules/slack');
const debug = require('debug')('repowatch:index');
const boom = require('@hapi/boom');
const { exec, spawnSync } = require('child_process');
const path = require('path');

router.get('/heartbeat/', function(req, res, next) {
    if (!validateEnvironment()) {
        return next(boom.failedDependency('Unable to validate environment variables.'));
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: "healthy" }));
});

router.get('/', function(req, res, next) {
    if (!validateEnvironment()) {
        return next(boom.failedDependency('Unable to validate environment variables.'));
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ title: "repowatch" }));
});

router.post('/repowatch/:workingleaf', function(req, res, next) {
    return updateRepo(req, res, next);
});

const updateRepo = (req, res, next) => {
    if (!validateEnvironment()) {
        return next(boom.failedDependency('Unable to validate environment variables.'));
    }
    // @todo validate secret
    if (!validateSecret(req)) {
        return next(boom.failedDependency('Unable to validate secret against reference.'));
    }
    // update target repos
    let matches = 0;
    getRepoList().forEach(({workingdir, rembra}) => {
        if (req.params.workingleaf === path.parse(workingdir).base) {
            matches++;
            const wdarg = escapeShell(workingdir);
            const rembrarg = escapeShell(rembra);
            const command = `cd ${wdarg} && git --git-dir=${wdarg}/.git fetch && git --git-dir=${wdarg}/.git --work-tree=${wdarg} merge ${rembrarg}`;
            exec(command, (err, stdout, stderr) => {
                const hostname = env.REPW_HOSTALIAS || req.headers.host;
                if (err) {
                    const msg = `Failed attempt to update repo on ${hostname}`;
                    logger.error(msg, stderr, err);
                    updateSlack(`${msg}:\n` + stderr);
                    return;
                }
                // success, fire out update message
                const msg = `repo(${req.params.workingleaf} ${rembra}) on ${hostname} updated`;
                logger.info(msg, stdout);
                updateSlack(`${msg}:\n` + stdout);
            });
        }
    });
    res.setHeader('Content-Type', 'application/json');
    // give little away in the response
    res.end(JSON.stringify({ result: "OK", returnCode: matches}));
};

const escapeShell = function(cmd) {
    return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

module.exports = router;
