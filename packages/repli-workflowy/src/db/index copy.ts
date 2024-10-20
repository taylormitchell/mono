import { openDB, IDBPDatabase, StoreKey, StoreNames } from "idb";
import {
  MyDBSchema,
  Namespace,
  namespaces,
  OperationsResult,
  TransactionOperation,
  NodeRelationPosition,
  Relation,
  foreignKeyConstraints,
} from "./types";
import { useState, useEffect } from "react";
import { generateId } from "./utils";

// Transaction builder
const tx = {
  nodes: {
    update: (id: string, data: Node): TransactionOperation => ({
      type: "update",
      namespace: "nodes",
      id,
      data,
    }),
    delete: (id: string): TransactionOperation => ({ type: "delete", namespace: "nodes", id }),
  },
  relations: {
    update: (id: string, data: Relation): TransactionOperation => ({
      type: "update",
      namespace: "relations",
      id,
      data,
    }),
    delete: (id: string): TransactionOperation => ({ type: "delete", namespace: "relations", id }),
  },
  nodeRelationPositions: {
    update: (
      objectId: string,
      relationId: string,
      data: NodeRelationPosition
    ): TransactionOperation => ({
      type: "update",
      namespace: "nodeRelationPositions",
      id: `${objectId}-${relationId}`,
      data,
    }),
    delete: (objectId: string, relationId: string): TransactionOperation => ({
      type: "delete",
      namespace: "nodeRelationPositions",
      id: `${objectId}-${relationId}`,
    }),
  },
};

// Init db
export function init() {
  const clientId = generateId();
  const transactionResults: OperationsResult[] = [];

  const dbInstancePromise = openDB<MyDBSchema>("mydb", 1, {
    upgrade(db: IDBPDatabase<MyDBSchema>) {
      for (const namespace of namespaces) {
        if (!db.objectStoreNames.contains(namespace)) {
          console.debug("creating object store", namespace);
          db.createObjectStore(namespace, { keyPath: "id" });
        }
      }
    },
  });

  // Channel to broadcast changes between tabs
  const channel = new BroadcastChannel("mydb_sync_channel");
  channel.addEventListener("message", (event) => {
    if (event.data.type === "DB_UPDATE") {
      console.debug("received DB_UPDATE", event.data.payload);
      notifyQuerySubscribers(event.data.payload);
    }
  });
  async function broadcastChanges(operations: TransactionOperation[]) {
    console.debug("broadcastChanges", operations);
    channel.postMessage({ type: "DB_UPDATE", payload: operations });
  }

  // Query subscribers
  type Subscriber = (operations: TransactionOperation[]) => void;
  const querySubscribers = new Set<Subscriber>();
  function notifyQuerySubscribers(operations: TransactionOperation[]) {
    querySubscribers.forEach((subscriber) => subscriber(operations));
  }

  let isTransacting = false;
  const transactionQueue: {
    operations: TransactionOperation[];
    resolve: () => void;
    reject: () => void;
  }[] = [];

  async function dispatch(operations: TransactionOperation[]) {
    // Queue the transaction if another is in progress
    if (isTransacting) {
      return new Promise<void>((resolve, reject) => {
        transactionQueue.push({ operations, resolve, reject });
      });
    }

    // Start the transaction
    isTransacting = true;
    try {
      const result = await exec(operations);
      transactionResults.push(result);
      notifyQuerySubscribers(operations);
      broadcastChanges(operations);
    } catch (error) {
      console.error("transaction failed", error);
    } finally {
      isTransacting = false;
      // Process queued transactions
      const next = transactionQueue.shift();
      if (next) {
        dispatch(next.operations).then(next.resolve);
      }
    }
  }

  async function exec(operations: TransactionOperation[]) {
    const db = await dbInstancePromise;
    const tx = db.transaction([...new Set(operations.map((op) => op.namespace))], "readwrite");

    for (const op of operations) {
      const store = tx.objectStore(op.namespace);
      if (op.type === "update") {
        await store.put(op.data);
      } else if (op.type === "delete") {
        if (op.namespace === "nodeRelationPositions") {
          const [objectId, relationId] = op.id.split("-");
          await store.delete([objectId, relationId]);
        } else {
          await store.delete(op.id);
        }
      }
    }

    // Check contraints are satisfied
    const lastOperationByObject: Record<string, { namespace: string; id: string; type: string }> =
      {};
    for (const op of operations) {
      lastOperationByObject[op.namespace + "-" + op.id] = {
        namespace: op.namespace,
        id: op.id,
        type: op.type,
      };
    }

    for (const { namespace, id } of Object.values(lastOperationByObject)) {
      const object = await tx.objectStore(namespace).get(id);
      for (const constraint of foreignKeyConstraints) {
        if (constraint.key.namespace === namespace) {
          // This object references another object
          if (object) {
            const referencedKey = object[constraint.key.property];
            assertExists(referencedKey, contraint.references);
          } else {
            // TODO anything to do here?
          }
        } else if (constraint.references.some((ref) => ref.namespace === namespace)) {
          // This object is referenced by another object
          // TODO anything to do here?
        }
      }
    }

    await tx.done;
    return {
      clientId,
      clientOrder: transactionResults.length,
      id: generateId(),
      operations,
    };
  }

  function useQuery(namespace: Namespace) {
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const dbInstance = await dbInstancePromise;
          const tx = dbInstance.transaction(namespace, "readonly");
          const store = tx.objectStore(namespace);
          const allData = await store.getAll();
          setData(allData);
        } catch (error) {
          console.error(`Error fetching data from ${namespace}:`, error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();

      const refetchOnNamespaceChange = (operations: TransactionOperation[]) => {
        if (operations.some((op) => op.namespace === namespace)) {
          fetchData();
        }
      };

      querySubscribers.add(refetchOnNamespaceChange);
      return () => {
        querySubscribers.delete(refetchOnNamespaceChange);
      };
    }, [namespace]);

    return { data, isLoading };
  }

  return {
    tx,
    transact: dispatch,
    useQuery,import { openDB, IDBPDatabase, StoreNames, StoreKey, StoreValue } from 'idb';

// Types
type Node = { id: string; text: string };
type Relation = { id: string; sourceId: string; targetId: string };

interface MyDBSchema extends IDBPDatabase {
  nodes: { key: string; value: Node };
  relations: { key: string; value: Relation };
}

type Subscription<T> = (tx: MyDBSchema) => T;
type MutationCallback = (tx: Transaction) => void;

// Database class
class Database {
  private db: Promise<MyDBSchema>;
  private subscribers: Set<Subscription<any>> = new Set();

  constructor() {
    this.db = this.initDB();
  }

  private async initDB(): Promise<MyDBSchema> {
    return openDB<MyDBSchema>('myDatabase', 1, {
      upgrade(db) {
        db.createObjectStore('nodes', { keyPath: 'id' });
        db.createObjectStore('relations', { keyPath: 'id' });
        const relationsStore = db.createObjectStore('relations', { keyPath: 'id' });
        relationsStore.createIndex('relationIdsBySourceId', 'sourceId', { multiEntry: true });
      },
    });
  }

  async subscribe<T>(callback: Subscription<T>): Promise<T> {
    this.subscribers.add(callback);
    const result = await this.runSubscription(callback);
    return result;
  }

  private async runSubscription<T>(callback: Subscription<T>): Promise<T> {
    const db = await this.db;
    return callback(db);
  }

  async mutate(callback: MutationCallback): Promise<void> {
    const transaction = new Transaction();
    callback(transaction);
    await this.applyOperations(transaction.getOperations());
    this.notifySubscribers();
  }

  private async applyOperations(operations: Operation[]): Promise<void> {
    const db = await this.db;
    const transaction = db.transaction(
      [...new Set(operations.map((op) => op.namespace))] as StoreNames<MyDBSchema>[],
      'readwrite'
    );

    for (const op of operations) {
      const store = transaction.objectStore(op.namespace as StoreNames<MyDBSchema>);
      if (op.type === 'update') {
        await store.put(op.data);
      } else if (op.type === 'delete') {
        await store.delete(op.id as StoreKey<MyDBSchema, StoreNames<MyDBSchema>>);
      } else if (op.type === 'create') {
        await store.add(op.data);
      }
    }

    await transaction.done;
  }

  private async notifySubscribers(): Promise<void> {
    for (const subscriber of this.subscribers) {
      await this.runSubscription(subscriber);
    }
  }
}

// Transaction class
class Transaction {
  private operations: Operation[] = [];

  nodes = {
    update: (id: string, data: Node) => {
      this.operations.push({ type: 'update', namespace: 'nodes', id, data });
    },
    delete: (id: string) => {
      this.operations.push({ type: 'delete', namespace: 'nodes', id });
    },
    create: (data: Node) => {
      this.operations.push({ type: 'create', namespace: 'nodes', data });
    },
  };

  relations = {
    update: (id: string, data: Relation) => {
      this.operations.push({ type: 'update', namespace: 'relations', id, data });
    },
    delete: (id: string) => {
      this.operations.push({ type: 'delete', namespace: 'relations', id });
    },
    create: (data: Relation) => {
      this.operations.push({ type: 'create', namespace: 'relations', data });
    },
  };

  getOperations(): Operation[] {
    return this.operations;
  }
}

// Operation type
type Operation = {
  type: 'update' | 'delete' | 'create';
  namespace: string;
  id?: string;
  data?: any;
};

// Helper function to create a new database instance
function init(): Database {
  return new Database();
}

// Example usage
const db = init();

// Subscribe to changes
db.subscribe(async (tx) => {
  const node1 = await tx.get('nodes', '1');
  const ids = await tx.getFromIndex('relations', 'relationIdsBySourceId', '1');
  const relations = await Promise.all(ids.map(id => tx.get('relations', id)));
  return { node1, relations };
});

// Mutate data
db.mutate((tx) => {
  tx.nodes.update('1', { id: '1', text: 'Hello, world!' });
  tx.relations.create({ id: '1', sourceId: '1', targetId: '2' });
});
  };
}

/**
 * The following are a few example usages and implementation snippets
 * from a front-end database I'm building. It uses indexedDB under the hood.
 * It includes subscriptions which track granular changes and re-run only
 * when needed. It's heavily inspired by replicache.
 *
 * I'd like your help filling in the details.
 */

const db = init();

// The data model can be hard-coded in
type Node = { id: string; text: string };
type Relation = { id: string; sourceId: string; targetId: string };
interface MyDBSchema extends IDBPDatabase {
  nodes: { key: string; value: Node };
  relations: { key: string; value: Relation };
}

// behind the scenes, useSubscribe is keeping track of the namespace/id
// which are referenced in the callback, and will re-run the callback if any of those change
useSubscribe(db, (tx) => {
  const node1 = tx.nodes.get("1");
  const ids = tx.index.relationIdsBySourceId.get("1");
  const relations = tx.relations.getMany(ids);
  return { nodes, node1, relations };
});

// The only way to change the data is by passing a callback to the db
// mutate function. This will apply the changes to indexedDB under the
// hoold.
db.mutate((tx) => {
  tx.nodes.update("1", { id: "1", text: "Hello, world!" });
  tx.relations.create({ id: "1", sourceId: "1", targetId: "2" });
});

// The tx provided to the mutate function keeps track of the changes
// as an array of operations, which can be committed all at once.
// The execution is something like this:
async function exec(tx) {
  const db = await dbInstancePromise;
  const operations = tx.getOperations();
  // e.g. [
  //   { type: "update", namespace: "nodes", id: "1", data: { id: "1", text: "Hello, world!" } },
  //   { type: "create", namespace: "relations", data: { id: "1", sourceId: "1", targetId: "2" } }
  // ]
  const transaction = db.transaction(
    [...new Set(operations.map((op) => op.namespace))],
    "readwrite"
  );
  for (const op of operations) {
    const store = transaction.objectStore(op.namespace);
    if (op.type === "update") {
      await store.put(op.data);
    } else if (op.type === "delete") {
      await store.delete(op.id);
    }
  }
}
