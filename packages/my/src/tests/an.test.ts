import { Command } from "commander";
import { an } from "../lib/an";
import { describe, it, expect, jest } from "bun:test";
import { z } from "zod";

describe("an", () => {
  it("should work", () => {
    const handler = jest.fn();
    const command = new Command()
      .argument("[filename]", "Name of the note file (optional)")
      .option("-m, --message <message>", "Initial content of the note")
      .action(
        an(
          z.union([z.tuple([]), z.tuple([z.string()])]),
          z.object({
            message: z.string().optional(),
          }),
          handler
        )
      );
    command.parse(["test", "--message", "Hello, world!"]);
    expect(handler).toHaveBeenCalledWith(
      ["test"],
      {
        message: "Hello, world!",
      },
      expect.any(Command)
    );
    // command.parse(["--message", "Hello, world!"]);
    // expect(handler).toHaveBeenCalledWith([
    //   {
    //     message: "Hello, world!",
    //   },
    // ]);
  });
});
