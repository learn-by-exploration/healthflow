const { z } = require('zod');

const categories = ['general', 'wound_care', 'medication', 'tool', 'ppe', 'other'];

const createFirstAidSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.enum(categories).default('general'),
  quantity: z.number().int().min(0).default(1),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_available: z.number().int().min(0).max(1).default(1),
  notes: z.string().max(2000).default(''),
});

const updateFirstAidSchema = createFirstAidSchema.partial();

const queryFirstAidSchema = z.object({
  category: z.enum(categories).optional(),
  is_available: z.string().regex(/^[01]$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['created_at', 'name', 'expiry_date']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createFirstAidSchema, updateFirstAidSchema, queryFirstAidSchema };
