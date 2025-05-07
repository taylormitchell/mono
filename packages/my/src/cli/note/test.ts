import { z } from "zod";
import { Command } from "commander";

/**
 * Enhanced version of the `fn` utility for Commander actions
 * Supports both argument validation and options validation with proper typing
 */
export function an<
  TArgs extends z.ZodTypeAny, // Use ZodTypeAny instead of ZodTuple for more flexibility
  TOpts extends z.ZodObject<any>
>(
  argsSchema: TArgs,
  optsSchema: TOpts,
  handler: (args: z.output<TArgs>, opts: z.output<TOpts>, command: Command) => Promise<void> | void
) {
  return (...actionParams: any[]) => {
    try {
      // The last two parameters are always options and command
      const command = actionParams.pop() as Command;
      const options = actionParams.pop() as Record<string, any>;
      const args = actionParams; // All remaining parameters are arguments

      // Validate arguments and options
      const validatedArgs = argsSchema.parse(args);
      const validatedOpts = optsSchema.parse(options);

      // Call the handler with validated data
      return handler(validatedArgs, validatedOpts, command);
    } catch (error) {
      console.error("Error on input:", actionParams);
      if (error instanceof z.ZodError) {
        console.error("Validation error:");
        console.error(error.errors);
      } else {
        console.error("Error:", error);
      }
      throw error;
    }
  };
}

// Utility function to create variadic argument schemas
export function variadic<T extends z.ZodTypeAny>(schema: T) {
  return z.array(schema);
}

// Types for easier schema creation
export const emptyArgs = z.tuple([]);
export const noArgs = emptyArgs;

// Example usage
function example() {
  // Example 1: Command with required and optional arguments
  const cloneAction = an(
    // Arguments schema: clone <source> [destination]
    z.tuple([
      z.string(), // required source
      z.string().optional(), // optional destination
    ]),
    // Options schema
    z.object({
      recursive: z.boolean().default(false),
      verbose: z.boolean().default(false),
    }),
    // Handler with typed arguments and options
    ([source, destination = "."], opts) => {
      console.log(`Cloning ${source} to ${destination}`);
      console.log(`Options: recursive=${opts.recursive}, verbose=${opts.verbose}`);
    }
  );

  // Example 2: Command with variadic arguments
  const removeAction = an(
    // Arguments schema: rm <dirs...>
    z.tuple([
      variadic(z.string()), // variadic string arguments
    ]),
    // Options schema
    z.object({
      force: z.boolean().default(false),
    }),
    // Handler with typed arguments and options
    (args, opts) => {
      const [dirs] = args as [string[]];
      console.log(`Removing directories: ${dirs.join(", ")}`);
      console.log(`Force: ${opts.force}`);
    }
  );

  // Example 3: Command with no arguments
  const startAction = an(
    noArgs, // no args
    z.object({
      port: z.coerce.number().default(3000),
      host: z.string().default("localhost"),
    }),
    (args, opts) => {
      console.log(`Starting server on ${opts.host}:${opts.port}`);
    }
  );

  // Example 4: Using z.union for alternative argument patterns
  const buildAction = an(
    z.union([
      // build (default target)
      noArgs,
      // build <target>
      z.tuple([z.string()]),
      // build <target> <output>
      z.tuple([z.string(), z.string()]),
    ]),
    z.object({
      mode: z.enum(["development", "production"]).default("development"),
      watch: z.boolean().default(false),
    }),
    (args, opts) => {
      // Need to handle the union type differently
      const argsArray = args as any[];
      const target = argsArray[0] || "default";
      const output = argsArray[1] || "dist";
      console.log(`Building ${target} to ${output} in ${opts.mode} mode`);
      if (opts.watch) console.log("Watching for changes...");
    }
  );
}

// This is how the utility would integrate with a real Commander command:
function setupRealCommand() {
  const program = new Command();

  program
    .command("clone")
    .description("Clone a repository")
    .argument("<source>", "source repository")
    .argument("[destination]", "destination directory")
    .option("-r, --recursive", "clone recursively")
    .option("-v, --verbose", "show detailed output")
    .action(
      an(
        z.tuple([z.string(), z.string().optional()]),
        z.object({
          recursive: z.boolean().default(false),
          verbose: z.boolean().default(false),
        }),
        (args, opts) => {
          const [source, destination = "."] = args as [string, string | undefined];
          console.log(`Cloning ${source} to ${destination}`);
          if (opts.recursive) console.log("Using recursive mode");
          if (opts.verbose) console.log("Using verbose output");
          // Actual implementation...
        }
      )
    );

  // Similar to your sync command implementation
  program
    .command("sync")
    .description("Sync repository")
    .option("-v, --verbose", "show detailed output")
    .action(
      an(
        noArgs, // no arguments
        z.object({
          verbose: z.boolean().default(false),
        }),
        async (_, opts) => {
          try {
            console.log("Syncing repository...");
            if (opts.verbose) {
              console.log("Using verbose mode");
            }
            // Implementation...
            console.log("Sync completed successfully");
          } catch (error) {
            console.error(
              `Error during sync: ${error instanceof Error ? error.message : String(error)}`
            );
            process.exit(1);
          }
        }
      )
    );
}

// Run examples
example();
