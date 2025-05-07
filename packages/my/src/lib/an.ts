import { z } from "zod";
import { Command } from "commander";

export function an<TOpts extends z.ZodObject<any>>(
  optsSchema: TOpts,
  handler: (opts: z.output<TOpts>, command: Command) => Promise<void> | void
): (...actionParams: any[]) => void;

export function an<TArgs extends z.ZodTypeAny, TOpts extends z.ZodObject<any>>(
  argsSchema: TArgs,
  optsSchema: TOpts,
  handler: (args: z.output<TArgs>, opts: z.output<TOpts>, command: Command) => Promise<void> | void
): (...actionParams: any[]) => void;

export function an(...params: any[]) {
  // Determine which function signature was used
  if (params.length === 2) {
    // Only options schema and handler provided
    const [optsSchema, handler] = params;

    // Use empty args schema
    return (...actionParams: any[]) => {
      // The last two parameters are always options and command
      const command = actionParams.pop() as Command;
      const options = actionParams.pop() as Record<string, any>;

      // Validate options
      const validatedOpts = optsSchema.parse(options);

      // Call the handler with validated data
      return handler(validatedOpts, command);
    };
  } else {
    // Both args schema and options schema provided
    const [argsSchema, optsSchema, handler] = params;

    return (...actionParams: any[]) => {
      // The last two parameters are always options and command
      const command = actionParams.pop() as Command;
      const options = actionParams.pop() as Record<string, any>;
      const args = actionParams; // All remaining parameters are arguments

      // Validate arguments and options
      const validatedArgs = argsSchema.parse(args);
      const validatedOpts = optsSchema.parse(options);

      // Call the handler with validated data
      return handler(validatedArgs, validatedOpts, command);
    };
  }
}
