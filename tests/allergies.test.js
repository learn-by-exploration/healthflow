const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFamilyMember, makeAllergy } = require('./helpers');

describe('Allergies API', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('POST /api/allergies', () => {
    it('should create a new allergy', async () => {
      const res = await agent()
        .post('/api/allergies')
        .send({ allergen: 'Penicillin', category: 'drug', severity: 'severe' })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.allergen, 'Penicillin');
      assert.equal(res.body.category, 'drug');
      assert.equal(res.body.severity, 'severe');
    });

    it('should create allergy with all fields', async () => {
      const member = makeFamilyMember();
      const res = await agent()
        .post('/api/allergies')
        .send({
          family_member_id: member.id,
          allergen: 'Peanuts',
          category: 'food',
          severity: 'life_threatening',
          reaction: 'Anaphylaxis',
          diagnosed_date: '2019-03-10',
          notes: 'Carry EpiPen'
        })
        .expect(201);

      assert.equal(res.body.family_member_id, member.id);
      assert.equal(res.body.allergen, 'Peanuts');
      assert.equal(res.body.category, 'food');
      assert.equal(res.body.severity, 'life_threatening');
      assert.equal(res.body.reaction, 'Anaphylaxis');
      assert.equal(res.body.diagnosed_date, '2019-03-10');
      assert.equal(res.body.notes, 'Carry EpiPen');
    });

    it('should reject when allergen is missing', async () => {
      await agent().post('/api/allergies').send({ category: 'food' }).expect(400);
    });

    it('should reject invalid category', async () => {
      await agent().post('/api/allergies').send({ allergen: 'Dust', category: 'invalid' }).expect(400);
    });

    it('should reject invalid severity', async () => {
      await agent().post('/api/allergies').send({ allergen: 'Dust', severity: 'invalid' }).expect(400);
    });

    it('should use default category and severity', async () => {
      const res = await agent()
        .post('/api/allergies')
        .send({ allergen: 'Pollen' })
        .expect(201);

      assert.equal(res.body.category, 'other');
      assert.equal(res.body.severity, 'moderate');
    });

    it('should reject empty allergen string', async () => {
      await agent().post('/api/allergies').send({ allergen: '' }).expect(400);
    });
  });

  describe('GET /api/allergies', () => {
    it('should return empty list when no allergies exist', async () => {
      const res = await agent().get('/api/allergies').expect(200);
      assert.deepStrictEqual(res.body.data, []);
      assert.equal(res.body.total, 0);
    });

    it('should return all allergies for user', async () => {
      makeAllergy({ allergen: 'Penicillin' });
      makeAllergy({ allergen: 'Peanuts' });

      const res = await agent().get('/api/allergies').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('should filter by category', async () => {
      makeAllergy({ allergen: 'Penicillin', category: 'drug' });
      makeAllergy({ allergen: 'Peanuts', category: 'food' });

      const res = await agent().get('/api/allergies?category=drug').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].allergen, 'Penicillin');
    });

    it('should filter by severity', async () => {
      makeAllergy({ allergen: 'Dust', severity: 'mild' });
      makeAllergy({ allergen: 'Peanuts', severity: 'life_threatening' });

      const res = await agent().get('/api/allergies?severity=life_threatening').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].allergen, 'Peanuts');
    });

    it('should filter by family member', async () => {
      const member = makeFamilyMember();
      makeAllergy({ family_member_id: member.id });
      makeAllergy({ family_member_id: null });

      const res = await agent().get(`/api/allergies?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) makeAllergy({ allergen: `Allergen ${i}` });

      const res = await agent().get('/api/allergies?page=2&limit=2').expect(200);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.total, 5);
      assert.equal(res.body.page, 2);
    });

    it('should sort by allergen asc', async () => {
      makeAllergy({ allergen: 'Zinc' });
      makeAllergy({ allergen: 'Aspirin' });

      const res = await agent().get('/api/allergies?sort=allergen&order=asc').expect(200);
      assert.equal(res.body.data[0].allergen, 'Aspirin');
    });
  });

  describe('GET /api/allergies/:id', () => {
    it('should return a single allergy', async () => {
      const allergy = makeAllergy({ allergen: 'Latex' });
      const res = await agent().get(`/api/allergies/${allergy.id}`).expect(200);
      assert.equal(res.body.id, allergy.id);
      assert.equal(res.body.allergen, 'Latex');
    });

    it('should return 404 for non-existent allergy', async () => {
      await agent().get('/api/allergies/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('should return 404 for another user\'s allergy', async () => {
      const allergy = makeAllergy({ user_id: 999 });
      await agent().get(`/api/allergies/${allergy.id}`).expect(404);
    });
  });

  describe('PUT /api/allergies/:id', () => {
    it('should update an allergy', async () => {
      const allergy = makeAllergy({ allergen: 'Old', severity: 'mild' });
      const res = await agent()
        .put(`/api/allergies/${allergy.id}`)
        .send({ allergen: 'New', severity: 'severe' })
        .expect(200);

      assert.equal(res.body.allergen, 'New');
      assert.equal(res.body.severity, 'severe');
    });

    it('should partially update an allergy', async () => {
      const allergy = makeAllergy({ allergen: 'Dust', notes: '' });
      const res = await agent()
        .put(`/api/allergies/${allergy.id}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      assert.equal(res.body.allergen, 'Dust');
      assert.equal(res.body.notes, 'Updated notes');
    });

    it('should return 404 when updating non-existent allergy', async () => {
      await agent()
        .put('/api/allergies/00000000-0000-0000-0000-000000000000')
        .send({ allergen: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/allergies/:id', () => {
    it('should delete an allergy', async () => {
      const allergy = makeAllergy();
      const res = await agent().delete(`/api/allergies/${allergy.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/allergies/${allergy.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent allergy', async () => {
      await agent().delete('/api/allergies/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
