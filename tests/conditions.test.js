const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFamilyMember, makeCondition } = require('./helpers');

describe('Health Conditions API', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('POST /api/conditions', () => {
    it('should create a new condition', async () => {
      const res = await agent()
        .post('/api/conditions')
        .send({ name: 'Diabetes Type 2', severity: 'moderate', status: 'active' })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.name, 'Diabetes Type 2');
      assert.equal(res.body.severity, 'moderate');
      assert.equal(res.body.status, 'active');
    });

    it('should create condition with all fields', async () => {
      const member = makeFamilyMember();
      const res = await agent()
        .post('/api/conditions')
        .send({
          family_member_id: member.id,
          name: 'Asthma',
          severity: 'severe',
          diagnosed_date: '2020-06-15',
          diagnosing_doctor: 'Dr. Patel',
          status: 'managed',
          notes: 'Seasonal trigger'
        })
        .expect(201);

      assert.equal(res.body.family_member_id, member.id);
      assert.equal(res.body.name, 'Asthma');
      assert.equal(res.body.severity, 'severe');
      assert.equal(res.body.diagnosed_date, '2020-06-15');
      assert.equal(res.body.diagnosing_doctor, 'Dr. Patel');
      assert.equal(res.body.status, 'managed');
      assert.equal(res.body.notes, 'Seasonal trigger');
    });

    it('should reject when name is missing', async () => {
      await agent().post('/api/conditions').send({ severity: 'mild' }).expect(400);
    });

    it('should reject invalid severity', async () => {
      await agent().post('/api/conditions').send({ name: 'Test', severity: 'invalid' }).expect(400);
    });

    it('should reject invalid status', async () => {
      await agent().post('/api/conditions').send({ name: 'Test', status: 'invalid' }).expect(400);
    });

    it('should use default severity and status', async () => {
      const res = await agent()
        .post('/api/conditions')
        .send({ name: 'Migraine' })
        .expect(201);

      assert.equal(res.body.severity, 'moderate');
      assert.equal(res.body.status, 'active');
    });
  });

  describe('GET /api/conditions', () => {
    it('should return empty list when no conditions exist', async () => {
      const res = await agent().get('/api/conditions').expect(200);
      assert.deepStrictEqual(res.body.data, []);
      assert.equal(res.body.total, 0);
    });

    it('should return all conditions for user', async () => {
      makeCondition({ name: 'Diabetes' });
      makeCondition({ name: 'Asthma' });

      const res = await agent().get('/api/conditions').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('should filter by severity', async () => {
      makeCondition({ name: 'Mild One', severity: 'mild' });
      makeCondition({ name: 'Severe One', severity: 'severe' });

      const res = await agent().get('/api/conditions?severity=severe').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Severe One');
    });

    it('should filter by status', async () => {
      makeCondition({ name: 'Active', status: 'active' });
      makeCondition({ name: 'Resolved', status: 'resolved' });

      const res = await agent().get('/api/conditions?status=resolved').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Resolved');
    });

    it('should filter by family member', async () => {
      const member = makeFamilyMember();
      makeCondition({ family_member_id: member.id });
      makeCondition({ family_member_id: null });

      const res = await agent().get(`/api/conditions?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].family_member_id, member.id);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) makeCondition({ name: `Condition ${i}` });

      const res = await agent().get('/api/conditions?page=1&limit=2').expect(200);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.total, 5);
      assert.equal(res.body.page, 1);
      assert.equal(res.body.limit, 2);
    });

    it('should sort by name asc', async () => {
      makeCondition({ name: 'Zebra' });
      makeCondition({ name: 'Alpha' });

      const res = await agent().get('/api/conditions?sort=name&order=asc').expect(200);
      assert.equal(res.body.data[0].name, 'Alpha');
    });
  });

  describe('GET /api/conditions/:id', () => {
    it('should return a single condition', async () => {
      const condition = makeCondition({ name: 'Hypertension' });
      const res = await agent().get(`/api/conditions/${condition.id}`).expect(200);
      assert.equal(res.body.id, condition.id);
      assert.equal(res.body.name, 'Hypertension');
    });

    it('should return 404 for non-existent condition', async () => {
      await agent().get('/api/conditions/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('should return 404 for another user\'s condition', async () => {
      const condition = makeCondition({ user_id: 999 });
      await agent().get(`/api/conditions/${condition.id}`).expect(404);
    });
  });

  describe('PUT /api/conditions/:id', () => {
    it('should update a condition', async () => {
      const condition = makeCondition({ name: 'Old Name', status: 'active' });
      const res = await agent()
        .put(`/api/conditions/${condition.id}`)
        .send({ name: 'New Name', status: 'managed' })
        .expect(200);

      assert.equal(res.body.name, 'New Name');
      assert.equal(res.body.status, 'managed');
    });

    it('should partially update a condition', async () => {
      const condition = makeCondition({ name: 'Original', notes: '' });
      const res = await agent()
        .put(`/api/conditions/${condition.id}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      assert.equal(res.body.name, 'Original');
      assert.equal(res.body.notes, 'Updated notes');
    });

    it('should return 404 when updating non-existent condition', async () => {
      await agent()
        .put('/api/conditions/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/conditions/:id', () => {
    it('should delete a condition', async () => {
      const condition = makeCondition();
      const res = await agent().delete(`/api/conditions/${condition.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/conditions/${condition.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent condition', async () => {
      await agent().delete('/api/conditions/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
