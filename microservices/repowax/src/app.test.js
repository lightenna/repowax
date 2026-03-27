const request = require('supertest');
const app = require('./app');

require('dotenv').config();
const crypto = require("crypto");

const VALID_SECRET = 'a]3kF!9zR#mQ7vL$wP2nX&hJ6tY0uB5c';
const SHORT_SECRET = 'tooshort';

const default_environment = {
    "REPW_PULLS": "/srv/git/github.com/my-repo",
    "REPW_SECRET": VALID_SECRET,
    "REPW_HOSTALIAS": "testhost",
    "REPW_SLACKWEBHOOK": ""
};

// Helper: generate a valid HMAC signature for a given body and secret
const signPayload = (body, secret) => {
    const sigHashAlg = 'sha256';
    const hmac = crypto.createHmac(sigHashAlg, secret);
    const digest = Buffer.from(sigHashAlg + '=' + hmac.update(body).digest('hex'), 'utf8');
    return digest.toString();
};

// Helper: make an authenticated POST to /repowax/:leaf
const authenticatedPost = (leaf, body) => {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const signature = signPayload(rawBody, process.env.REPW_SECRET);
    return request(app)
        .post(`/repowax/${leaf}`)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Delivery', crypto.randomUUID())
        .send(rawBody);
};

describe('Packaged repowax component', () => {

    beforeEach(() => {
        Object.keys(default_environment).forEach((envvar) => {
            process.env[envvar] = default_environment[envvar];
        });
    });

    // --- GET endpoints ---

    describe('GET /', () => {
        it('returns title', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ title: "repowax" });
        });

        it('returns 424 when environment is invalid', async () => {
            process.env.REPW_SECRET = '';
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(424);
        });
    });

    describe('GET /heartbeat/', () => {
        it('returns healthy status', async () => {
            const res = await request(app).get('/heartbeat/');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ status: "healthy" });
        });

        it('returns 424 when environment is invalid', async () => {
            process.env.REPW_PULLS = '';
            const res = await request(app).get('/heartbeat/');
            expect(res.statusCode).toEqual(424);
        });
    });

    // --- Environment validation ---

    describe('environment validation on POST', () => {
        it('rejects when REPW_PULLS is empty', async () => {
            process.env.REPW_PULLS = '';
            const res = await authenticatedPost('my-repo', { test: true });
            expect(res.statusCode).toEqual(424);
        });

        it('rejects when REPW_SECRET is empty', async () => {
            process.env.REPW_SECRET = '';
            const res = await authenticatedPost('my-repo', { test: true });
            expect(res.statusCode).toEqual(424);
        });

        it('rejects when REPW_SECRET is shorter than 32 characters', async () => {
            process.env.REPW_SECRET = SHORT_SECRET;
            const res = await authenticatedPost('my-repo', { test: true });
            expect(res.statusCode).toEqual(424);
        });
    });

    // --- HMAC signature validation ---

    describe('HMAC signature validation', () => {
        it('rejects request with missing signature header', async () => {
            const res = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-GitHub-Delivery', crypto.randomUUID())
                .send(JSON.stringify({ test: true }));
            expect(res.statusCode).toEqual(424);
        });

        it('rejects request with wrong signature', async () => {
            const res = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', 'sha256=badhashbadhashbadhashbadhashbadhashbadhashbadhashbadhashbadhash00')
                .set('X-GitHub-Delivery', crypto.randomUUID())
                .send(JSON.stringify({ test: true }));
            expect(res.statusCode).toEqual(424);
        });

        it('rejects request signed with wrong secret', async () => {
            const wrongSignature = signPayload(
                JSON.stringify({ test: true }),
                'xY9#mK2$pL7@wQ4&nJ8!rT5%vB0^cF3a'
            );
            const res = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', wrongSignature)
                .set('X-GitHub-Delivery', crypto.randomUUID())
                .send(JSON.stringify({ test: true }));
            expect(res.statusCode).toEqual(424);
        });

        it('accepts request with valid signature', async () => {
            const res = await authenticatedPost('my-repo', { test: true });
            expect(res.statusCode).toEqual(200);
            expect(res.body.result).toBe('OK');
        });
    });

    // --- Replay protection ---

    describe('replay protection', () => {
        it('rejects request without X-GitHub-Delivery header', async () => {
            const rawBody = JSON.stringify({ test: true });
            const signature = signPayload(rawBody, process.env.REPW_SECRET);
            const res = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', signature)
                .send(rawBody);
            expect(res.statusCode).toEqual(424);
        });

        it('rejects replayed delivery with same ID', async () => {
            const rawBody = JSON.stringify({ replay: true });
            const signature = signPayload(rawBody, process.env.REPW_SECRET);
            const deliveryId = crypto.randomUUID();

            // First request should succeed
            const res1 = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', signature)
                .set('X-GitHub-Delivery', deliveryId)
                .send(rawBody);
            expect(res1.statusCode).toEqual(200);

            // Same delivery ID should be rejected
            const res2 = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', signature)
                .set('X-GitHub-Delivery', deliveryId)
                .send(rawBody);
            expect(res2.statusCode).toEqual(424);
        });

        it('accepts different delivery IDs', async () => {
            const rawBody = JSON.stringify({ multi: true });
            const signature = signPayload(rawBody, process.env.REPW_SECRET);

            const res1 = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', signature)
                .set('X-GitHub-Delivery', crypto.randomUUID())
                .send(rawBody);
            expect(res1.statusCode).toEqual(200);

            const res2 = await request(app)
                .post('/repowax/my-repo')
                .set('Content-Type', 'application/json')
                .set('X-Hub-Signature-256', signature)
                .set('X-GitHub-Delivery', crypto.randomUUID())
                .send(rawBody);
            expect(res2.statusCode).toEqual(200);
        });
    });

    // --- Webhook route matching ---

    describe('webhook route matching', () => {
        it('matches repo leaf and returns count 1', async () => {
            process.env.REPW_PULLS = '/path/to/my/working/directory/fish:origin/branchname';
            const res = await authenticatedPost('fish', { field1: 'value1' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ result: "OK", returnCode: 1 });
        });

        it('returns count 0 for non-matching leaf', async () => {
            process.env.REPW_PULLS = '/path/to/my/working/directory/fish';
            const res = await authenticatedPost('fowl', { field1: 'value1' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ result: "OK", returnCode: 0 });
        });

        it('matches default remote/branch when not specified', async () => {
            process.env.REPW_PULLS = '/path/to/repo';
            const res = await authenticatedPost('repo', { push: true });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ result: "OK", returnCode: 1 });
        });

        it('matches across multiple repos in REPW_PULLS', async () => {
            process.env.REPW_PULLS = '/path/to/alpha,/path/to/beta,/path/to/gamma';
            const res = await authenticatedPost('beta', { push: true });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ result: "OK", returnCode: 1 });
        });

        it('supports custom list separator', async () => {
            process.env.REPW_PULLS = '/path/to/alpha|/path/to/beta';
            process.env.REPW_LISTSEP = '|';
            const res = await authenticatedPost('beta', { push: true });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ result: "OK", returnCode: 1 });
            delete process.env.REPW_LISTSEP;
        });
    });

    // --- Error handler ---

    describe('error handling', () => {
        it('returns 404 for unknown routes', async () => {
            const res = await request(app).get('/nonexistent');
            expect(res.statusCode).toEqual(404);
        });

        it('hides error details outside development mode', async () => {
            process.env.NODE_ENV = 'production';
            process.env.REPW_SECRET = '';
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(424);
            expect(res.text).toBe('Internal Server Error');
            expect(res.text).not.toContain('validate');
            delete process.env.NODE_ENV;
        });
    });

});
