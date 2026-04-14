const { z } = require('zod');

const severities = ['mild', 'moderate', 'severe', 'in_remission'];
const statuses = ['active', 'managed', 'resolved', 'monitoring'];

const createConditionSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Name is required').max(200),
  severity: z.enum(severities).default('moderate'),
  diagnosed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  diagnosing_doctor: z.string().max(200).default(''),
  status: z.enum(statuses).default('active'),
  notes: z.string().max(2000).default(''),
});

const updateConditionSchema = createConditionSchema.partial();

const queryConditionSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  severity: z.enum(severities).optional(),
  status: z.enum(statuses).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['created_at', 'name', 'diagnosed_date']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createConditionSchema, updateConditionSchema, queryConditionSchema };
