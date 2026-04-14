const { z } = require('zod');

const documentTypes = [
  'prescription', 'lab_report', 'insurance_card', 'vaccination_record',
  'discharge_summary', 'imaging', 'receipt', 'other'
];

const createDocumentSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  appointment_id: z.string().uuid().optional().nullable(),
  type: z.enum(documentTypes),
  title: z.string().min(1, 'Title is required').max(300),
  file_name: z.string().min(1, 'File name is required').max(500),
  file_path: z.string().min(1, 'File path is required').max(1000),
  file_size: z.number().int().min(0),
  mime_type: z.string().min(1, 'MIME type is required').max(100),
  notes: z.string().max(2000).default(''),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  doctor_name: z.string().max(200).default(''),
  hospital: z.string().max(300).default(''),
});

const updateDocumentSchema = createDocumentSchema.partial();

const queryDocumentSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  type: z.enum(documentTypes).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['created_at', 'document_date', 'title']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createDocumentSchema, updateDocumentSchema, queryDocumentSchema };
