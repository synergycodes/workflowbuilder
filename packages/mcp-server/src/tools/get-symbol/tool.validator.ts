import { z } from 'zod';

export const GetSymbolInputSchema = z
  .object({
    name: z
      .string({ required_error: 'Name parameter is required' })
      .trim()
      .min(1, 'Name parameter cannot be empty')
      .max(200, 'Name parameter is too long (max 200 characters)'),
  })
  .strict();
