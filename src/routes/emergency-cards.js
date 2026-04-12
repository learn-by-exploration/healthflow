const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createEmergencyCardSchema, updateEmergencyCardSchema } = require('../schemas/emergency-card.schema');
const EmergencyCardRepo = require('../repos/emergency-card.repo');
const EmergencyCardService = require('../services/emergency-card.service');

module.exports = function emergencyCardsRoutes({ db }) {
  const router = Router();
  const service = new EmergencyCardService(new EmergencyCardRepo(db));

  // ─── List emergency cards ───
  router.get('/api/emergency-cards', (req, res) => {
    const cards = service.list(req.userId);
    res.json({ data: cards });
  });

  // ─── Get single emergency card ───
  router.get('/api/emergency-cards/:id', (req, res) => {
    const card = service.getById(req.params.id, req.userId);
    res.json(card);
  });

  // ─── Create emergency card ───
  router.post('/api/emergency-cards', validate(createEmergencyCardSchema), (req, res) => {
    const card = service.create(req.userId, req.body);
    res.status(201).json(card);
  });

  // ─── Update emergency card ───
  router.put('/api/emergency-cards/:id', validate(updateEmergencyCardSchema), (req, res) => {
    const card = service.update(req.params.id, req.userId, req.body);
    res.json(card);
  });

  // ─── Delete emergency card ───
  router.delete('/api/emergency-cards/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  // ─── Share emergency card (public, no auth) ───
  // This endpoint is mounted separately in server.js without auth
  return router;
};
