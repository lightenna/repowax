const env = require('process').env;
require('dotenv').config();
const crypto = require('crypto');
const debug = require('debug')('repowax:envcheck');
const fs = require('fs');
const logger = require("./logger");

const validateEnvironment = () => {
    // test for required environment variables
    if (env && env.REPW_SECRET && (env.REPW_SECRET.length > 0) && env.REPW_PULLS && (env.REPW_PULLS.length > 0)) {
        return true;
    }
    return false;
};

const validateSecret = (req) => {
    const authoritative_secret = env.REPW_SECRET;
    const sigHeaderName = 'X-Hub-Signature-256';
    const sigHashAlg = 'sha256';
    if (!req.body) {
        return false;
    }
    const sig = Buffer.from(req.get(sigHeaderName) || '', 'utf8');
    const hmac = crypto.createHmac(sigHashAlg, authoritative_secret);
    const data = JSON.stringify(req.body);
    const digest = Buffer.from(sigHashAlg + '=' + hmac.update(data).digest('hex'), 'utf8');
    if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
        return false;
    }
    // otherwise the secret is fine
    return true;
};

const getRepoList = () => {
    const repo_string = env.REPW_PULLS;
    const separator = env.REPW_LISTSEP || ',';
    const repo_list = repo_string.split(separator);
    const repos = [];
    repo_list.forEach((fullpath) => {
        const path_comps = fullpath.split(':');
        repos.push({
            workingdir: path_comps[0],
            rembra: path_comps[1] || "origin/master"
        });
    });
    return repos;
};

module.exports = {
    validateEnvironment,
    validateSecret,
    getRepoList,
    env
};
