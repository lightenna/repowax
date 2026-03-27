const express = require('express');
const router = express.Router();
const { validateEnvironment, validateSecret, validateDelivery, getRepoList, env } = require('../modules/envcheck');
const logger = require('../modules/logger');
const { updateSlack } = require('../modules/slack');

const boom = require('@hapi/boom');
const { execFile } = require('child_process');
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
    res.end(JSON.stringify({ title: "repowax" }));
});

router.post('/repowax/:workingleaf', function(req, res, next) {
    return updateRepo(req, res, next);
});

const execGit = (args, cwd) => new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (err, stdout, stderr) => {
        if (err) {
            reject({ err, stdout, stderr });
        } else {
            resolve({ stdout, stderr });
        }
    });
});

const updateRepo = (req, res, next) => {
    if (!validateEnvironment()) {
        return next(boom.failedDependency('Unable to validate environment variables.'));
    }
    if (!validateSecret(req)) {
        return next(boom.failedDependency('Unable to validate secret against reference.'));
    }
    if (!validateDelivery(req)) {
        return next(boom.failedDependency('Duplicate or replayed delivery.'));
    }
    // update target repos
    let matches = 0;
    getRepoList().forEach(({workingdir, rembra}) => {
        if (req.params.workingleaf === path.parse(workingdir).base) {
            matches++;
            const gitDir = `${workingdir}/.git`;
            execGit(['--git-dir', gitDir, 'fetch'], workingdir)
                .then(() => execGit(['--git-dir', gitDir, '--work-tree', workingdir, 'merge', rembra], workingdir))
                .then(() => execGit(['--git-dir', gitDir, '--work-tree', workingdir, 'submodule', 'update', '--init'], workingdir))
                .then(({stdout}) => {
                    const hostname = env.REPW_HOSTALIAS || req.headers.host;
                    const msg = `repo(${req.params.workingleaf} ${rembra}) on ${hostname} updated`;
                    logger.info(msg, stdout);
                    updateSlack(msg);
                })
                .catch(({err, stderr}) => {
                    const hostname = env.REPW_HOSTALIAS || req.headers.host;
                    const msg = `Failed attempt to update repo(${req.params.workingleaf}) on ${hostname}`;
                    logger.error(msg, stderr, err);
                    updateSlack(msg);
                });
        }
    });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result: "OK", returnCode: matches}));
};

module.exports = router;
