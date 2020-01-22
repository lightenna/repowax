repowax
=========

Purpose
-------
This service listens for a well-formed POST request from Github.com, typically initiated by a Webhook on a repo immediately after a `git push`.
Upon receiving the request it validates the payload using the shared secret and x-hub-signature.
If the secret is valid, it works through the list of repositories defined in REPW_PULLS env var.
If the leaf name matches one of those listed, the service makes a command line `git` call to update the relevant working directory.
For compatibility with git 1.8.3, this is executed as a fetch and merge, though has the exact same effect as `git pull`.

Security
--------
In order to mitigate the risk of an exposed port, the command line call is based only on content from the system's environment variables, not the payload received from Github, the latter serving only as a key and authentication token for the former.
This service is designed to be used in a closed network, perhaps as part of a development, test or staging environment.
It is not a hardened component.
If used in production, please carefully consider the security implications.
Always deploy behind an Apache/Nginx proxy.

Webhooks
--------
Webhooks should take the form:
```
https://<server_name>:<external_port>/repowax/<working_directory_leaf>
```
e.g. `https://staging.myapp.example.com:7777/repowax/my-repo`

Environment
-----------
This service looks for the following mandatory environment variables:
+ REPW_PULLS='<comma-separated list of file system paths to update>'
    + Each path can also contain a remote/branch name:
    + e.g. `/srv/my_repo:origin/staging`
    + 'origin/master' is used by default
+ REPW_SECRET='<unique secret shared with Github.com>'

Optionally, the following environment variables can be set:
+ REPW_HOSTALIAS='<machine name used in Slack messages>'
+ REPW_SLACKWEBHOOK='<Slack webhook to hit on update>'
+ REPW_LISTSEP=','
    + Path list separator is a comma by default, but can be overridden

Running
-------
PM2 can be used with an `ecosystem.config.js` file to set the environment variables and run the service:
+ `pm2 start /srv/repowax/ecosystem.config.js --env staging --watch`

An example `ecosystem.config.js` might look thus:
```
module.exports = {
    apps : [{
        name: "repowax",
        watch: [
            "/srv/repowax/repowax.bin",
            "/srv/repowax/ecosystem.config.js"
        ],
        watch_delay: 1000,
        script: "/srv/repowax/repowax.bin",
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "staging",
            PORT: 3001,
            REPW_HOSTALIAS: "my-host",
            REPW_SECRET: "unique-secret-shared-with-github",
            REPW_PULLS: "/srv/git/github.com/my-repo:origin/staging,",
            REPW_SLACKWEBHOOK: "https://hooks.slack.com/services/123456789/123456789/012345678901234567890123"
        }
    }]
};
```

Tech
----
This is app is based on Node/Express.

Build
-----
The `repowax.bin` binary can be downloaded into files/dist or built using Node and `pkg`:
```
cd microservices/repowax
npm install
npm run build-pkg
```

Install
-------
Installation can be done manually or using Puppet:
```
class { 'repowax' : }
```
or:
```
include 'repowax'
```
with class attributes set in Hiera:
```
repowax::servername: "%{::fqdn}"
repowax::webhook: "https://hooks.slack.com/services/123456789/123456789/012345678901234567890123"
repowax::watchers:
    my_repo:
        repo_list:
            - '/srv/git/github.com/my-repo:origin/staging'
        secret: "unique-secret-shared-with-github"
        apache_port: 7777
```

Change history
--------------

* v0.2
    * Stopped performing automatic version patch on pkg, hostalias defaults to ::fqdn in Puppet install
* v0.1
    * Initial version of module
