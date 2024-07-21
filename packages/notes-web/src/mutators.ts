import { generate } from "@rocicorp/rails";
import { Note } from "./types";

const { set: putNote, get: getNote, update: updateNote, list: listNote } = generate<Note>("note");

export const mutators = {
  putNote,
  updateNote,
};

export const selectors = {
  getNote,
  listNote,
};

type MutatorName = keyof typeof mutators;
export function isMutatorName(name: string): name is MutatorName {
  return name in mutators;
}

// export type ValidMutation = MutationV1 & ({
//   name: "putNote",
//   args: { id: string; title: string; body: string; created_at: string };
// } | {
//   name: "updateNote",
//   args: Partial<{ id: string; title?: string; body?: string; created_at?: string }>;
// });

/**
 * The MutationV1 type is:
 * type MutationV1 = {
    readonly id: number;
    readonly name: string;
    readonly args: ReadonlyJSONValue;
    readonly timestamp: number;
    readonly clientID: ClientID;
  }
  The following is a zod schema which, given a value we already know is a MutationV1,
  will parse it into one where we know the name and args fields are valid.
 */
// const KnownMutationV1 = z.object({
