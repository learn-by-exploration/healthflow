const { z } = require('zod');

const frequencyTypes = ['daily', 'twice_daily', 'thrice_daily', 'weekly', 'monthly', 'as_needed', 'custom'];

const createMedicationSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Medication name is required').max(200),
  dosage: z.string().max(100).default(''),
  frequency: z.enum(frequencyTypes).default('daily'),
  schedule_times: z.string().max(500).default(''), // comma-separated HH:MM times
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  prescribing_doctor: z.string().max(200).default(''),
  pharmacy: z.string().max(200).default(''),
  refill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  refill_quantity: z.number().int().min(0).optional().nullable(),
  remaining_quantity: z.number().int().min(0).optional().nullable(),
  is_active: z.number().int().min(0).max(1).default(1),
  notes: z.string().max(1000).default(''),
});

const updateMedicationSchema = createMedicationSchema.partial();

const queryMedicationSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  is_active: z.string().regex(/^[01]$/).transform(Number).optional(),
  q: z.string().max(200).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

module.exports = { createMedicationSchema, updateMedicationSchema, queryMedicationSchema, frequencyTypes };
