import { ClientDatabase } from "../index";
import { expect, describe, it } from "bun:test";
import { MapDatabase } from "./map-db";

describe("client db", () => {
  it("basic", async () => {
    const clientDb = new ClientDatabase(new MapDatabase());
    await clientDb.mutate((dx) => {
      dx.put("nodes", "1", { id: "1", text: "test" });
    });
    const note = await clientDb.query((dx) => dx.get("nodes", "1"));
    expect(note).toMatchObject({ id: "1", text: "test" });
  });
});

// describe("sync", () => {
//   const serverDb = new ServerDatabase();
//   const clientDb = new ClientDatabase({
//     pushHandler: async (mutations: Mutation[]) => {
//       await serverDb.applyClientMutations(mutations);
//     },
//     pullHandler: async ({ clientId, lastCVRId }: { clientId: string; lastCVRId: string }) => {
//       return serverDb.generatePatch(lastCVRId, clientId);
//     },
//   });

//   it("basic", async () => {
//     const mutation = await clientDb.mutate((dx) => {
//       dx.put("notes", "1", { name: "test" });
//     });
//     const note = await clientDb.query((dx) => dx.get("notes", "1"));
//     expect(note).toEqual({ id: "1", name: "test" });

//     // push to server
//     await clientDb.push();
//     const serverNote = await serverDb.get("notes", "1");
//     expect(serverNote).toEqual({ id: "1", name: "test" });

//     // pull from server
//     await clientDb.pull();
//     console.log(clientDb.pendingMutations);
//   });
// });
