import { z } from 'zod';

export const GetDocInputSchema = z
  .object({
    id: z
      .string({ required_error: 'Id parameter is required' })
      .trim()
      .min(1, 'Id parameter cannot be empty')
      .max(500, 'Id parameter is too long (max 500 characters)')
      .refine((value) => !value.includes('\0'), 'Id parameter must not contain NUL'),
  })
  .strict();
