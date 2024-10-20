import { generateId } from "./utils";
import { Operation, Database, Namespace, Transaction } from "./types";
import { IndexedDbDatabase } from "./indexeddb";

type Subscription = (tx: Transaction) => void | Promise<void>;
type MutationCallback = (tx: Transaction) => void | Promise<void>;
type QueryCallback<T> = (tx: Transaction) => T | Promise<T>;

const createDep = {
  object: (namespace: string, id: string, part: "key" | "value") => {
    return `${namespace}/${id}/${part}`;
  },
  namespace: (namespace: string, part: "keys" | "values") => {
    return `${namespace}/${part}`;
  },
};

type Dep = string;

export type Mutation = {
  clientId: string;
  mutationId: number;
  operations: Operation[];
};

/**
 * Notes for sync
 *
 *
 * The db proxy is a proxy to the database which the user interacts with to define
 * subscriptions and mutations. It keeps track of the operations it performs and
 * the dependencies it creates.
 *
 * Later, the operations tracked through these are applied to the database. If that's
 * successful, we generate a mutation which represents the changes to the database.
 *
 *
 *
 * When we successfully apply a mutation, we assign it a monotonic integer and
 * add it to a queue.
 *
 * On sync, we push all mutations in the queue to the remote db.
 *
 * The sync server keeps track of the last mutation id received from the client.
 * When handling the client push, it applies the mutations in order and then
 * sends back a patch from the client's prev sync state to the servers current
 * state.
 *
 * The client receives the patch, rolls itself back to the previous state, and
 * then applies the patch. If there are any local mutations that the server hasn't
 * seen, those get applied on top of the patch.
 *
 *
 *
 */

// Database class
export class ClientDatabase {
  private subscribers: Map<Subscription, { deps: Set<Dep> }> = new Map();
  private clientId = generateId();
  private lastSyncVersion = 0;
  private lastMutationId = 0;
  private localMutations: Mutation[] = [];

  constructor(
    private db: Database,
    private syncHandlers?: {
      push: (mutations: Mutation[]) => Promise<void>;
      pull: (params: { clientId: string; dbVersionAtLastSync: number }) => Promise<{
        clientId: string;
        patch: ServerPatch[];
        lastMutationId: number;
        dbVersion: number;
      }>;
    }
  ) {}

  async push() {
    await this.syncHandlers?.push(this.localMutations);
  }

  async pull() {
    if (!this.syncHandlers) return;
    const { patch, lastMutationId, dbVersion } = await this.syncHandlers.pull({
      clientId: this.clientId,
      dbVersionAtLastSync: this.lastSyncVersion,
    });

    // roll back all local mutations
    const reversedPatch = reverseOperations(this.localMutations.map((m) => m.operations).flat());
    await this.applyOperations(reversedPatch);

    // apply patch from server
    await this.applyOperations(patch);

    // re-apply all local mutations that the server hasn't seen yet
    const lastSeenMutationIndex = this.localMutations.findIndex(
      (m) => m.mutationId === lastMutationId
    );
    const unseenMutations = this.localMutations.slice(lastSeenMutationIndex);
    await this.applyOperations(unseenMutations.map((m) => m.operations).flat());

    // reset optimistic mutations
    this.localMutations = unseenMutations;
    this.lastSyncVersion = dbVersion;
  }

  subscribe(callback: Subscription) {
    this.subscribers.set(callback, { deps: new Set() });
    this.runSubscription(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private async applyOperations(operations: Operation[]) {
    const trx = await this.db.transaction();
    for (const operation of operations) {
      if (operation.isWrite) {
        if (operation.type === "update") {
          await trx.update(operation.namespace, operation.id, operation.data);
        } else if (operation.type === "put") {
          await trx.put(operation.namespace, operation.id, operation.data);
        } else if (operation.type === "delete") {
          await trx.delete(operation.namespace, operation.id);
        } else {
          operation satisfies never;
        }
      }
    }
    await trx.done();
  }

  private async runSubscription(callback: Subscription) {
    const dx = await createTrackingTransaction(this.db);
    await callback(dx);
    const operations = await dx.doneWithOperations();
    const deps = operationsToDependencies(operations);
    this.subscribers.set(callback, { deps });
  }

  // TODO: need mutex to handle concurrency
  async mutate(callback: MutationCallback): Promise<Mutation> {
    // Create a transaction and collect operations
    const dx = await createTrackingTransaction(this.db);
    await callback(dx);
    const operations = await dx.doneWithOperations();

    // Track mutation
    this.lastMutationId++;
    const mutation: Mutation = {
      clientId: this.clientId,
      mutationId: this.lastMutationId,
      operations,
    };
    this.localMutations.push(mutation);

    // Notify subscribers
    const writeOperations = operations.filter((op) => op.isWrite);
    this.notifySubscribers(operationsToDependencies(writeOperations));
    return mutation;
  }

  async query<T>(callback: QueryCallback<T>): Promise<T> {
    return callback(await createTrackingTransaction(this.db));
  }

  private async notifySubscribers(affectedDeps: Set<Dep>): Promise<void> {
    for (const [callback, { deps: subscriberDeps }] of this.subscribers.entries()) {
      for (const dep of affectedDeps.values()) {
        if (subscriberDeps.has(dep)) {
          this.runSubscription(callback);
          break;
        }
      }
    }
  }

  async dump() {
    const trx = await this.db.transaction();
    const dump: Record<string, any> = {
      version: this.lastSyncVersion,
      lastMutationIndex: this.lastMutationId,
    };
    for (const namespace of ["nodes", "relations", "trees"] as const) {
      const allData = await trx.getAll(namespace);
      dump[namespace] = allData;
    }
    await trx.done();
    return dump;
  }
}

async function createTrackingTransaction(
  db: Database
): Promise<Transaction & { doneWithOperations: () => Promise<Operation[]> }> {
  const operations: Operation[] = [];
  let done = false;
  const trx = await db.transaction();

  return {
    async get(store: Namespace, key: string): Promise<any> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "get", namespace: store, id: key, isWrite: false });
      return trx.get(store, key);
    },

    async getAll(store: Namespace): Promise<any[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAll", namespace: store, isWrite: false });
      return trx.getAll(store);
    },

    async getAllKeys(store: Namespace): Promise<string[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAllKeys", namespace: store, isWrite: false });
      return trx.getAllKeys(store);
    },

    async put(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "put", namespace: store, id: key, data: value, isWrite: true });
      return trx.put(store, key, value);
    },

    async delete(store: Namespace, key: string): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      const prevData = await trx.get(store, key);
      operations.push({ type: "delete", namespace: store, id: key, prevData, isWrite: true });
      return trx.delete(store, key);
    },

    async update(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      const prevData = await trx.get(store, key);
      operations.push({
        type: "update",
        namespace: store,
        id: key,
        prevData,
        data: value,
        isWrite: true,
      });
      return trx.update(store, key, value);
    },

    async done(): Promise<void> {
      done = true;
      return trx.done();
    },

    async doneWithOperations(): Promise<Operation[]> {
      done = true;
      await trx.done();
      return operations;
    },
  };
}

// Helper function to create a new database instance
export function init(): ClientDatabase {
  const db = new IndexedDbDatabase();
  return new ClientDatabase(db);
}

type ServerPatch =
  | {
      type: "upsert";
      namespace: Namespace;
      id: string;
      data: any;
    }
  | {
      type: "delete";
      namespace: Namespace;
      id: string;
    };

export class ServerDatabase {
  private db: Database;
  private version: number = 0;
  private lastMutationByClient: Record<string, number> = {};
  private createdAtVersion: Record<string, number> = {};
  private updatedAtVersion: Record<string, number> = {};
  private deletedAtVersion: Record<string, number> = {};

  constructor(db: Database) {
    this.db = db;
  }

  async applyClientMutations(mutations: Mutation[]) {
    for (const mutation of mutations) {
      if (mutation.mutationId <= this.lastMutationByClient[mutation.clientId]) {
        continue;
      }
      const newVersion = this.version + 1;
      const createdIds = new Set<string>();
      const updatedIds = new Set<string>();
      const deletedIds = new Set<string>();
      const trx = await this.db.transaction();
      for (const op of mutation.operations) {
        if (op.type === "update") {
          await trx.update(op.namespace, op.id, op.data);
          updatedIds.add(op.id);
        } else if (op.type === "delete") {
          await trx.delete(op.namespace, op.id);
          deletedIds.add(op.id);
          updatedIds.add(op.id);
        } else if (op.type === "put") {
          await trx.put(op.namespace, op.id, op.data);
          createdIds.add(op.id);
          updatedIds.add(op.id);
        } else {
          continue;
        }
      }
      await trx.done();
      for (const id of createdIds) {
        this.createdAtVersion[id] = newVersion;
      }
      for (const id of updatedIds) {
        this.updatedAtVersion[id] = newVersion;
      }
      for (const id of deletedIds) {
        this.deletedAtVersion[id] = newVersion;
      }
      this.version = newVersion;
      this.lastMutationByClient[mutation.clientId] = mutation.mutationId;
    }
  }

  async generatePatch(version: number, clientId: string) {
    const patch: ServerPatch[] = [];

    if (version < this.version) {
      const trx = await this.db.transaction();
      for (const namespace of ["nodes", "relations", "trees"] as const) {
        const allKeys = await trx.getAllKeys(namespace);

        for (const id of allKeys) {
          const createdAt = this.createdAtVersion[id] || 0;
          const updatedAt = this.updatedAtVersion[id] || 0;
          const deletedAt = this.deletedAtVersion[id] || Infinity;

          if (createdAt > version && createdAt <= this.version) {
            const data = await trx.get(namespace, id);
            patch.push({ type: "upsert", namespace, id, data });
          } else if (updatedAt > version && updatedAt <= this.version && deletedAt > this.version) {
            const data = await trx.get(namespace, id);
            patch.push({ type: "upsert", namespace, id, data });
          } else if (deletedAt > version && deletedAt <= this.version) {
            patch.push({ type: "delete", namespace, id });
          }
        }
      }
      await trx.done();
    }

    return {
      clientId,
      patch,
      lastMutationIndex: this.lastMutationByClient[clientId] || 0,
      dbVersion: this.version,
    };
  }

  async dump() {
    const dump: Record<string, any> = {
      version: this.version,
    };
    const trx = await this.db.transaction();

    for (const namespace of ["nodes", "relations", "trees"] as const) {
      const allData = await trx.getAll(namespace);
      dump[namespace] = allData;
    }

    await trx.done();

    return dump;
  }
}

export function operationsToDependencies(operations: Operation[]): Set<string> {
  const dependencies = new Set<string>();

  for (const operation of operations) {
    const { type, namespace, id } = operation;

    switch (type) {
      case "put":
      case "update":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.namespace(namespace, "values"));
        dependencies.add(createDep.namespace(namespace, "keys"));
        break;
      case "delete":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.object(namespace, id, "key"));
        dependencies.add(createDep.namespace(namespace, "values"));
        dependencies.add(createDep.namespace(namespace, "keys"));
        break;
      case "get":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.object(namespace, id, "key"));
        break;
    }
  }

  return dependencies;
}

export function reverseOperations(operations: Operation[]): Operation[] {
  const reversed: Operation[] = [];
  for (const operation of operations.toReversed()) {
    if (!operation.isWrite) {
      // ignore reads
      continue;
    }
    if (operation.type === "put") {
      reversed.push({
        ...operation,
        type: "delete",
        prevData: operation.data,
      });
    } else if (operation.type === "delete") {
      reversed.push({
        ...operation,
        type: "put",
        data: operation.prevData,
      });
    } else if (operation.type === "update") {
      reversed.push({
        ...operation,
        type: "update",
        data: operation.prevData,
        prevData: operation.data,
      });
    } else {
      operation satisfies never;
    }
  }
  return reversed;
}
