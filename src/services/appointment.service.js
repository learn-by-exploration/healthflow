const { NotFoundError } = require('../errors');

/**
 * Appointments Service — business logic for appointment scheduling.
 */
class AppointmentService {
  constructor(appointmentRepo) {
    this.repo = appointmentRepo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const appt = this.repo.findById(id, userId);
    if (!appt) throw new NotFoundError('Appointment', id);
    return appt;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Appointment', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Appointment', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }

  getUpcoming(userId, days = 7) {
    return this.repo.findUpcoming(userId, days);
  }
}

module.exports = AppointmentService;
