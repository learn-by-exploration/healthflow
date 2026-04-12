const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createMedicationSchema, updateMedicationSchema, queryMedicationSchema } = require('../schemas/medication.schema');
const MedicationRepo = require('../repos/medication.repo');
const MedicationService = require('../services/medication.service');

module.exports = function medicationsRoutes({ db }) {
  const router = Router();
  const service = new MedicationService(new MedicationRepo(db));

  // ─── List medications ───
  router.get('/api/medications', validate(queryMedicationSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Refill alerts ───
  router.get('/api/medications/refills', (req, res) => {
    const refills = service.getRefillAlerts(req.userId);
    res.json({ data: refills });
  });

  // ─── Get single medication ───
  router.get('/api/medications/:id', (req, res) => {
    const med = service.getById(req.params.id, req.userId);
    res.json(med);
  });

  // ─── Create medication ───
  router.post('/api/medications', validate(createMedicationSchema), (req, res) => {
    const med = service.create(req.userId, req.body);
    res.status(201).json(med);
  });

  // ─── Update medication ───
  router.put('/api/medications/:id', validate(updateMedicationSchema), (req, res) => {
    const med = service.update(req.params.id, req.userId, req.body);
    res.json(med);
  });

  // ─── Delete medication ───
  router.delete('/api/medications/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
