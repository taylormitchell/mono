import { z } from "zod";
import { Command } from "commander";
import assert from "assert";

/**
 * Enhanced version of the `fn` utility for Commander actions
 * Supports both argument validation and options validation with proper typing
 * The argsSchema parameter is optional - if omitted, assumes no arguments
 */
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

// Types for easier schema creation
export const emptyArgs = z.tuple([]);
export const noArgs = emptyArgs;

/**
 * Tests for the an function
 */
function runTests() {
  console.log("Running tests for an function...");

  // Create a mock Command object
  const mockCommand = { name: () => "test-command" } as Command;

  // Test 1: Command with required argument
  console.log("\nTest 1: Command with required argument");
  (() => {
    let handled = false;

    const handler = an(
      z.tuple([z.string()]),
      z.object({ flag: z.boolean().default(false) }),
      ([name], opts, command) => {
        assert.strictEqual(name, "test-name");
        assert.strictEqual(opts.flag, true);
        assert.strictEqual(command.name(), "test-command");
        handled = true;
      }
    );

    // Run the handler with valid arguments
    handler("test-name", { flag: true }, mockCommand);
    assert.strictEqual(handled, true, "Handler should have been called");

    try {
      // This should throw because the required argument is missing
      handler({ flag: true }, mockCommand);
      assert.fail("Should have thrown for missing required argument");
    } catch (error) {
      // Expected
      assert.ok(error instanceof z.ZodError);
    }

    console.log("✓ Test 1 passed");
  })();

  // Test 2: Command with optional argument
  console.log("\nTest 2: Command with optional argument");
  (() => {
    let result: { name: string; verbose: boolean } | null = null;

    const handler = an(
      z.union([z.tuple([]), z.tuple([z.string()])]),
      z.object({ verbose: z.boolean().default(false) }),
      (args, opts, command) => {
        const [name = "default"] = args;
        result = { name, verbose: opts.verbose };
      }
    );

    // Run with argument
    handler("custom-name", { verbose: true }, mockCommand);
    assert.deepStrictEqual(result, { name: "custom-name", verbose: true });

    // Run without argument (should use default)
    handler({ verbose: false }, mockCommand);
    assert.deepStrictEqual(result, { name: "default", verbose: false });

    console.log("✓ Test 2 passed");
  })();

  // Test 3: Command with no arguments (using the simplified syntax)
  console.log("\nTest 3: Command with no arguments (simplified syntax)");
  (() => {
    let called = false;

    const handler = an(z.object({ port: z.number().default(3000) }), (opts, command) => {
      assert.strictEqual(opts.port, 8080);
      assert.strictEqual(command.name(), "test-command");
      called = true;
    });

    handler({ port: 8080 }, mockCommand);
    assert.strictEqual(called, true, "Handler should have been called");

    console.log("✓ Test 3 passed");
  })();

  // Test 4: Variadic arguments
  console.log("\nTest 4: Variadic arguments");
  (() => {
    let result: { count: number; recursive: boolean } | null = null;

    const handler = an(
      z.tuple([z.array(z.string())]),
      z.object({ recursive: z.boolean().default(false) }),
      ([paths], opts, command) => {
        result = { count: paths.length, recursive: opts.recursive };
      }
    );

    // Run with multiple arguments
    handler(["file1.txt", "file2.txt", "file3.txt"], { recursive: true }, mockCommand);

    assert.deepStrictEqual(result, { count: 3, recursive: true });

    console.log("✓ Test 4 passed");
  })();

  // Test 5: Union of argument patterns
  console.log("\nTest 5: Union of argument patterns");
  (() => {
    let lastResult = null;

    const handler = an(
      z.union([z.tuple([]), z.tuple([z.string()]), z.tuple([z.string(), z.string()])]),
      z.object({ quiet: z.boolean().default(false) }),
      (args, opts) => {
        const argsArray = args as any[];
        lastResult = {
          argCount: argsArray.length,
          args: argsArray,
          quiet: opts.quiet,
        };
      }
    );

    // Case 1: No arguments
    handler({ quiet: true }, mockCommand);
    assert.deepStrictEqual(lastResult, { argCount: 0, args: [], quiet: true });

    // Case 2: One argument
    handler("arg1", { quiet: false }, mockCommand);
    assert.deepStrictEqual(lastResult, { argCount: 1, args: ["arg1"], quiet: false });

    // Case 3: Two arguments
    handler("arg1", "arg2", { quiet: true }, mockCommand);
    assert.deepStrictEqual(lastResult, { argCount: 2, args: ["arg1", "arg2"], quiet: true });

    console.log("✓ Test 5 passed");
  })();

  // Test 6: Type coercion in options
  console.log("\nTest 6: Type coercion in options");
  (() => {
    let result: any = null;

    const handler = an(
      z.object({
        port: z.coerce.number().default(3000),
        debug: z.coerce.boolean().default(false),
      }),
      (opts, command) => {
        result = {
          portType: typeof opts.port,
          port: opts.port,
          debugType: typeof opts.debug,
          debug: opts.debug,
        };
      }
    );

    // String values should be coerced to appropriate types
    handler({ port: "8080", debug: "true" }, mockCommand);

    assert.deepStrictEqual(result, {
      portType: "number",
      port: 8080,
      debugType: "boolean",
      debug: true,
    });

    console.log("✓ Test 6 passed");
  })();

  // Test 7: Advanced validation
  console.log("\nTest 7: Advanced validation with custom refinement");
  (() => {
    let result: string | null = null;

    const portSchema = z
      .number()
      .int()
      .min(1)
      .max(65535)
      .refine((port) => port !== 3306, { message: "Port 3306 is reserved for MySQL" });

    const handler = an(
      z.tuple([z.string()]),
      z.object({ port: portSchema.default(8080) }),
      ([host], opts, command) => {
        result = `${host}:${opts.port}`;
      }
    );

    // Valid
    handler("localhost", { port: 5000 }, mockCommand);
    assert.strictEqual(result, "localhost:5000");

    try {
      // Port out of range
      handler("example.com", { port: 70000 }, mockCommand);
      assert.fail("Should have thrown for invalid port");
    } catch (error) {
      assert.ok(error instanceof z.ZodError);
    }

    try {
      // Reserved port
      handler("example.com", { port: 3306 }, mockCommand);
      assert.fail("Should have thrown for reserved port");
    } catch (error) {
      assert.ok(error instanceof z.ZodError);
    }

    console.log("✓ Test 7 passed");
  })();

  console.log("\nAll tests passed!");
}

function runCommandTests() {
  console.log("Running tests for program...");
  const command = new Command()
    .argument("[filename]", "Name of the note file (optional)")
    .option("-m, --message <message>", "Initial content of the note")
    .action(
      an(
        z.object({
          filename: z.string().optional(),
          message: z.string().optional(),
        }),
        (args, opts) => {}
      )
    );
  try {
    command.parse(["test", "--message", "Hello, world!"]);
  } catch (error) {
    console.error(error);
  }
}

// Run the tests
// runTests();
runCommandTests();
