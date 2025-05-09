import { z } from "zod";

/**
 * A utility for validating Commander arguments and options.
 */
export function an<TSchema extends z.ZodTuple>(
  schema: TSchema,
  handler: (...args: [...z.output<TSchema>, ...any[]]) => Promise<void> | void
): (...actionParams: any[]) => void {
  return (...actionParams: any[]) => {
    const n = schema.items.length;
    const validatedParams = schema.parse(actionParams.slice(0, n)) as z.output<TSchema>;
    return handler(...validatedParams, ...actionParams.slice(n));
  };
}
