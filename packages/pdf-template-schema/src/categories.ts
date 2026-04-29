import { z } from 'zod';

export const TemplateCategorySchema = z.enum([
  'donation_receipt',
  'tax_receipt',
  'annual_giving_statement',
  'donor_letter',
  'missionary_report',
  'financial_report',
  'invoice',
  'certificate',
  'custom',
]);

export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;
