const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, cleanDb, teardown, agent, makeFamilyMember, makeMedicalExpense } = require('./helpers');

describe('Medical Expenses API', () => {
  before(() => setup());
  beforeEach(() => cleanDb());
  after(() => teardown());

  describe('POST /api/medical-expenses', () => {
    it('should create a new medical expense', async () => {
      const res = await agent()
        .post('/api/medical-expenses')
        .send({
          description: 'Doctor consultation',
          amount: 150000,
          expense_date: '2026-04-10'
        })
        .expect(201);

      assert.ok(res.body.id);
      assert.equal(res.body.description, 'Doctor consultation');
      assert.equal(res.body.amount, 150000);
      assert.equal(res.body.expense_date, '2026-04-10');
    });

    it('should create expense with all fields', async () => {
      const member = makeFamilyMember();
      const res = await agent()
        .post('/api/medical-expenses')
        .send({
          family_member_id: member.id,
          category: 'medication',
          description: 'Insulin supply',
          amount: 350000,
          currency: 'INR',
          expense_date: '2026-04-01',
          payment_method: 'insurance',
          insurance_claimed: 1,
          notes: 'Monthly supply'
        })
        .expect(201);

      assert.equal(res.body.family_member_id, member.id);
      assert.equal(res.body.category, 'medication');
      assert.equal(res.body.amount, 350000);
      assert.equal(res.body.payment_method, 'insurance');
      assert.equal(res.body.insurance_claimed, 1);
    });

    it('should reject when description is missing', async () => {
      await agent().post('/api/medical-expenses').send({ amount: 100, expense_date: '2026-01-01' }).expect(400);
    });

    it('should reject when amount is missing', async () => {
      await agent().post('/api/medical-expenses').send({ description: 'Test', expense_date: '2026-01-01' }).expect(400);
    });

    it('should reject when expense_date is missing', async () => {
      await agent().post('/api/medical-expenses').send({ description: 'Test', amount: 100 }).expect(400);
    });

    it('should reject negative amount', async () => {
      await agent().post('/api/medical-expenses')
        .send({ description: 'Test', amount: -100, expense_date: '2026-01-01' }).expect(400);
    });

    it('should reject invalid category', async () => {
      await agent().post('/api/medical-expenses')
        .send({ description: 'Test', amount: 100, expense_date: '2026-01-01', category: 'invalid' }).expect(400);
    });

    it('should reject invalid payment_method', async () => {
      await agent().post('/api/medical-expenses')
        .send({ description: 'Test', amount: 100, expense_date: '2026-01-01', payment_method: 'bitcoin' }).expect(400);
    });

    it('should use default category and currency', async () => {
      const res = await agent()
        .post('/api/medical-expenses')
        .send({ description: 'Checkup', amount: 50000, expense_date: '2026-04-10' })
        .expect(201);

      assert.equal(res.body.category, 'consultation');
      assert.equal(res.body.currency, 'INR');
    });

    it('should reject float amount', async () => {
      await agent().post('/api/medical-expenses')
        .send({ description: 'Test', amount: 100.50, expense_date: '2026-01-01' }).expect(400);
    });
  });

  describe('GET /api/medical-expenses', () => {
    it('should return empty list when no expenses exist', async () => {
      const res = await agent().get('/api/medical-expenses').expect(200);
      assert.deepStrictEqual(res.body.data, []);
      assert.equal(res.body.total, 0);
    });

    it('should return all expenses for user', async () => {
      makeMedicalExpense({ description: 'Expense 1' });
      makeMedicalExpense({ description: 'Expense 2' });

      const res = await agent().get('/api/medical-expenses').expect(200);
      assert.equal(res.body.data.length, 2);
    });

    it('should filter by category', async () => {
      makeMedicalExpense({ category: 'medication' });
      makeMedicalExpense({ category: 'consultation' });

      const res = await agent().get('/api/medical-expenses?category=medication').expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].category, 'medication');
    });

    it('should filter by date range', async () => {
      makeMedicalExpense({ expense_date: '2026-03-01' });
      makeMedicalExpense({ expense_date: '2026-04-15' });
      makeMedicalExpense({ expense_date: '2026-05-01' });

      const res = await agent().get('/api/medical-expenses?from=2026-04-01&to=2026-04-30').expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should filter by family member', async () => {
      const member = makeFamilyMember();
      makeMedicalExpense({ family_member_id: member.id });
      makeMedicalExpense({ family_member_id: null });

      const res = await agent().get(`/api/medical-expenses?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.data.length, 1);
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) makeMedicalExpense({ description: `Expense ${i}` });

      const res = await agent().get('/api/medical-expenses?page=1&limit=3').expect(200);
      assert.equal(res.body.data.length, 3);
      assert.equal(res.body.total, 5);
    });

    it('should sort by amount desc', async () => {
      makeMedicalExpense({ description: 'Cheap', amount: 1000 });
      makeMedicalExpense({ description: 'Expensive', amount: 500000 });

      const res = await agent().get('/api/medical-expenses?sort=amount&order=desc').expect(200);
      assert.equal(res.body.data[0].description, 'Expensive');
    });
  });

  describe('GET /api/medical-expenses/summary', () => {
    it('should return empty summary when no expenses', async () => {
      const res = await agent().get('/api/medical-expenses/summary').expect(200);
      assert.equal(res.body.total, 0);
      assert.equal(res.body.count, 0);
      assert.deepStrictEqual(res.body.by_category, []);
    });

    it('should return totals by category', async () => {
      makeMedicalExpense({ category: 'medication', amount: 10000 });
      makeMedicalExpense({ category: 'medication', amount: 20000 });
      makeMedicalExpense({ category: 'consultation', amount: 50000 });

      const res = await agent().get('/api/medical-expenses/summary').expect(200);
      assert.equal(res.body.total, 80000);
      assert.equal(res.body.count, 3);
      assert.equal(res.body.by_category.length, 2);

      const consultation = res.body.by_category.find(c => c.category === 'consultation');
      assert.equal(consultation.total, 50000);
      assert.equal(consultation.count, 1);
    });

    it('should filter summary by date range', async () => {
      makeMedicalExpense({ amount: 10000, expense_date: '2026-03-15' });
      makeMedicalExpense({ amount: 20000, expense_date: '2026-04-15' });

      const res = await agent().get('/api/medical-expenses/summary?from=2026-04-01&to=2026-04-30').expect(200);
      assert.equal(res.body.total, 20000);
      assert.equal(res.body.count, 1);
    });

    it('should filter summary by family member', async () => {
      const member = makeFamilyMember();
      makeMedicalExpense({ family_member_id: member.id, amount: 15000 });
      makeMedicalExpense({ family_member_id: null, amount: 25000 });

      const res = await agent().get(`/api/medical-expenses/summary?family_member_id=${member.id}`).expect(200);
      assert.equal(res.body.total, 15000);
      assert.equal(res.body.count, 1);
    });
  });

  describe('GET /api/medical-expenses/:id', () => {
    it('should return a single expense', async () => {
      const expense = makeMedicalExpense({ description: 'Lab test' });
      const res = await agent().get(`/api/medical-expenses/${expense.id}`).expect(200);
      assert.equal(res.body.id, expense.id);
      assert.equal(res.body.description, 'Lab test');
    });

    it('should return 404 for non-existent expense', async () => {
      await agent().get('/api/medical-expenses/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('should return 404 for another user\'s expense', async () => {
      const expense = makeMedicalExpense({ user_id: 999 });
      await agent().get(`/api/medical-expenses/${expense.id}`).expect(404);
    });
  });

  describe('PUT /api/medical-expenses/:id', () => {
    it('should update an expense', async () => {
      const expense = makeMedicalExpense({ description: 'Old', amount: 1000 });
      const res = await agent()
        .put(`/api/medical-expenses/${expense.id}`)
        .send({ description: 'Updated', amount: 2000 })
        .expect(200);

      assert.equal(res.body.description, 'Updated');
      assert.equal(res.body.amount, 2000);
    });

    it('should partially update an expense', async () => {
      const expense = makeMedicalExpense({ description: 'Original', notes: '' });
      const res = await agent()
        .put(`/api/medical-expenses/${expense.id}`)
        .send({ notes: 'Added notes' })
        .expect(200);

      assert.equal(res.body.description, 'Original');
      assert.equal(res.body.notes, 'Added notes');
    });

    it('should return 404 when updating non-existent expense', async () => {
      await agent()
        .put('/api/medical-expenses/00000000-0000-0000-0000-000000000000')
        .send({ description: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/medical-expenses/:id', () => {
    it('should delete an expense', async () => {
      const expense = makeMedicalExpense();
      const res = await agent().delete(`/api/medical-expenses/${expense.id}`).expect(200);
      assert.ok(res.body.ok);

      await agent().get(`/api/medical-expenses/${expense.id}`).expect(404);
    });

    it('should return 404 when deleting non-existent expense', async () => {
      await agent().delete('/api/medical-expenses/00000000-0000-0000-0000-000000000000').expect(404);
    });
  });
});
