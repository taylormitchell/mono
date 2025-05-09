import { Command } from "commander";
import { an } from "../lib/an";
import { describe, it, expect, jest } from "bun:test";
import { z } from "zod";

describe("an", () => {
  // Test case for options only (no args)
  describe("with options only", () => {
    it("should validate options and call handler with parsed options", () => {
      const handler = jest.fn();
      const command = new Command()
        .option("-n, --name <name>", "User name")
        .option("-a, --age <age>", "User age")
        .action(
          an(
            z.tuple([
              z.object({
                name: z.string(),
                age: z.string().transform(Number),
              }),
            ]),
            handler
          )
        );

      command.parse(["node", "test", "--name", "John", "--age", "30"]);

      expect(handler).toHaveBeenCalledWith(
        {
          name: "John",
          age: 30,
        },
        expect.any(Command)
      );
    });

    it("should handle optional options correctly", () => {
      const handler = jest.fn();
      const command = new Command()
        .option("-n, --name <name>", "User name")
        .option("-a, --age <age>", "User age (optional)")
        .action(
          an(
            z.tuple([
              z.object({
                name: z.string(),
                age: z.string().transform(Number).optional(),
              }),
            ]),
            handler
          )
        );

      command.parse(["node", "test", "--name", "John"]);

      expect(handler).toHaveBeenCalledWith(
        {
          name: "John",
        },
        expect.any(Command)
      );
    });
  });

  // Test case for required arguments
  describe("with required arguments", () => {
    it("should validate required argument and call handler", () => {
      const handler = jest.fn();
      const command = new Command()
        .argument("<filename>", "Name of the file")
        .action(an(z.tuple([z.string()]), handler));

      command.parse(["node", "test", "config.json"]);

      expect(handler).toHaveBeenCalledWith("config.json", {}, expect.any(Command));
    });
  });

  // Test case for arguments and options
  describe("with arguments and options", () => {
    it("should validate both arguments and options and call handler", () => {
      const handler = jest.fn();
      const command = new Command()
        .argument("<filename>", "Name of the file")
        .option("-m, --mode <mode>", "File mode")
        .action(
          an(
            z.tuple([
              z.string(),
              z.object({
                mode: z.string().optional(),
              }),
            ]),
            handler
          )
        );

      command.parse(["node", "test", "config.json", "--mode", "read"]);

      expect(handler).toHaveBeenCalledWith(
        "config.json",
        {
          mode: "read",
        },
        expect.any(Command)
      );
    });

    it("should handle multiple arguments correctly", () => {
      const handler = jest.fn();
      const command = new Command()
        .argument("<source>", "Source file")
        .argument("<destination>", "Destination file")
        .option("-f, --force", "Force overwrite")
        .action(
          an(
            z.tuple([
              z.string(),
              z.string(),
              z.object({
                force: z.boolean().optional(),
              }),
            ]),
            handler
          )
        );

      command.parse(["node", "test", "file1.txt", "file2.txt", "--force"]);

      expect(handler).toHaveBeenCalledWith(
        "file1.txt",
        "file2.txt",
        {
          force: true,
        },
        expect.any(Command)
      );
    });

    it("should handle optional arguments correctly", () => {
      const handler = jest.fn();
      const command = new Command()
        .argument("<required>", "Required argument")
        .argument("[optional]", "Optional argument")
        .action(an(z.tuple([z.string(), z.string().optional(), z.object({})]), handler));

      // Test with just the required argument
      command.parse(["node", "test", "required-value"]);

      expect(handler).toHaveBeenCalledWith("required-value", undefined, {}, expect.any(Command));

      // Reset the mock
      handler.mockClear();

      // Test with both required and optional arguments
      command.parse(["node", "test", "required-value", "optional-value"]);

      expect(handler).toHaveBeenCalledWith(
        "required-value",
        "optional-value",
        {},
        expect.any(Command)
      );
    });
  });

  // Test validation errors
  describe("validation errors", () => {
    it("should throw error when options validation fails", () => {
      const handler = jest.fn();
      const command = new Command().option("-p, --port <port>", "Port number").action(
        an(
          z.tuple([
            z.object({
              port: z.string().regex(/^\d+$/).transform(Number),
            }),
          ]),
          handler
        )
      );

      expect(() => {
        command.parse(["node", "test", "--port", "abc"]);
      }).toThrow();

      expect(handler).not.toHaveBeenCalled();
    });

    it("should throw error when arguments validation fails", () => {
      const handler = jest.fn();
      const command = new Command()
        .argument("<email>", "Email address")
        .action(an(z.tuple([z.string().email()]), handler));

      expect(() => {
        command.parse(["node", "test", "not-an-email"]);
      }).toThrow();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
