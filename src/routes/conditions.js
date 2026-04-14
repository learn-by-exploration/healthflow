const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createConditionSchema, updateConditionSchema, queryConditionSchema } = require('../schemas/condition.schema');
const ConditionRepo = require('../repos/condition.repo');
const ConditionService = require('../services/condition.service');

module.exports = function conditionsRoutes({ db }) {
  const router = Router();
  const service = new ConditionService(new ConditionRepo(db));

  // ─── List conditions ───
  router.get('/api/conditions', validate(queryConditionSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Get single condition ───
  router.get('/api/conditions/:id', (req, res) => {
    const condition = service.getById(req.params.id, req.userId);
    res.json(condition);
  });

  // ─── Create condition ───
  router.post('/api/conditions', validate(createConditionSchema), (req, res) => {
    const condition = service.create(req.userId, req.body);
    res.status(201).json(condition);
  });

  // ─── Update condition ───
  router.put('/api/conditions/:id', validate(updateConditionSchema), (req, res) => {
    const condition = service.update(req.params.id, req.userId, req.body);
    res.json(condition);
  });

  // ─── Delete condition ───
  router.delete('/api/conditions/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
