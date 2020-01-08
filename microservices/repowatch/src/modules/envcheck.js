const env = require('process').env;
require('dotenv').config();
const debug = require('debug')('repowatch:envcheck');
const fs = require('fs');

const validateEnvironment = () => {
    // test for required environment variables
    if (env && env.REPW_SECRET && (env.REPW_SECRET.length > 0) && env.REPW_PULLS && (env.REPW_PULLS.length > 0)) {
        return true;
    }
    return false;
};

const validateSecret = (req) => {
    // assume secret is fine for now
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
