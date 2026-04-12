const { NotFoundError } = require('../errors');

/**
 * Medications Service — business logic for medication management.
 */
class MedicationService {
  constructor(medicationRepo) {
    this.repo = medicationRepo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const med = this.repo.findById(id, userId);
    if (!med) throw new NotFoundError('Medication', id);
    return med;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medication', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medication', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }

  getRefillAlerts(userId) {
    return this.repo.findNeedingRefill(userId);
  }
}

module.exports = MedicationService;
