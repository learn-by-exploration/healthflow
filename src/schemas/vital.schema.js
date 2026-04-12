const { z } = require('zod');

const vitalTypes = ['blood_pressure', 'blood_sugar', 'weight', 'temperature', 'spo2', 'heart_rate', 'bmi'];

const createVitalSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  type: z.enum(vitalTypes),
  value: z.number({ required_error: 'Value is required' }),
  value_secondary: z.number().optional().nullable(), // e.g. diastolic for blood pressure
  unit: z.string().max(20).default(''),
  measured_at: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(1000).default(''),
});

const updateVitalSchema = createVitalSchema.partial();

const queryVitalSchema = z.object({
  type: z.enum(vitalTypes).optional(),
  family_member_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['measured_at', 'type', 'created_at']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createVitalSchema, updateVitalSchema, queryVitalSchema, vitalTypes };
