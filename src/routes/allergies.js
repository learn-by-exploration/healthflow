const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createAllergySchema, updateAllergySchema, queryAllergySchema } = require('../schemas/allergy.schema');
const AllergyRepo = require('../repos/allergy.repo');
const AllergyService = require('../services/allergy.service');

module.exports = function allergiesRoutes({ db }) {
  const router = Router();
  const service = new AllergyService(new AllergyRepo(db));

  // ─── List allergies ───
  router.get('/api/allergies', validate(queryAllergySchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Get single allergy ───
  router.get('/api/allergies/:id', (req, res) => {
    const allergy = service.getById(req.params.id, req.userId);
    res.json(allergy);
  });

  // ─── Create allergy ───
  router.post('/api/allergies', validate(createAllergySchema), (req, res) => {
    const allergy = service.create(req.userId, req.body);
    res.status(201).json(allergy);
  });

  // ─── Update allergy ───
  router.put('/api/allergies/:id', validate(updateAllergySchema), (req, res) => {
    const allergy = service.update(req.params.id, req.userId, req.body);
    res.json(allergy);
  });

  // ─── Delete allergy ───
  router.delete('/api/allergies/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
