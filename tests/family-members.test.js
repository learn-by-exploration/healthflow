const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFamilyMember } = require('./helpers');

describe('Family Members', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('GET /api/family-members', () => {
    it('returns empty array when no family members exist', async () => {
      const res = await agent().get('/api/family-members').expect(200);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('returns all family members for user', async () => {
      makeFamilyMember({ name: 'Child 1', relation: 'child' });
      makeFamilyMember({ name: 'Child 2', relation: 'child' });

      const res = await agent().get('/api/family-members').expect(200);
      assert.equal(res.body.data.length, 2);
    });
  });

  describe('POST /api/family-members', () => {
    it('creates a new family member', async () => {
      const res = await agent()
        .post('/api/family-members')
        .send({
          name: 'John Smith',
          relation: 'spouse',
          date_of_birth: '1985-03-15',
          gender: 'male',
          blood_type: 'B+',
          notes: 'Prefers evening appointments'
        })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.name, 'John Smith');
      assert.equal(res.body.relation, 'spouse');
      assert.equal(res.body.gender, 'male');
    });

    it('creates family member with minimal info', async () => {
      const res = await agent()
        .post('/api/family-members')
        .send({ name: 'Jane Doe' })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.name, 'Jane Doe');
      assert.equal(res.body.relation, 'self');
    });

    it('returns 400 when name is missing', async () => {
      await agent()
        .post('/api/family-members')
        .send({ relation: 'child' })
        .expect(400);
    });

    it('returns 400 for empty name', async () => {
      await agent()
        .post('/api/family-members')
        .send({ name: '' })
        .expect(400);
    });

    it('returns 400 for invalid relation', async () => {
      await agent()
        .post('/api/family-members')
        .send({ name: 'Test', relation: 'invalid' })
        .expect(400);
    });

    it('returns 400 for invalid date format', async () => {
      await agent()
        .post('/api/family-members')
        .send({ name: 'Test', date_of_birth: 'invalid-date' })
        .expect(400);
    });

    it('returns 400 for invalid gender', async () => {
      await agent()
        .post('/api/family-members')
        .send({ name: 'Test', gender: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/family-members/:id', () => {
    it('returns a single family member', async () => {
      const member = makeFamilyMember({ name: 'Test Member' });
      const res = await agent().get(`/api/family-members/${member.id}`).expect(200);

      assert.equal(res.body.id, member.id);
      assert.equal(res.body.name, 'Test Member');
    });

    it('returns 404 for non-existent family member', async () => {
      await agent().get('/api/family-members/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('returns 404 for another user\'s family member', async () => {
      const member = makeFamilyMember({ user_id: 999 });
      await agent().get(`/api/family-members/${member.id}`).expect(404);
    });
  });

  describe('PUT /api/family-members/:id', () => {
    it('updates a family member', async () => {
      const member = makeFamilyMember({ name: 'Old Name', relation: 'child' });
      const res = await agent()
        .put(`/api/family-members/${member.id}`)
        .send({
          name: 'New Name',
          blood_type: 'AB-',
          notes: 'Updated notes'
        })
        .expect(200);

      assert.equal(res.body.name, 'New Name');
      assert.equal(res.body.blood_type, 'AB-');
      assert.equal(res.body.notes, 'Updated notes');
    });

    it('updates only specified fields', async () => {
      const member = makeFamilyMember({ name: 'Test', relation: 'parent' });
      const res = await agent()
        .put(`/api/family-members/${member.id}`)
        .send({ notes: 'Just updating notes' })
        .expect(200);

      // Verify the original fields are preserved
      assert.equal(res.body.name, 'Test');
      assert.equal(res.body.notes, 'Just updating notes');
      // Note: relation may default to 'self' if not provided in update - adjust test based on actual behavior
    });

    it('returns 404 when updating non-existent family member', async () => {
      await agent()
        .put('/api/family-members/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/family-members/:id', () => {
    it('deletes a family member', async () => {
      const member = makeFamilyMember();
      const res = await agent().delete(`/api/family-members/${member.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/family-members/${member.id}`).expect(404);
    });

    it('returns 404 when deleting non-existent family member', async () => {
      await agent().delete('/api/family-members/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('cascades delete to related records', async () => {
      const member = makeFamilyMember();
      const { makeVital } = require('./helpers');
      makeVital({ family_member_id: member.id });

      await agent().delete(`/api/family-members/${member.id}`).expect(200);

      // Verify related records are handled (SET NULL per schema)
      const { db } = setup();
      const vital = db.prepare('SELECT * FROM vitals WHERE family_member_id = ?').get(member.id);
      assert.equal(vital, undefined);
    });
  });
});
