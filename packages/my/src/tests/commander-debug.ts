import { Command } from "commander";
import { z } from "zod";

/**
 * Debug utility to see what Commander actually passes to handlers
 */
console.log("Creating test command...");

// Create a command with an optional argument
const testCommand = new Command("test")
  .description("Test command for debugging")
  .argument("[optional]", "Optional argument")
  .argument("<required>", "Required argument")
  .argument("[optional2]", "Optional2 argument")
  // .option("-f, --flag", "Flag option")
  .action((...args) => {
    console.log("Command called with args:", args);

    // Log the structure of each argument
    // args.forEach((arg, index) => {
    //   console.log(`Arg ${index}:`, arg);
    //   console.log(`  Type:`, typeof arg);

    //   if (typeof arg === 'object' && arg !== null) {
    //     console.log(`  Keys:`, Object.keys(arg));

    //     if (arg instanceof Command) {
    //       console.log(`  Is Command:`, true);
    //       console.log(`  Command name:`, arg.name());
    //     }
    //   }
    // });
  });

// Test with no argument, no flag
console.log("\n------- Test: No argument, no flag -------");
testCommand.parse(["node", "test", "arg1", "arg2"]);

// // Test with an argument, no flag
// console.log("\n------- Test: With argument, no flag -------");
// testCommand.parse(["node", "test", "arg1"]);

// // Test with no argument, with flag
// console.log("\n------- Test: No argument, with flag -------");
// testCommand.parse(["node", "test", "--flag"]);

// // Test with an argument, with flag
// console.log("\n------- Test: With argument, with flag -------");
// testCommand.parse(["node", "test", "arg1", "--flag"]);
