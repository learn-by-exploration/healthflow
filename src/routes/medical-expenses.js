const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createMedicalExpenseSchema, updateMedicalExpenseSchema, queryMedicalExpenseSchema } = require('../schemas/medical-expense.schema');
const MedicalExpenseRepo = require('../repos/medical-expense.repo');
const MedicalExpenseService = require('../services/medical-expense.service');

module.exports = function medicalExpensesRoutes({ db }) {
  const router = Router();
  const service = new MedicalExpenseService(new MedicalExpenseRepo(db));

  // ─── List medical expenses ───
  router.get('/api/medical-expenses', validate(queryMedicalExpenseSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Summary by category ───
  router.get('/api/medical-expenses/summary', (req, res) => {
    const filters = {};
    if (req.query.family_member_id) filters.family_member_id = req.query.family_member_id;
    if (req.query.from) filters.from = req.query.from;
    if (req.query.to) filters.to = req.query.to;
    const result = service.summary(req.userId, filters);
    res.json(result);
  });

  // ─── Get single medical expense ───
  router.get('/api/medical-expenses/:id', (req, res) => {
    const expense = service.getById(req.params.id, req.userId);
    res.json(expense);
  });

  // ─── Create medical expense ───
  router.post('/api/medical-expenses', validate(createMedicalExpenseSchema), (req, res) => {
    const expense = service.create(req.userId, req.body);
    res.status(201).json(expense);
  });

  // ─── Update medical expense ───
  router.put('/api/medical-expenses/:id', validate(updateMedicalExpenseSchema), (req, res) => {
    const expense = service.update(req.params.id, req.userId, req.body);
    res.json(expense);
  });

  // ─── Delete medical expense ───
  router.delete('/api/medical-expenses/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
