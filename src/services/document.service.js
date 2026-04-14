const { NotFoundError } = require('../errors');

/**
 * Medical Documents Service — business logic for medical document metadata tracking.
 */
class DocumentService {
  constructor(repo) {
    this.repo = repo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const doc = this.repo.findById(id, userId);
    if (!doc) throw new NotFoundError('Medical document', id);
    return doc;
  }

  list(userId, filters) {
    return this.repo.findAll(userId, filters);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medical document', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Medical document', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }
}

module.exports = DocumentService;
