const { z } = require('zod');

const expenseCategories = [
  'consultation', 'medication', 'lab_test', 'procedure', 'hospitalization',
  'dental', 'optical', 'therapy', 'insurance_premium', 'other'
];
const paymentMethods = ['', 'cash', 'card', 'upi', 'insurance', 'other'];

const createMedicalExpenseSchema = z.object({
  family_member_id: z.string().uuid().optional().nullable(),
  appointment_id: z.string().uuid().optional().nullable(),
  category: z.enum(expenseCategories).default('consultation'),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().int().min(0, 'Amount must be non-negative'),
  currency: z.string().max(10).default('INR'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expense_date must be YYYY-MM-DD'),
  payment_method: z.enum(paymentMethods).default(''),
  insurance_claimed: z.number().int().min(0).max(1).default(0),
  receipt_document_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).default(''),
});

const updateMedicalExpenseSchema = createMedicalExpenseSchema.partial();

const queryMedicalExpenseSchema = z.object({
  family_member_id: z.string().uuid().optional(),
  category: z.enum(expenseCategories).optional(),
  payment_method: z.enum(paymentMethods).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['created_at', 'expense_date', 'amount']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createMedicalExpenseSchema, updateMedicalExpenseSchema, queryMedicalExpenseSchema };
