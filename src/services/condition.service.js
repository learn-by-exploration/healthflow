const { NotFoundError } = require('../errors');

/**
 * Health Conditions Service — business logic for health conditions tracking.
 */
class ConditionService {
  constructor(repo) {
    this.repo = repo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const condition = this.repo.findById(id, userId);
    if (!condition) throw new NotFoundError('Health condition', id);
    return condition;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Health condition', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Health condition', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = ConditionService;
