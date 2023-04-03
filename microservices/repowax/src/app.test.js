const request = require('supertest');
const app = require('./app');
const {env} = require("process");
require('dotenv').config();
const crypto = require("crypto");
const debug = require('debug')('repowax:app.test');

// override environment variables from local .env file
const default_environment = {
    "REPW_PULLS": "/srv/git/github.com/my-repo",
    "REPW_SECRET": "987665",
    "REPW_HOSTALIAS": "testhost",
    "REPW_SLACKWEBHOOK": ""
};

describe('Packaged repowax component', () => {

    beforeEach(() => {
        // apply default environment to environment variables
        Object.keys(default_environment).forEach((envvar) => {
            process.env[envvar] = default_environment[envvar];
        });
    });

    it('responds without error to /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('title');
    });

    it('responds without error to request with remote and branch', async () => {
        process.env.REPW_PULLS = '/path/to/my/working/directory/fish:origin/branchname';

        // set up message body
        const rawBody = JSON.stringify({'field1': 'value1', 'field2': 'value2'});
        // compute matching signature
        const authoritative_secret = process.env.REPW_SECRET;
        const sigHashAlg = 'sha256';
        const hmac = crypto.createHmac(sigHashAlg, authoritative_secret);
        const digest = Buffer.from(sigHashAlg + '=' + hmac.update(rawBody).digest('hex'), 'utf8');
        const signature = digest.toString();

        debug(signature);
        const res = await request(app).post({
            headers: {
                'content-type': 'application/json',
                'X-Hub-Signature-256': signature
            },
            url: '/repowax/fish',
            body: rawBody
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toBe('OK');
        expect(res.body).toHaveProperty('returnCode');
        expect(res.body.returnCode).toBe(1);
    });

    /*
    it('responds with a health check on request', async () => {
        const res = await request(app).get('/heartbeat');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe('healthy');
    });

    it('responds without error to well-formed request', async () => {
        process.env.REPW_PULLS = '/path/to/my/working/directory/fish';
        const res = await request(app).post('/repowax/fish');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toBe('OK');
        expect(res.body).toHaveProperty('returnCode');
        expect(res.body.returnCode).toBe(1);
    });

    it('responds without error to request with remote and branch', async () => {
        process.env.REPW_PULLS = '/path/to/my/working/directory/fish:origin/branchname';
        const res = await request(app).post('/repowax/fish');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toBe('OK');
        expect(res.body).toHaveProperty('returnCode');
        expect(res.body.returnCode).toBe(1);
    });

    it('ignore well-formed request with non-matching leafname', async () => {
        process.env.REPW_PULLS = '/path/to/my/working/directory/fish';
        const res = await request(app).post('/repowax/fowl');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toBe('OK');
        expect(res.body).toHaveProperty('returnCode');
        expect(res.body.returnCode).toBe(0);
    });

    it('errors without environment variables', async () => {
        process.env.REPW_PULLS = '';
        const res = await request(app).post('/repowax/repoleaf');
        expect(res.statusCode).toEqual(500);
        expect(res.text).toContain('Unable to validate');
    });

    it('errors without reference secret', async () => {
        process.env.REPW_SECRET = '';
        const res = await request(app).post('/repowax/repoleaf');
        expect(res.statusCode).toEqual(500);
        expect(res.text).toContain('Unable to validate');
    });
     */

});
