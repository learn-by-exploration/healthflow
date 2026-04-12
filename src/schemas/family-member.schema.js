const { z } = require('zod');

const relationTypes = ['self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other'];
const genderTypes = ['male', 'female', 'other', 'prefer_not_to_say'];

const createFamilyMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  relation: z.enum(relationTypes).default('self'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  gender: z.enum(genderTypes).optional().nullable(),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional().nullable(),
  notes: z.string().max(1000).default(''),
});

const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

module.exports = { createFamilyMemberSchema, updateFamilyMemberSchema, relationTypes, genderTypes };
