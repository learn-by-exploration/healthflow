const { NotFoundError } = require('../errors');

/**
 * Vitals Service — business logic for vitals tracking.
 */
class VitalService {
  constructor(vitalRepo) {
    this.repo = vitalRepo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const vital = this.repo.findById(id, userId);
    if (!vital) throw new NotFoundError('Vital', id);
    return vital;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Vital', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Vital', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = VitalService;
