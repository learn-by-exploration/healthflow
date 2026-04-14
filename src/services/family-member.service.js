const { NotFoundError } = require('../errors');

/**
 * Family Members Service — business logic for family member profiles.
 */
class FamilyMemberService {
  constructor(familyMemberRepo) {
    this.repo = familyMemberRepo;
  }

  create(userId, data) {
    return this.repo.create(userId, data);
  }

  getById(id, userId) {
    const member = this.repo.findById(id, userId);
    if (!member) throw new NotFoundError('Family member', id);
    return member;
  }

  list(userId) {
    return this.repo.findAll(userId);
  }

  update(id, userId, data) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Family member', id);
    return this.repo.update(id, userId, data);
  }

  delete(id, userId) {
    const existing = this.repo.findById(id, userId);
    if (!existing) throw new NotFoundError('Family member', id);
    this.repo.delete(id, userId);
    return { ok: true };
  }

  getSummary(id, userId) {
    const summary = this.repo.getSummary(id, userId);
    if (!summary) throw new NotFoundError('Family member', id);
    return summary;
  }
}

module.exports = FamilyMemberService;
