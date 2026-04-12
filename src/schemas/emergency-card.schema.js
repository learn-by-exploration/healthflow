const { z } = require('zod');

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

const createEmergencyCardSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  blood_type: z.enum(bloodTypes).default('unknown'),
  allergies: z.string().max(2000).default(''), // comma or newline separated
  chronic_conditions: z.string().max(2000).default(''),
  current_medications: z.string().max(2000).default(''),
  emergency_contact_name: z.string().max(200).default(''),
  emergency_contact_phone: z.string().max(30).default(''),
  emergency_contact_relation: z.string().max(100).default(''),
  secondary_contact_name: z.string().max(200).default(''),
  secondary_contact_phone: z.string().max(30).default(''),
  insurance_provider: z.string().max(200).default(''),
  insurance_policy_number: z.string().max(100).default(''),
  insurance_group_number: z.string().max(100).default(''),
  primary_doctor: z.string().max(200).default(''),
  primary_doctor_phone: z.string().max(30).default(''),
  organ_donor: z.number().int().min(0).max(1).default(0),
  notes: z.string().max(2000).default(''),
});

const updateEmergencyCardSchema = createEmergencyCardSchema.partial();

module.exports = { createEmergencyCardSchema, updateEmergencyCardSchema, bloodTypes };
