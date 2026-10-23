import { z } from 'zod';

import { budget } from '../../config/budget.js';

export const SearchSymbolsInputSchema = z
  .object({
    query: z
      .string({ required_error: 'Query parameter is required' })
      .trim()
      .min(1, 'Query parameter cannot be empty')
      .max(1000, 'Query parameter is too long (max 1000 characters)'),
    package: z.enum(['sdk', 'ui', 'temporal'], { message: 'Package must be one of: sdk, ui, temporal' }).optional(),
    kind: z
      .enum(['class', 'function', 'interface', 'type', 'const', 'enum', 'property', 'method'], {
        message: 'Kind must be one of: class, function, interface, type, const, enum, property, method',
      })
      .optional(),
    limit: z
      .number({ invalid_type_error: 'Limit parameter must be an integer' })
      .int('Limit parameter must be an integer')
      .min(1, 'Limit parameter must be at least 1')
      .max(budget.searchSymbols.maxLimit, `Limit parameter must not exceed ${budget.searchSymbols.maxLimit}`)
      .optional(),
  })
  .strict();
