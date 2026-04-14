const { NotFoundError } = require('../errors');

/**
 * Medical Expenses Service — business logic for medical expense tracking.
 */
class MedicalExpenseService {
  constructor(repo) {
    this.repo = repo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const expense = this.repo.findById(id, userId);
    if (!expense) throw new NotFoundError('Medical expense', id);
    return expense;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  summary(userId, filters) {
    return this.repo.summary(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medical expense', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medical expense', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = MedicalExpenseService;
