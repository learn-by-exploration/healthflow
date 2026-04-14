const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createFirstAidSchema, updateFirstAidSchema, queryFirstAidSchema } = require('../schemas/first-aid.schema');
const FirstAidRepo = require('../repos/first-aid.repo');
const FirstAidService = require('../services/first-aid.service');

module.exports = function firstAidRoutes({ db }) {
  const router = Router();
  const service = new FirstAidService(new FirstAidRepo(db));

  // ─── List first aid items ───
  router.get('/api/first-aid', validate(queryFirstAidSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Expiring items ───
  router.get('/api/first-aid/expiring', (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const items = service.getExpiring(req.userId, days);
    res.json({ data: items });
  });

  // ─── Get single first aid item ───
  router.get('/api/first-aid/:id', (req, res) => {
    const item = service.getById(req.params.id, req.userId);
    res.json(item);
  });

  // ─── Create first aid item ───
  router.post('/api/first-aid', validate(createFirstAidSchema), (req, res) => {
    const item = service.create(req.userId, req.body);
    res.status(201).json(item);
  });

  // ─── Update first aid item ───
  router.put('/api/first-aid/:id', validate(updateFirstAidSchema), (req, res) => {
    const item = service.update(req.params.id, req.userId, req.body);
    res.json(item);
  });

  // ─── Delete first aid item ───
  router.delete('/api/first-aid/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
