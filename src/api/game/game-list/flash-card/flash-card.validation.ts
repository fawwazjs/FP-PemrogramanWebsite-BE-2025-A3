import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

const flashCardItemSchema = z.object({
  question_type: z.enum(['text', 'image']),
  question_text: z.string().max(2000).trim().nullable().optional(),
  question_image_array_index: z.coerce.number().min(0).optional(),
  back_type: z.enum(['text', 'image']),
  answer_text: z.string().max(2000).trim(),
  back_image_array_index: z.coerce.number().min(0).optional(),
  is_correct: z.boolean(),
});

export const createFlashCardSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail: fileSchema({}).optional(),
  is_publish_immediately: StringToBooleanSchema.default(false),
  settings: StringToObjectSchema(z.record(z.unknown())).optional(),
  files_to_upload: fileArraySchema({
    max_size: 2 * 1024 * 1024,
    min_amount: 0,
    max_amount: 50,
  }).optional(),
  cards: StringToObjectSchema(z.array(flashCardItemSchema).min(1).max(200)),
});

export type ICreateFlashCardProps = z.infer<typeof createFlashCardSchema>;

export const updateFlashCardSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional().nullable(),
  thumbnail: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  settings: StringToObjectSchema(z.record(z.unknown())).optional().nullable(),
  files_to_upload: fileArraySchema({
    max_size: 2 * 1024 * 1024,
    min_amount: 0,
    max_amount: 50,
  }).optional(),
  cards: StringToObjectSchema(
    z.array(flashCardItemSchema).min(1).max(200),
  ).optional(),
});

export type IUpdateFlashCardProps = z.infer<typeof updateFlashCardSchema>;
