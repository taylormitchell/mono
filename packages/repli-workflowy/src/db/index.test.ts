import { ClientDatabase } from "./index";
import { Database, Namespace, Transaction } from "./types";
import { expect, describe, it } from "bun:test";

class MapDatabase implements Database {
  private stores: Map<Namespace, Map<string, any>> = new Map();

  constructor() {
    this.stores.set("nodes", new Map());
    this.stores.set("relations", new Map());
    this.stores.set("trees", new Map());
  }

  async transaction(): Promise<Transaction> {
    return {
      get: async (store: Namespace, key: string) => {
        const storeMap = this.stores.get(store);
        return storeMap ? storeMap.get(key) || null : null;
      },
      getAll: async (store: Namespace) => {
        const storeMap = this.stores.get(store);
        return storeMap ? Array.from(storeMap.values()) : [];
      },
      getAllKeys: async (store: Namespace) => {
        const storeMap = this.stores.get(store);
        return storeMap ? Array.from(storeMap.keys()) : [];
      },
      put: async (store: Namespace, key: string, value: any) => {
        const storeMap = this.stores.get(store);
        if (storeMap) {
          storeMap.set(key, value);
        }
      },
      delete: async (store: Namespace, key: string) => {
        const storeMap = this.stores.get(store);
        if (storeMap) {
          storeMap.delete(key);
        }
      },
      done: async () => {
        // No-op for in-memory implementation
      },
    };
  }

  async get(store: Namespace, key: string) {
    const storeMap = this.stores.get(store);
    return storeMap ? storeMap.get(key) || null : null;
  }

  async getAll(store: Namespace) {
    const storeMap = this.stores.get(store);
    return storeMap ? Array.from(storeMap.values()) : [];
  }

  async getAllKeys(store: Namespace) {
    const storeMap = this.stores.get(store);
    return storeMap ? Array.from(storeMap.keys()) : [];
  }

  async put(store: Namespace, key: string, value: any) {
    const storeMap = this.stores.get(store);
    if (storeMap) {
      storeMap.set(key, value);
    }
  }

  async delete(store: Namespace, key: string) {
    const storeMap = this.stores.get(store);
    if (storeMap) {
      storeMap.delete(key);
    }
  }
}

describe("client db", () => {
  it("basic", async () => {
    const clientDb = new ClientDatabase(new MapDatabase());
    await clientDb.mutate((dx) => {
      dx.nodes.create({ id: "1", text: "test" });
    });
    const note = await clientDb.query((dx) => dx.nodes.get("1"));
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
