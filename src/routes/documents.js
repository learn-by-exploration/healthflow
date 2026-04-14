const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createDocumentSchema, updateDocumentSchema, queryDocumentSchema } = require('../schemas/document.schema');
const DocumentRepo = require('../repos/document.repo');
const DocumentService = require('../services/document.service');

module.exports = function documentsRoutes({ db }) {
  const router = Router();
  const service = new DocumentService(new DocumentRepo(db));

  // ─── List documents ───
  router.get('/api/documents', validate(queryDocumentSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Get single document ───
  router.get('/api/documents/:id', (req, res) => {
    const doc = service.getById(req.params.id, req.userId);
    res.json(doc);
  });

  // ─── Create document metadata ───
  router.post('/api/documents', validate(createDocumentSchema), (req, res) => {
    const doc = service.create(req.userId, req.body);
    res.status(201).json(doc);
  });

  // ─── Update document metadata ───
  router.put('/api/documents/:id', validate(updateDocumentSchema), (req, res) => {
    const doc = service.update(req.params.id, req.userId, req.body);
    res.json(doc);
  });

  // ─── Delete document ───
  router.delete('/api/documents/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
