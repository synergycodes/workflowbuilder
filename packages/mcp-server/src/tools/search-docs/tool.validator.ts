import { z } from 'zod';

import { budget } from '../../config/budget.js';

export const SearchDocsInputSchema = z
  .object({
    query: z
      .string({ required_error: 'Query parameter is required' })
      .trim()
      .min(1, 'Query parameter cannot be empty')
      .max(1000, 'Query parameter is too long (max 1000 characters)'),
    limit: z
      .number({ invalid_type_error: 'Limit parameter must be an integer' })
      .int('Limit parameter must be an integer')
      .min(1, 'Limit parameter must be at least 1')
      .max(budget.searchDocs.maxLimit, `Limit parameter must not exceed ${budget.searchDocs.maxLimit}`)
      .optional(),
  })
  .strict();
