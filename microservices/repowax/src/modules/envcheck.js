const env = require('process').env;
require('dotenv').config();
const crypto = require('crypto');

const MIN_SECRET_LENGTH = 32;

// Track recent delivery IDs to prevent replay attacks (5 minute TTL)
const recentDeliveries = new Map();
const DELIVERY_TTL_MS = 5 * 60 * 1000;

const validateEnvironment = () => {
    // test for required environment variables
    if (env && env.REPW_SECRET && (env.REPW_SECRET.length >= MIN_SECRET_LENGTH) && env.REPW_PULLS && (env.REPW_PULLS.length > 0)) {
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

const validateDelivery = (req) => {
    const deliveryId = req.get('X-GitHub-Delivery');
    if (!deliveryId) {
        return false;
    }
    // Clean up expired entries
    const now = Date.now();
    for (const [id, timestamp] of recentDeliveries) {
        if (now - timestamp > DELIVERY_TTL_MS) {
            recentDeliveries.delete(id);
        }
    }
    // Reject replayed delivery
    if (recentDeliveries.has(deliveryId)) {
        return false;
    }
    recentDeliveries.set(deliveryId, now);
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
    validateDelivery,
    getRepoList,
    env
};
