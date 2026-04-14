const { z } = require('zod');

const categories = ['drug', 'food', 'environmental', 'insect', 'latex', 'other'];
const severities = ['mild', 'moderate', 'severe', 'life_threatening'];

const createAllergySchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  allergen: z.string().min(1, 'Allergen is required').max(200),
  category: z.enum(categories).default('other'),
  severity: z.enum(severities).default('moderate'),
  reaction: z.string().max(500).default(''),
  diagnosed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(2000).default(''),
});

const updateAllergySchema = createAllergySchema.partial();

const queryAllergySchema = z.object({
  family_member_id: z.string().uuid().optional(),
  category: z.enum(categories).optional(),
  severity: z.enum(severities).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['created_at', 'allergen']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createAllergySchema, updateAllergySchema, queryAllergySchema };
