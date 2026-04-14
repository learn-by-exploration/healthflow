const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeVital, makeFamilyMember } = require('./helpers');

describe('Vitals', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('GET /api/vitals', () => {
    it('returns empty array when no vitals exist', async () => {
      const res = await agent().get('/api/vitals').expect(200);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('returns all vitals for user', async () => {
      makeVital({ type: 'blood_pressure', value: 120, value_secondary: 80 });
      makeVital({ type: 'weight', value: 75.5 });

      const res = await agent().get('/api/vitals').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('filters vitals by type', async () => {
      makeVital({ type: 'blood_pressure' });
      makeVital({ type: 'weight' });

      const res = await agent().get('/api/vitals?type=blood_pressure').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].type, 'blood_pressure');
    });

    it('filters vitals by family member', async () => {
      const member = makeFamilyMember();
      makeVital({ family_member_id: member.id });
      makeVital({ family_member_id: null });

      const res = await agent().get(`/api/vitals?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].family_member_id, member.id);
    });

    it('filters vitals by date range', async () => {
      makeVital({ measured_at: '2026-04-10T10:00:00Z' });
      makeVital({ measured_at: '2026-04-15T10:00:00Z' });
      makeVital({ measured_at: '2026-04-20T10:00:00Z' });

      const res = await agent().get('/api/vitals?from=2026-04-14&to=2026-04-16').expect(200);
      assert.equal(res.body.data.length, 1);
    });
  });

  describe('POST /api/vitals', () => {
    it('creates a new vital', async () => {
      const res = await agent()
        .post('/api/vitals')
        .send({
          type: 'blood_pressure',
          value: 120,
          value_secondary: 80,
          unit: 'mmHg',
          notes: 'Morning reading'
        })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.type, 'blood_pressure');
      assert.equal(res.body.value, 120);
      assert.equal(res.body.value_secondary, 80);
    });

    it('creates vital with family member', async () => {
      const member = makeFamilyMember();
      const res = await agent()
        .post('/api/vitals')
        .send({
          family_member_id: member.id,
          type: 'weight',
          value: 65.5,
          unit: 'kg'
        })
        .expect(201);

      assert.equal(res.body.family_member_id, member.id);
    });

    it('returns 400 when type is missing', async () => {
      await agent().post('/api/vitals').send({ value: 120 }).expect(400);
    });

    it('returns 400 when value is missing', async () => {
      await agent().post('/api/vitals').send({ type: 'blood_pressure' }).expect(400);
    });

    it('returns 400 for invalid type', async () => {
      await agent()
        .post('/api/vitals')
        .send({ type: 'invalid_type', value: 120 })
        .expect(400);
    });
  });

  describe('GET /api/vitals/:id', () => {
    it('returns a single vital', async () => {
      const vital = makeVital({ type: 'temperature', value: 37.2 });
      const res = await agent().get(`/api/vitals/${vital.id}`).expect(200);

      assert.equal(res.body.id, vital.id);
      assert.equal(res.body.type, 'temperature');
    });

    it('returns 404 for non-existent vital', async () => {
      await agent().get('/api/vitals/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('returns 404 for another user\'s vital', async () => {
      const vital = makeVital({ user_id: 999 });
      await agent().get(`/api/vitals/${vital.id}`).expect(404);
    });
  });

  describe('PUT /api/vitals/:id', () => {
    it('updates a vital', async () => {
      const vital = makeVital({ type: 'blood_pressure', value: 120 });
      const res = await agent()
        .put(`/api/vitals/${vital.id}`)
        .send({ value: 125, notes: 'Updated' })
        .expect(200);

      assert.equal(res.body.value, 125);
      assert.equal(res.body.notes, 'Updated');
    });

    it('returns 404 when updating non-existent vital', async () => {
      await agent()
        .put('/api/vitals/00000000-0000-0000-0000-000000000000')
        .send({ value: 130 })
        .expect(404);
    });
  });

  describe('DELETE /api/vitals/:id', () => {
    it('deletes a vital', async () => {
      const vital = makeVital();
      const res = await agent().delete(`/api/vitals/${vital.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/vitals/${vital.id}`).expect(404);
    });

    it('returns 404 when deleting non-existent vital', async () => {
      await agent().delete('/api/vitals/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('GET /api/vitals/trends', () => {
    it('should return aggregated trends by type', async () => {
      makeVital({ type: 'blood_pressure', value: 120, value_secondary: 80 });
      makeVital({ type: 'blood_pressure', value: 130, value_secondary: 85 });
      makeVital({ type: 'weight', value: 72, value_secondary: null });

      const res = await agent()
        .get('/api/vitals/trends')
        .expect(200);

      assert.ok(Array.isArray(res.body.data));
      const bp = res.body.data.find(d => d.type === 'blood_pressure');
      assert.ok(bp);
      assert.strictEqual(bp.count, 2);
      assert.strictEqual(bp.avg_value, 125);
      assert.strictEqual(bp.min_value, 120);
      assert.strictEqual(bp.max_value, 130);
    });

    it('should filter trends by type', async () => {
      makeVital({ type: 'blood_pressure', value: 120 });
      makeVital({ type: 'weight', value: 72, value_secondary: null });

      const res = await agent()
        .get('/api/vitals/trends?type=weight')
        .expect(200);

      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].type, 'weight');
    });

    it('should return empty data when no vitals exist', async () => {
      const res = await agent()
        .get('/api/vitals/trends')
        .expect(200);

      assert.strictEqual(res.body.data.length, 0);
    });

    it('should filter by date range', async () => {
      makeVital({ type: 'weight', value: 72, value_secondary: null, measured_at: '2025-01-15T10:00:00.000Z' });
      makeVital({ type: 'weight', value: 74, value_secondary: null, measured_at: '2025-03-15T10:00:00.000Z' });

      const res = await agent()
        .get('/api/vitals/trends?from=2025-03-01&to=2025-03-31')
        .expect(200);

      const weight = res.body.data.find(d => d.type === 'weight');
      if (weight) {
        assert.strictEqual(weight.count, 1);
        assert.strictEqual(weight.avg_value, 74);
      }
    });
  });
});
