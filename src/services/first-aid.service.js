const { NotFoundError } = require('../errors');

/**
 * First Aid Items Service — business logic for first aid kit tracking.
 */
class FirstAidService {
  constructor(repo) {
    this.repo = repo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const item = this.repo.findById(id, userId);
    if (!item) throw new NotFoundError('First aid item', id);
    return item;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  getExpiring(userId, days) {
    return this.repo.findExpiring(userId, days);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('First aid item', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('First aid item', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = FirstAidService;
