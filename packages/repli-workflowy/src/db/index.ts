import { z } from "zod";
import { generateId } from "./utils";
import { Operation, Database, NodeSchema, RelationSchema, TreeSchema, ModelSchema } from "./types";
import { IndexedDbDatabase } from "./indexeddb";

type Subscription = (tx: DbProxy) => void | Promise<void>;
type MutationCallback = (tx: DbProxy) => void | Promise<void>;
type QueryCallback<T> = (tx: DbProxy) => T | Promise<T>;

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
    const db = await this.db;
    const dx = new DbProxy(db);
    await callback(dx);
    this.subscribers.set(callback, { deps: dx.getReads() });
  }

  // TODO: need mutex to handle concurrency
  async mutate(callback: MutationCallback): Promise<Mutation> {
    // Pass proxy db to callback to collect operations
    const db = this.db;
    const dx = new DbProxy(db);

    await callback(dx);

    // Populate the operations with data needed for undo
    const operations = dx.getOperations();
    const dbTrx = await db.transaction();
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
      } else if (op.type === "create") {
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
    this.notifySubscribers(dx.getWrites());
    return mutation;
  }

  async query<T>(callback: QueryCallback<T>): Promise<T> {
    const dx = new DbProxy(this.db, { mode: "readonly" });
    return callback(dx);
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

// TODO should implement the same Database interface and just have extra getOperations
export class DbProxy {
  private db: Database;
  private operations: Operation[] = [];
  private reads: Set<Dep> = new Set();
  private writes: Set<Dep> = new Set();
  nodes: ReturnType<typeof this.createCRUDOperations<typeof NodeSchema>>;
  relations: ReturnType<typeof this.createCRUDOperations<typeof RelationSchema>>;
  trees: ReturnType<typeof this.createCRUDOperations<typeof TreeSchema>>;
  mode: "readonly" | "readwrite";

  constructor(db: Database, options: { mode: "readonly" | "readwrite" } = { mode: "readwrite" }) {
    this.db = db;
    this.nodes = this.createCRUDOperations(NodeSchema);
    this.relations = this.createCRUDOperations(RelationSchema);
    this.trees = this.createCRUDOperations(TreeSchema);
    this.mode = options.mode;
  }

  private createCRUDOperations<S extends ModelSchema>(schema: S) {
    type DataType = z.infer<S>;
    type GetterOptions = { dep: boolean };
    const namespace = schema.shape.namespace.value;
    return {
      update: (data: Omit<DataType, "namespace">) => {
        if (this.mode === "readonly") {
          throw new Error("Cannot write in readonly mode");
        }
        this.writes.add(createDep.object(namespace, data.id, "value"));
        this.writes.add(createDep.namespace(namespace, "values"));
        this.operations.push({ type: "update", namespace, id: data.id, data });
      },
      delete: (id: string) => {
        if (this.mode === "readonly") {
          throw new Error("Cannot write in readonly mode");
        }
        this.writes.add(createDep.object(namespace, id, "key"));
        this.writes.add(createDep.namespace(namespace, "keys"));
        this.operations.push({ type: "delete", namespace, id });
      },
      create: (data: Omit<DataType, "namespace">) => {
        if (this.mode === "readonly") {
          throw new Error("Cannot write in readonly mode");
        }
        this.writes.add(createDep.object(namespace, data.id, "key"));
        this.writes.add(createDep.object(namespace, data.id, "value"));
        this.writes.add(createDep.namespace(namespace, "values"));
        this.writes.add(createDep.namespace(namespace, "keys"));
        this.operations.push({ type: "create", namespace, id: data.id, data });
      },
      get: async (id: string, options: GetterOptions = { dep: true }): Promise<DataType> => {
        if (options.dep) {
          this.reads.add(createDep.object(namespace, id, "value"));
          this.reads.add(createDep.object(namespace, id, "key"));
        }
        return this.db.get(namespace, id);
      },
      getAll: async (options: GetterOptions = { dep: true }): Promise<DataType[]> => {
        if (options.dep) {
          this.reads.add(createDep.namespace(namespace, "values"));
          this.reads.add(createDep.namespace(namespace, "keys"));
        }
        return this.db.getAll(namespace);
      },
      getAllKeys: async (options: GetterOptions = { dep: true }): Promise<string[]> => {
        if (options.dep) {
          this.reads.add(createDep.namespace(namespace, "keys"));
        }
        const keys = await this.db.getAllKeys(namespace);
        return keys.map((key) => key.toString());
      },
    };
  }

  getOperations() {
    return this.operations;
  }

  getReads() {
    return new Set(this.reads);
  }

  getWrites() {
    return new Set(this.writes);
  }
}

// Helper function to create a new database instance
export function init(): ClientDatabase {
  const db = new IndexedDbDatabase();
  return new ClientDatabase(db);
}

export class ServerDatabase {}
