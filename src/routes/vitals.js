const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createVitalSchema, updateVitalSchema, queryVitalSchema } = require('../schemas/vital.schema');
const VitalRepo = require('../repos/vital.repo');
const VitalService = require('../services/vital.service');

module.exports = function vitalsRoutes({ db }) {
  const router = Router();
  const service = new VitalService(new VitalRepo(db));

  // ─── List vitals ───
  router.get('/api/vitals', validate(queryVitalSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Get single vital ───
  router.get('/api/vitals/:id', (req, res) => {
    const vital = service.getById(req.params.id, req.userId);
    res.json(vital);
  });

  // ─── Create vital ───
  router.post('/api/vitals', validate(createVitalSchema), (req, res) => {
    const vital = service.create(req.userId, req.body);
    res.status(201).json(vital);
  });

  // ─── Update vital ───
  router.put('/api/vitals/:id', validate(updateVitalSchema), (req, res) => {
    const vital = service.update(req.params.id, req.userId, req.body);
    res.json(vital);
  });

  // ─── Delete vital ───
  router.delete('/api/vitals/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
