const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createFamilyMemberSchema, updateFamilyMemberSchema } = require('../schemas/family-member.schema');
const FamilyMemberRepo = require('../repos/family-member.repo');
const FamilyMemberService = require('../services/family-member.service');

module.exports = function familyMembersRoutes({ db }) {
  const router = Router();
  const service = new FamilyMemberService(new FamilyMemberRepo(db));

  // ─── List family members ───
  router.get('/api/family-members', (req, res) => {
    const members = service.list(req.userId);
    res.json({ data: members });
  });

  // ─── Get single family member ───
  router.get('/api/family-members/:id', (req, res) => {
    const member = service.getById(req.params.id, req.userId);
    res.json(member);
  });

  // ─── Create family member ───
  router.post('/api/family-members', validate(createFamilyMemberSchema), (req, res) => {
    const member = service.create(req.userId, req.body);
    res.status(201).json(member);
  });

  // ─── Update family member ───
  router.put('/api/family-members/:id', validate(updateFamilyMemberSchema), (req, res) => {
    const member = service.update(req.params.id, req.userId, req.body);
    res.json(member);
  });

  // ─── Delete family member ───
  router.delete('/api/family-members/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
