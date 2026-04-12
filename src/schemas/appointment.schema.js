const { z } = require('zod');

const appointmentTypes = ['checkup', 'follow_up', 'specialist', 'lab_test', 'vaccination', 'dental', 'eye', 'emergency', 'other'];

const createAppointmentSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  doctor_name: z.string().min(1, 'Doctor name is required').max(200),
  hospital: z.string().max(300).default(''),
  type: z.enum(appointmentTypes).default('checkup'),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  appointment_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM').optional().nullable(),
  duration_minutes: z.number().int().min(1).max(480).optional().nullable(),
  location: z.string().max(500).default(''),
  notes: z.string().max(2000).default(''),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  post_visit_notes: z.string().max(5000).default(''),
});

const updateAppointmentSchema = createAppointmentSchema.partial();

const queryAppointmentSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  type: z.enum(appointmentTypes).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  upcoming: z.string().regex(/^(true|false|1|0)$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['appointment_date', 'created_at', 'doctor_name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, queryAppointmentSchema, appointmentTypes };
