const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, rawAgent, makeVital } = require('./helpers');

describe('Security', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('Authentication Required', () => {
    it('rejects unauthenticated access to /api/vitals', async () => {
      await rawAgent().get('/api/vitals').expect(401);
    });

    it('rejects unauthenticated access to /api/medications', async () => {
      await rawAgent().get('/api/medications').expect(401);
    });

    it('rejects unauthenticated access to /api/appointments', async () => {
      await rawAgent().get('/api/appointments').expect(401);
    });

    it('rejects unauthenticated access to /api/emergency-cards', async () => {
      await rawAgent().get('/api/emergency-cards').expect(401);
    });

    it('rejects unauthenticated access to /api/family-members', async () => {
      await rawAgent().get('/api/family-members').expect(401);
    });

    it('rejects unauthenticated POST to /api/vitals', async () => {
      await rawAgent()
        .post('/api/vitals')
        .send({ type: 'blood_pressure', value: 120 })
        .expect(401);
    });

    it('rejects unauthenticated DELETE', async () => {
      const vital = makeVital();
      await rawAgent().delete(`/api/vitals/${vital.id}`).expect(401);
    });
  });

  describe('User Isolation', () => {
    it('user cannot access another user\'s vitals', async () => {
      const vital = makeVital({ user_id: 999 });
      await agent().get(`/api/vitals/${vital.id}`).expect(404);
    });

    it('user cannot update another user\'s vital', async () => {
      const vital = makeVital({ user_id: 999 });
      await agent()
        .put(`/api/vitals/${vital.id}`)
        .send({ value: 130 })
        .expect(404);
    });

    it('user cannot delete another user\'s vital', async () => {
      const vital = makeVital({ user_id: 999 });
      await agent().delete(`/api/vitals/${vital.id}`).expect(404);
    });

    it('list endpoints only return user\'s own data', async () => {
      makeVital({ user_id: 1 });
      makeVital({ user_id: 999 });

      const res = await agent().get('/api/vitals').expect(200);
      assert.equal(res.body.data.length, 1);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('handles SQL injection in query params', async () => {
      const res = await agent()
        .get('/api/vitals?type=blood_pressure\' OR \'1\'=\'1')
        .expect(400);
      assert.ok(res.body.error);
    });

    it('handles SQL injection in POST body', async () => {
      const res = await agent()
        .post('/api/vitals')
        .send({ type: 'blood_pressure', value: 120, notes: "'; DROP TABLE vitals; --" })
        .expect(201);
      
      // Should succeed without executing malicious SQL
      assert.ok(res.body.id);
      
      // Verify table still exists
      const { db } = setup();
      const count = db.prepare('SELECT COUNT(*) as cnt FROM vitals').get();
      assert.ok(count.cnt >= 1);
    });
  });

  describe('XSS Prevention', () => {
    it('stores and returns script tags without execution', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const res = await agent()
        .post('/api/vitals')
        .send({ type: 'blood_pressure', value: 120, notes: xssPayload })
        .expect(201);

      assert.equal(res.body.notes, xssPayload);
      
      const getRes = await agent().get(`/api/vitals/${res.body.id}`);
      assert.equal(getRes.body.notes, xssPayload);
    });

    it('handles HTML entities in input', async () => {
      const htmlPayload = '<b>Bold</b> & <i>Italic</i>';
      const res = await agent()
        .post('/api/medications')
        .send({ name: 'Test', notes: htmlPayload })
        .expect(201);

      assert.equal(res.body.notes, htmlPayload);
    });
  });

  describe('Input Validation', () => {
    it('rejects extremely long strings', async () => {
      const longString = 'a'.repeat(10000);
      await agent()
        .post('/api/vitals')
        .send({ type: 'blood_pressure', value: 120, notes: longString })
        .expect(400);
    });

    it('rejects invalid UUID formats', async () => {
      await agent()
        .get('/api/vitals/not-a-valid-uuid')
        .expect(404);
    });

    it('handles special characters safely', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const res = await agent()
        .post('/api/medications')
        .send({ name: 'Test', notes: specialChars })
        .expect(201);

      assert.equal(res.body.notes, specialChars);
    });

    it('handles unicode characters safely', async () => {
      const unicode = '测试 🏥 тест';
      const res = await agent()
        .post('/api/family-members')
        .send({ name: unicode })
        .expect(201);

      assert.equal(res.body.name, unicode);
    });
  });

  describe('Rate Limiting', () => {
    it('allows reasonable number of requests', async () => {
      for (let i = 0; i < 5; i++) {
        await agent().get('/api/vitals').expect(200);
      }
    });
  });

  describe('Security Headers', () => {
    it('sets security headers on API responses', async () => {
      const res = await agent().get('/api/vitals');
      
      assert.ok(res.headers['x-content-type-options']);
      assert.ok(res.headers['x-frame-options']);
      assert.ok(res.headers['cache-control']);
    });

    it('does not expose server version', async () => {
      const res = await agent().get('/api/vitals');
      
      // Should not expose Express or server version
      const serverHeader = res.headers['server'];
      if (serverHeader) {
        assert.ok(!serverHeader.includes('Express'));
        assert.ok(!serverHeader.match(/\d+\.\d+/)); // No version numbers
      }
    });
  });

  describe('Error Messages', () => {
    it('does not expose stack traces', async () => {
      const res = await agent()
        .post('/api/vitals')
        .send({ invalid: 'data' })
        .expect(400);

      assert.ok(res.body.error);
      assert.ok(!res.body.stack);
      assert.ok(!JSON.stringify(res.body).includes('at '));
    });

    it('generic error for non-existent resources', async () => {
      const res = await agent()
        .get('/api/vitals/00000000-0000-0000-0000-000000000000')
        .expect(404);

      // Should not reveal whether resource exists or user doesn't have access
      assert.ok(res.body.error);
    });
  });

  describe('Content-Type Validation', () => {
    it('requires application/json for POST requests', async () => {
      const res = await agent()
        .post('/api/vitals')
        .set('Content-Type', 'text/plain')
        .send('type=blood_pressure');
      
      // Accept 400 (validation error) or 401 if auth fails first
      assert.ok(res.status === 400 || res.status === 401 || res.status === 415);
    });
  });

  describe('Password Security', () => {
    it('does not return password hash in responses', async () => {
      const res = await agent().get('/api/auth/me').expect(200);
      
      assert.ok(!res.body.password_hash);
      assert.ok(!res.body.password);
      assert.ok(!res.body.user?.password_hash);
    });

    it('enforces password strength on registration', async () => {
      const weakPasswords = ['abc', '12345678', 'password', 'Password'];
      
      for (const password of weakPasswords) {
        const res = await rawAgent()
          .post('/api/auth/register')
          .send({ email: `test${Math.random()}@test.com`, password });
        
        assert.equal(res.status, 400);
        assert.ok(res.body.error);
      }
    });
  });

  describe('Session Security', () => {
    it('session cookies are HttpOnly', async () => {
      const res = await rawAgent()
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'testpassword' });

      const cookie = res.headers['set-cookie']?.[0];
      assert.ok(cookie);
      assert.ok(cookie.includes('HttpOnly'));
    });

    it('session cookies use SameSite', async () => {
      const res = await rawAgent()
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'testpassword' });

      const cookie = res.headers['set-cookie']?.[0];
      assert.ok(cookie);
      assert.ok(cookie.includes('SameSite'));
    });
  });
});
