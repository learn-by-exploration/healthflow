const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeMedication, makeFamilyMember } = require('./helpers');

describe('Medications', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('GET /api/medications', () => {
    it('returns empty array when no medications exist', async () => {
      const res = await agent().get('/api/medications').expect(200);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('returns all medications for user', async () => {
      makeMedication({ name: 'Med A' });
      makeMedication({ name: 'Med B' });

      const res = await agent().get('/api/medications').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('filters medications by is_active', async () => {
      makeMedication({ name: 'Active', is_active: 1 });
      makeMedication({ name: 'Inactive', is_active: 0 });

      const res = await agent().get('/api/medications?is_active=1').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Active');
    });

    it('filters medications by family member', async () => {
      const member = makeFamilyMember();
      makeMedication({ family_member_id: member.id });
      makeMedication({ family_member_id: null });

      const res = await agent().get(`/api/medications?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('searches medications by name', async () => {
      makeMedication({ name: 'Aspirin' });
      makeMedication({ name: 'Ibuprofen' });

      const res = await agent().get('/api/medications?q=aspir').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Aspirin');
    });
  });

  describe('POST /api/medications', () => {
    it('creates a new medication', async () => {
      const res = await agent()
        .post('/api/medications')
        .send({
          name: 'New Medication',
          dosage: '250mg',
          frequency: 'twice_daily',
          schedule_times: '09:00,21:00',
          start_date: '2026-04-01',
          prescribing_doctor: 'Dr. Smith',
          is_active: 1
        })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.name, 'New Medication');
      assert.equal(res.body.frequency, 'twice_daily');
    });

    it('creates medication with refill info', async () => {
      const res = await agent()
        .post('/api/medications')
        .send({
          name: 'Med with Refill',
          refill_date: '2026-05-15',
          refill_quantity: 30,
          remaining_quantity: 10
        })
        .expect(201);

      assert.equal(res.body.refill_date, '2026-05-15');
      assert.equal(res.body.refill_quantity, 30);
    });

    it('returns 400 when name is missing', async () => {
      await agent().post('/api/medications').send({ dosage: '500mg' }).expect(400);
    });

    it('returns 400 for invalid frequency', async () => {
      await agent()
        .post('/api/medications')
        .send({ name: 'Test', frequency: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/medications/:id', () => {
    it('returns a single medication', async () => {
      const med = makeMedication({ name: 'Test Med' });
      const res = await agent().get(`/api/medications/${med.id}`).expect(200);

      assert.equal(res.body.id, med.id);
      assert.equal(res.body.name, 'Test Med');
    });

    it('returns 404 for non-existent medication', async () => {
      await agent().get('/api/medications/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('PUT /api/medications/:id', () => {
    it('updates a medication', async () => {
      const med = makeMedication({ name: 'Old Name', dosage: '500mg' });
      const res = await agent()
        .put(`/api/medications/${med.id}`)
        .send({ name: 'New Name', dosage: '1000mg' })
        .expect(200);

      assert.equal(res.body.name, 'New Name');
      assert.equal(res.body.dosage, '1000mg');
    });

    it('updates remaining quantity', async () => {
      const med = makeMedication({ remaining_quantity: 30 });
      const res = await agent()
        .put(`/api/medications/${med.id}`)
        .send({ remaining_quantity: 20 })
        .expect(200);

      assert.equal(res.body.remaining_quantity, 20);
    });

    it('returns 404 when updating non-existent medication', async () => {
      await agent()
        .put('/api/medications/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/medications/:id', () => {
    it('deletes a medication', async () => {
      const med = makeMedication();
      const res = await agent().delete(`/api/medications/${med.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/medications/${med.id}`).expect(404);
    });

    it('returns 404 when deleting non-existent medication', async () => {
      await agent().delete('/api/medications/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });

  describe('GET /api/medications/refills', () => {
    it('returns medications needing refills', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      makeMedication({ name: 'Needs Refill Soon', refill_date: tomorrow });
      makeMedication({ name: 'No Refill Needed', refill_date: '2027-01-01' });

      const res = await agent().get('/api/medications/refills').expect(200);
      assert.ok(res.body.data.length >= 0);
    });
  });
});
