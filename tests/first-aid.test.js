const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFirstAidItem } = require('./helpers');

describe('First Aid Items API', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('POST /api/first-aid', () => {
    it('should create a new first aid item', async () => {
      const res = await agent()
        .post('/api/first-aid')
        .send({ name: 'Bandages', category: 'wound_care', quantity: 10 })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.name, 'Bandages');
      assert.equal(res.body.category, 'wound_care');
      assert.equal(res.body.quantity, 10);
    });

    it('should create item with all fields', async () => {
      const res = await agent()
        .post('/api/first-aid')
        .send({
          name: 'Paracetamol',
          category: 'medication',
          quantity: 20,
          expiry_date: '2027-06-30',
          is_available: 1,
          notes: 'For fever and pain'
        })
        .expect(201);

      assert.equal(res.body.name, 'Paracetamol');
      assert.equal(res.body.category, 'medication');
      assert.equal(res.body.quantity, 20);
      assert.equal(res.body.expiry_date, '2027-06-30');
      assert.equal(res.body.is_available, 1);
      assert.equal(res.body.notes, 'For fever and pain');
    });

    it('should reject when name is missing', async () => {
      await agent().post('/api/first-aid').send({ category: 'general' }).expect(400);
    });

    it('should reject empty name', async () => {
      await agent().post('/api/first-aid').send({ name: '' }).expect(400);
    });

    it('should reject invalid category', async () => {
      await agent().post('/api/first-aid').send({ name: 'Test', category: 'invalid' }).expect(400);
    });

    it('should reject negative quantity', async () => {
      await agent().post('/api/first-aid').send({ name: 'Test', quantity: -1 }).expect(400);
    });

    it('should use default category and quantity', async () => {
      const res = await agent()
        .post('/api/first-aid')
        .send({ name: 'Scissors' })
        .expect(201);

      assert.equal(res.body.category, 'general');
      assert.equal(res.body.quantity, 1);
      assert.equal(res.body.is_available, 1);
    });
  });

  describe('GET /api/first-aid', () => {
    it('should return empty list when no items exist', async () => {
      const res = await agent().get('/api/first-aid').expect(200);
      assert.deepStrictEqual(res.body.data, []);
      assert.equal(res.body.total, 0);
    });

    it('should return all items for user', async () => {
      makeFirstAidItem({ name: 'Bandage' });
      makeFirstAidItem({ name: 'Scissors' });

      const res = await agent().get('/api/first-aid').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('should filter by category', async () => {
      makeFirstAidItem({ name: 'Bandage', category: 'wound_care' });
      makeFirstAidItem({ name: 'Gloves', category: 'ppe' });

      const res = await agent().get('/api/first-aid?category=wound_care').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Bandage');
    });

    it('should filter by availability', async () => {
      makeFirstAidItem({ name: 'Available', is_available: 1 });
      makeFirstAidItem({ name: 'Unavailable', is_available: 0 });

      const res = await agent().get('/api/first-aid?is_available=1').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Available');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) makeFirstAidItem({ name: `Item ${i}` });

      const res = await agent().get('/api/first-aid?page=1&limit=2').expect(200);
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.total, 5);
    });

    it('should sort by name asc', async () => {
      makeFirstAidItem({ name: 'Zebra tape' });
      makeFirstAidItem({ name: 'Alcohol swabs' });

      const res = await agent().get('/api/first-aid?sort=name&order=asc').expect(200);
      assert.equal(res.body.data[0].name, 'Alcohol swabs');
    });
  });

  describe('GET /api/first-aid/expiring', () => {
    it('should return empty list when no items are expiring', async () => {
      makeFirstAidItem({ name: 'No expiry', expiry_date: null });

      const res = await agent().get('/api/first-aid/expiring').expect(200);
      assert.deepStrictEqual(res.body.data, []);
    });

    it('should return items expiring within default 30 days', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 10);
      const soonStr = soon.toISOString().split('T')[0];

      const later = new Date();
      later.setDate(later.getDate() + 60);
      const laterStr = later.toISOString().split('T')[0];

      makeFirstAidItem({ name: 'Expiring soon', expiry_date: soonStr });
      makeFirstAidItem({ name: 'Expiring later', expiry_date: laterStr });

      const res = await agent().get('/api/first-aid/expiring').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Expiring soon');
    });

    it('should accept custom days parameter', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const soonStr = soon.toISOString().split('T')[0];

      makeFirstAidItem({ name: 'Very soon', expiry_date: soonStr });

      const res = await agent().get('/api/first-aid/expiring?days=7').expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should not return unavailable items', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      const soonStr = soon.toISOString().split('T')[0];

      makeFirstAidItem({ name: 'Unavail expiring', expiry_date: soonStr, is_available: 0 });

      const res = await agent().get('/api/first-aid/expiring').expect(200);
      assert.equal(res.body.data.length, 0);
    });

    it('should return expired items', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const pastStr = past.toISOString().split('T')[0];

      makeFirstAidItem({ name: 'Already expired', expiry_date: pastStr });

      const res = await agent().get('/api/first-aid/expiring').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].name, 'Already expired');
    });
  });

  describe('GET /api/first-aid/:id', () => {
    it('should return a single item', async () => {
      const item = makeFirstAidItem({ name: 'Thermometer' });
      const res = await agent().get(`/api/first-aid/${item.id}`).expect(200);
      assert.equal(res.body.id, item.id);
      assert.equal(res.body.name, 'Thermometer');
    });

    it('should return 404 for non-existent item', async () => {
      await agent().get('/api/first-aid/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('should return 404 for another user\'s item', async () => {
      const item = makeFirstAidItem({ user_id: 999 });
      await agent().get(`/api/first-aid/${item.id}`).expect(404);
    });
  });

  describe('PUT /api/first-aid/:id', () => {
    it('should update an item', async () => {
      const item = makeFirstAidItem({ name: 'Old', quantity: 5 });
      const res = await agent()
        .put(`/api/first-aid/${item.id}`)
        .send({ name: 'New', quantity: 10 })
        .expect(200);

      assert.equal(res.body.name, 'New');
      assert.equal(res.body.quantity, 10);
    });

    it('should partially update an item', async () => {
      const item = makeFirstAidItem({ name: 'Original', notes: '' });
      const res = await agent()
        .put(`/api/first-aid/${item.id}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      assert.equal(res.body.name, 'Original');
      assert.equal(res.body.notes, 'Updated notes');
    });

    it('should mark item as unavailable', async () => {
      const item = makeFirstAidItem({ is_available: 1 });
      const res = await agent()
        .put(`/api/first-aid/${item.id}`)
        .send({ is_available: 0 })
        .expect(200);

      assert.equal(res.body.is_available, 0);
    });

    it('should return 404 when updating non-existent item', async () => {
      await agent()
        .put('/api/first-aid/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/first-aid/:id', () => {
    it('should delete an item', async () => {
      const item = makeFirstAidItem();
      const res = await agent().delete(`/api/first-aid/${item.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/first-aid/${item.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent item', async () => {
      await agent().delete('/api/first-aid/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
