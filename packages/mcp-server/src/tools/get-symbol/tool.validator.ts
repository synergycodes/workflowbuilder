import { z } from 'zod';

// Agents send `id`, since search_symbols returns ids and get_doc takes `id`; read it as `name`.
function idAsName(input: unknown) {
  if (typeof input !== 'object' || input === null || 'name' in input || !('id' in input)) return input;
  const { id, ...rest } = input as { id: unknown };
  return { ...rest, name: id };
}

export const GetSymbolInputSchema = z.preprocess(
  idAsName,
  z
    .object({
      name: z
        .string({ required_error: 'Name parameter is required' })
        .trim()
        .min(1, 'Name parameter cannot be empty')
        .max(200, 'Name parameter is too long (max 200 characters)'),
    })
    .strict(),
);
