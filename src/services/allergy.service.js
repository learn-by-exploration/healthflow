const { NotFoundError } = require('../errors');

/**
 * Allergies Service — business logic for allergy tracking.
 */
class AllergyService {
  constructor(repo) {
    this.repo = repo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const allergy = this.repo.findById(id, userId);
    if (!allergy) throw new NotFoundError('Allergy', id);
    return allergy;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Allergy', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Allergy', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = AllergyService;
