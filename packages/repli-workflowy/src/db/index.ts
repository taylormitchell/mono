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
  mutationIndex: number;
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
  private db: Database;
  private subscribers: Map<Subscription, { deps: Set<Dep> }> = new Map();
  private clientId = generateId();
  private lastMutationId = 0;
  private optimisticMutations: Mutation[] = [];

  constructor(db: Database) {
    this.db = db;
  }

  subscribe(callback: Subscription) {
    this.subscribers.set(callback, { deps: new Set() });
    this.runSubscription(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private async runSubscription(callback: Subscription) {
    const dx = createProxyTransaction(this.db);
    await callback(dx);
    const deps = operationsToDependencies(dx.getOperations());
    this.subscribers.set(callback, { deps });
  }

  // TODO: need mutex to handle concurrency
  async mutate(callback: MutationCallback): Promise<Mutation> {
    // Pass proxy db to callback to collect operations
    const dx = createProxyTransaction(this.db);
    await callback(dx);

    // Populate the operations with data needed for undo
    const operations = dx.getOperations();
    const dbTrx = await this.db.transaction();
    for (const op of operations) {
      if (op.type === "update" || op.type === "delete") {
        op.prevData = await dbTrx.get(op.namespace, op.id);
      }
    }

    // Apply operations to indexeddb
    for (const op of operations) {
      if (op.type === "update") {
        await dbTrx.put(op.namespace, op.id, op.data);
      } else if (op.type === "delete") {
        await dbTrx.delete(op.namespace, op.id);
      } else if (op.type === "put") {
        await dbTrx.put(op.namespace, op.id, op.data);
      }
    }
    await dbTrx.done();

    // Track mutation
    this.lastMutationId++;
    const mutation: Mutation = {
      clientId: this.clientId,
      mutationIndex: this.lastMutationId,
      operations,
    };
    this.optimisticMutations.push(mutation);

    // Notify subscribers
    const writeOperations = operations.filter((op) => op.isWrite);
    this.notifySubscribers(operationsToDependencies(writeOperations));
    return mutation;
  }

  async query<T>(callback: QueryCallback<T>): Promise<T> {
    return callback(createProxyTransaction(this.db));
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
}

function createProxyTransaction(db: Database): Transaction & { getOperations: () => Operation[] } {
  const operations: Operation[] = [];
  let done = false;

  return {
    async get(store: Namespace, key: string): Promise<any> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "get", namespace: store, id: key, isWrite: false });
      return db.get(store, key);
    },

    async getAll(store: Namespace): Promise<any[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAll", namespace: store, isWrite: false });
      return db.getAll(store);
    },

    async getAllKeys(store: Namespace): Promise<string[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAllKeys", namespace: store, isWrite: false });
      return db.getAllKeys(store);
    },

    async put(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "put", namespace: store, id: key, data: value, isWrite: true });
    },

    async delete(store: Namespace, key: string): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "delete", namespace: store, id: key, isWrite: true });
    },

    async update(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "update", namespace: store, id: key, data: value, isWrite: true });
    },

    async done(): Promise<void> {
      done = true;
    },

    getOperations(): Operation[] {
      return operations;
    },
  };
}

// Helper function to create a new database instance
export function init(): ClientDatabase {
  const db = new IndexedDbDatabase();
  return new ClientDatabase(db);
}

export class ServerDatabase {}

export function operationsToDependencies(operations: Operation[]): Set<string> {
  const dependencies = new Set<string>();

  for (const operation of operations) {
    const { type, namespace, id } = operation;

    switch (type) {
      case "create":
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
