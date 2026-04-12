const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { createAppointmentSchema, updateAppointmentSchema, queryAppointmentSchema } = require('../schemas/appointment.schema');
const AppointmentRepo = require('../repos/appointment.repo');
const AppointmentService = require('../services/appointment.service');

module.exports = function appointmentsRoutes({ db }) {
  const router = Router();
  const service = new AppointmentService(new AppointmentRepo(db));

  // ─── List appointments ───
  router.get('/api/appointments', validate(queryAppointmentSchema, 'query'), (req, res) => {
    const result = service.list(req.userId, req.query);
    res.json(result);
  });

  // ─── Upcoming appointments ───
  router.get('/api/appointments/upcoming', (req, res) => {
    const days = parseInt(req.query.days, 10) || 7;
    const upcoming = service.getUpcoming(req.userId, days);
    res.json({ data: upcoming });
  });

  // ─── Get single appointment ───
  router.get('/api/appointments/:id', (req, res) => {
    const appt = service.getById(req.params.id, req.userId);
    res.json(appt);
  });

  // ─── Create appointment ───
  router.post('/api/appointments', validate(createAppointmentSchema), (req, res) => {
    const appt = service.create(req.userId, req.body);
    res.status(201).json(appt);
  });

  // ─── Update appointment ───
  router.put('/api/appointments/:id', validate(updateAppointmentSchema), (req, res) => {
    const appt = service.update(req.params.id, req.userId, req.body);
    res.json(appt);
  });

  // ─── Delete appointment ───
  router.delete('/api/appointments/:id', (req, res) => {
    const result = service.delete(req.params.id, req.userId);
    res.json(result);
  });

  return router;
};
