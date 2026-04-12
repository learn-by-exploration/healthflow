const { NotFoundError } = require('../errors');

/**
 * Emergency Cards Service — business logic for emergency health cards.
 */
class EmergencyCardService {
  constructor(emergencyCardRepo) {
    this.repo = emergencyCardRepo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const card = this.repo.findById(id, userId);
    if (!card) throw new NotFoundError('Emergency card', id);
    return card;
  }

  list(userId) {
    return this.repo.findAll(userId);
  }

  getByFamilyMember(userId, familyMemberId) {
    return this.repo.findByFamilyMember(userId, familyMemberId);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Emergency card', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Emergency card', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }

  /**
   * Get a shareable emergency card — no user auth check.
   */
  getShareable(id) {
    const card = this.repo.findByIdPublic(id);
    if (!card) throw new NotFoundError('Emergency card', id);
    return card;
  }
}

module.exports = EmergencyCardService;
