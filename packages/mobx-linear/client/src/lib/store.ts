import { action, observable, reaction, runInAction } from "mobx";

// @ClientModel("Users")
// export class User extends Model {
//     Property()
//     public id: string = uuid()

//     @Property()
//     public name: string = "";

//     @ManyToOne<Team>("members")
//     public team: Team;

//     @OneToMany()
//     public readonly issues = new Collection<Issue>();
// }

// It's a reference to a team, and in that team there's a property called members. When the team is assigned, the decorator goes to the team and assigns the user to the team's members collection.

// Event types
export type StoreEvent =
  | {
      type: "create";
      model: string;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      type: "update";
      model: string;
      id: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: "delete";
      model: string;
      id: string;
      oldProps: Record<string, unknown>;
    };

// Create, update, or delete a single model
export type Patch = {
  type: "set";
  model: string;
  id: string;
  props: Record<string, unknown> | null;
};

function reverseEvent(event: StoreEvent): StoreEvent {
  switch (event.type) {
    case "create":
      return { type: "delete", model: event.model, id: event.id, oldProps: event.props ?? {} };
    case "update":
      return {
        type: "update",
        model: event.model,
        id: event.id,
        field: event.field,
        oldValue: event.newValue,
        newValue: event.oldValue,
      };
    case "delete":
      return { type: "create", model: event.model, id: event.id, props: event.oldProps };
  }
}

export abstract class BaseModel {
  readonly id: string;
  placeholder = false;
  _store?: Store<any>;

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    this.id = props.id ?? ulid();
    this.placeholder = props.placeholder ?? false;
  }

  protected emitIfStored(event: StoreEvent) {
    this._store?.emit(event);
  }

  protected applyIfStored(event: StoreEvent) {
    this._store?.applyEvent(event);
  }

  inStore() {
    return !!this._store;
  }

  // TODO: Can only belong to one store?
  _setStore(store: Store<any>) {
    this._store = store;
  }
}

export function Property(opts: { serializedKey?: string } = {}) {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const fieldName = String(context.name);
    const serializedKey = opts.serializedKey ?? fieldName;

    const observableResult = observable(target, context);
    if (!observableResult) throw new Error("Failed to create observable property");

    return {
      get(this: BaseModel) {
        return observableResult.get?.call(this);
      },
      set(this: BaseModel, newValue: unknown) {
        const oldValue = observableResult.get?.call(this);
        runInAction(() => {
          observableResult.set?.call(this, newValue);
          this.emitIfStored({
            type: "update",
            model: modelName,
            id: this.id,
            field: fieldName,
            oldValue,
            newValue,
          });
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

const modelInstanceToCollectionSets = new WeakMap<BaseModel, Map<string, Set<BaseModel>>>();

export function Link<T extends BaseModel>(collectionName?: keyof T) {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const propertyName = String(context.name);

    const observableResult = observable(target, context);
    if (!observableResult) throw new Error("Failed to create observable link");

    return {
      get(this: BaseModel) {
        return observableResult.get?.call(this);
      },
      set(this: BaseModel, newParent: BaseModel | null) {
        const oldParent = observableResult.get?.call(this);
        if (oldParent === newParent) return;
        runInAction(() => {
          // Set property value
          observableResult.set?.call(this, newParent);

          // Update collections
          if (collectionName && oldParent) {
            modelInstanceToCollectionSets.get(oldParent)?.get(String(collectionName))?.delete(this);
          }
          if (collectionName && newParent) {
            modelInstanceToCollectionSets.get(newParent)?.get(String(collectionName))?.add(this);
          }

          this.emitIfStored({
            type: "update",
            model: this.constructor.name,
            id: this.id,
            field: `${propertyName}Id`,
            oldValue: oldParent?.id ?? null,
            newValue: newParent?.id ?? null,
          });
        });
      },
      init(this: BaseModel, initialValue: BaseModel | null) {
        return runInAction(() => {
          if (collectionName && initialValue) {
            modelInstanceToCollectionSets.get(initialValue)?.get(String(collectionName))?.add(this);
          }
          return observableResult.init?.call(this, initialValue);
        });
      },
    };
  };
}

export function Backlinks() {
  return (_: any, context: ClassFieldDecoratorContext) => {
    const propertyName = String(context.name);
    return function (this: BaseModel, initialValue: unknown) {
      if (!(initialValue instanceof Collection)) {
        throw new Error("OneToMany must be initialized with a Collection");
      }
      const set = observable.set(Array.from(initialValue));
      const collectionSets = modelInstanceToCollectionSets.get(this) || new Map();
      collectionSets.set(propertyName, set);
      modelInstanceToCollectionSets.set(this, collectionSets);
      return new Collection(set);
    };
  };
}

/**
 * Like a set but it's read-only
 */
export class Collection<T extends BaseModel> implements Omit<Set<T>, "add" | "delete" | "clear"> {
  constructor(private set: Set<T> = new Set()) {}

  has(model: T) {
    return this.set.has(model);
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any) {
    this.set.forEach(callbackfn, thisArg);
  }

  entries() {
    return this.set.entries();
  }

  keys() {
    return this.set.keys();
  }

  values() {
    return this.set.values();
  }

  get size() {
    return this.set.size;
  }

  *[Symbol.iterator]() {
    yield* this.set;
  }

  [Symbol.toStringTag] = "Collection";
}

type BaseModelConstructor = new (...args: any[]) => BaseModel;

type ModelRecord = Record<string, BaseModelConstructor>;

export type OptimisticMutation = {
  mutationId: number;
  events: StoreEvent[];
};

type Pusher = (clientId: string, mutations: OptimisticMutation[]) => Promise<void>;
type Puller = (clientId: string) => Promise<{
  patches: Patch[];
  lastMutationId: number;
}>;
interface Pocker {
  subscribe: (listener: (poke: { clientId: string }) => void) => () => void;
}

function createPusher(url: string) {
  return async (clientId: string, mutations: OptimisticMutation[]) => {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId, mutations }),
    });
  };
}

function createPuller(url: string) {
  return async (clientId: string) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId }),
    });
    return response.json();
  };
}

function createPoker(url: string) {
  return {
    subscribe: (listener: (poke: { clientId: string }) => void) => {
      const ws = new WebSocket(url);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        listener({ clientId: data.clientId });
      };
      return () => ws.close();
    },
  };
}

// Store implementation
export class Store<TModels extends ModelRecord> {
  readonly clientId = ulid();

  // Models

  private models = {} as Record<keyof TModels, Map<string, InstanceType<TModels[keyof TModels]>>>;
  /**
   * We keep deleted models around cause if the delete happens from a rollback and
   * then a re-create, we want to reuse the same instance. This gets cleared out
   * at the end of a commit.
   */
  private deletedModels = {} as Record<
    keyof TModels,
    Map<string, InstanceType<TModels[keyof TModels]>>
  >;
  private modelNameToConstructor = {} as Record<string, BaseModelConstructor>;
  private constructorToModelName = (constructor: BaseModelConstructor) =>
    Object.entries(this.modelNameToConstructor).find((e) => e[1] === constructor)?.[0];

  // private modelNameToCollectionKey = {} as Record<string, keyof TModels>;
  // private collectionKeyToModelName = {} as Record<keyof TModels, string>;

  // Events

  private emittingEnabled = true;
  private undoStack: StoreEvent[][] = [];
  private redoStack: StoreEvent[][] = [];
  private stagedChanges: StoreEvent[] = [];
  private eventsEmittedCount = observable.box(0);
  private disposers: Array<() => void> = [];
  private eventSubscribers = new Set<(event: StoreEvent) => void>();

  // Sync

  private syncEnabled = true;
  private localMutationId = 0;
  private localMutations: OptimisticMutation[] = [];
  private puller?: Puller;
  private pusher?: Pusher;
  private poker?: Pocker;

  constructor(
    modelClassConstructors: TModels,
    {
      puller,
      pusher,
      poker,
      syncEnabled = true,
    }: // TODO: The 'event' doesn't work exactly how I'd want right now. Like if you create
    // a model which refs a non-existent model, that becomes two mutations. I'd want that
    // to be one. So it's like every create/delete/update by the user should result in a
    // mutation, but any internal calls to those things should be separate.
    {
      puller?: Puller | string;
      pusher?: Pusher | string;
      poker?: Pocker | string;
      syncEnabled?: boolean;
    } = {}
  ) {
    this.puller = typeof puller === "string" ? createPuller(puller) : puller;
    this.pusher = typeof pusher === "string" ? createPusher(pusher) : pusher;
    this.poker = typeof poker === "string" ? createPoker(poker) : poker;

    // Initialize model storage
    for (const modelCollectionKey in modelClassConstructors) {
      const ModelClass = modelClassConstructors[modelCollectionKey];
      this.modelNameToConstructor[modelCollectionKey] = ModelClass;
      this.models[modelCollectionKey] = observable.map();
      this.deletedModels[modelCollectionKey] = observable.map();
    }

    // Set up auto-commit
    this.disposers.push(
      reaction(
        () => this.eventsEmittedCount.get(),
        () => {
          this.commit();
          if (this.syncEnabled) {
            this.push();
          }
        }
      )
    );

    // Start syncing
    if (syncEnabled) {
      this.enableSync();
    } else {
      this.disableSync();
    }

    // Subscribe to poker
    if (this.poker) {
      this.poker.subscribe((poke) => {
        if (poke.clientId !== this.clientId) {
          console.log("POKE", poke);
          this.pull();
        }
      });
    }
  }

  commit() {
    if (this.stagedChanges.length > 0) {
      const changes = [...this.stagedChanges];
      this.undoStack.push(changes);
      this.stagedChanges = [];
      this.localMutations.push({ mutationId: this.localMutationId++, events: changes });
    }
    Object.values(this.deletedModels).forEach((map) => map.clear());
  }

  enableSync() {
    this.syncEnabled = true;
    this.periodicPull();
  }

  disableSync() {
    this.syncEnabled = false;
  }

  async periodicPull() {
    if (!this.syncEnabled) return;
    await this.pull();
    setTimeout(() => this.periodicPull(), 10_000);
  }

  // TODO probably want a mutex for this stuff? actualy not sure. I don't think
  // any async tasks read/write from localMutations across the task boundary.
  async push() {
    if (this.pusher) {
      await this.pusher(this.clientId, [...this.localMutations]);
    }
  }

  async pull() {
    if (this.puller) {
      const { patches, lastMutationId } = await this.puller(this.clientId);
      this.rebase(patches, lastMutationId);
    }
  }

  @action
  emit(event: StoreEvent) {
    if (!this.emittingEnabled) return;
    this.redoStack = [];
    this.stagedChanges.push(event);
    this.eventsEmittedCount.set(this.eventsEmittedCount.get() + 1);
    this.notifySubscribers([event]);
  }

  notifySubscribers(events: StoreEvent[]) {
    this.eventSubscribers.forEach((subscriber) => events.forEach(subscriber));
  }

  @action
  private rebase(serverPatches: Patch[], lastMutationId: number) {
    // Remove any local mutations that have already been applied by the server
    this.localMutations = this.localMutations.filter((m) => m.mutationId > lastMutationId);

    if (serverPatches.length === 0) return;

    try {
      this.emittingEnabled = false;

      // Rollback to last synced state by applying local mutations in reverse
      const invertedLocalEvents = this.localMutations
        .flatMap((m) => m.events)
        .reverse()
        .map(reverseEvent);
      for (const event of invertedLocalEvents) {
        this.applyEvent(event);
      }

      // Apply new server events
      const events = serverPatches.flatMap((patch) => this.patchToEvent(patch));
      for (const event of events) {
        this.applyEvent(event);
      }

      // Apply any remaining local mutations
      const remainingEvents = this.localMutations.flatMap((m) => m.events);
      for (const event of remainingEvents) {
        this.applyEvent(event);
      }
    } finally {
      this.emittingEnabled = true;
    }
  }

  // Model operations with type safety
  @action
  create<K extends keyof TModels>(
    modelName: K, // TODO: Just make this the model name?
    props: Record<string, unknown> = {}
  ): InstanceType<TModels[K]> {
    const ModelClass = this.modelNameToConstructor[modelName];
    if (!ModelClass) {
      throw new Error(`Unknown model: ${String(modelName)}`);
    }

    // Create or update the model
    let instance: InstanceType<TModels[K]> | undefined =
      typeof props.id === "string"
        ? this.models[modelName].get(props.id) ??
          // In case where we rollback a created model and then re-create it
          // we want to use the same instance from before rolling back.
          this.deletedModels[modelName].get(props.id)
        : undefined;
    if (instance) {
      Object.assign(instance, props);
      if (props.placeholder === undefined) {
        instance.placeholder = false;
      }
    } else {
      instance = new ModelClass(props);
      instance._setStore(this);
      this.models[modelName].set(instance.id, instance);
    }

    // Emit create event
    this.emit({
      type: "create",
      model: instance.constructor.name,
      id: instance.id,
      props: props,
    });

    return instance as InstanceType<TModels[K]>;
  }

  private getOrCreatePlaceholder<T extends BaseModel>(collectionKey: string, id: string): T {
    const existing = this.models[collectionKey].get(id) as T;
    if (existing) return existing;
    return this.create(collectionKey, { id, placeholder: true }) as T;
  }

  /**
   * Soft delete a model.
   *
   * In the current set up, this is important to do. It prevents the following
   * from happening (which happens in the "should replay local mutations after
   * pull" test):
   * - a client creates a model
   * - a client pulls and does rebase
   * - rebase includes rolling back which removes the model instance from map
   * - the server includes a set operation for that same mode. Because we don't
   *   have the model in the map, we create a new instance.
   * - But now if someon has a reference to the old instance, they're going to
   *   see stale values.
   *
   * If we soft delete the model, then we still have the instance in the map,
   * and we can apply the server set operation to it.
   *
   * Feels a little bit fragile to me but works for now.
   *
   * TODO: Maybe want to do something more robust in the future. Or at least
   * document the trade offs.
   * TODO: Maybe just do soft deletes? Like where the model has a deletedAt
   * field?
   */
  @action
  delete(model: BaseModel) {
    const modelName = this.constructorToModelName(model.constructor);
    if (!modelName) {
      throw new Error(`Unknown model: ${model.constructor.name}`);
    }
    this.models[modelName].delete(model.id);
    this.deletedModels[modelName].set(model.id, model as InstanceType<TModels[keyof TModels]>);
    this.emit({
      type: "delete",
      model: modelName,
      id: model.id,
      oldProps: serializeModel(model),
    });
  }

  get<K extends keyof TModels>(collectionKey: K, id: string) {
    const model = this.models[collectionKey].get(id);
    return model as InstanceType<TModels[K]> | undefined;
  }

  getAll<K extends keyof TModels>(collectionKey: K) {
    return Array.from(this.models[collectionKey].values()) as InstanceType<TModels[K]>[];
  }

  /**
   * Undo the last set of changes.
   *
   * Note: Applying events can often result in new events being emitted, which
   * clears the redo stack. In the case of undo/redo, we want to preserve the
   * redo stack, so we make a copy and reset it afterwards.
   */
  @action
  undo() {
    const changes = this.undoStack.pop();
    if (changes) {
      const newRedoStack = [...this.redoStack, changes];
      const reversedChanges = changes.map(reverseEvent).reverse();
      for (const event of reversedChanges) {
        this.applyEvent(event);
      }
      this.redoStack = newRedoStack;
    }
  }

  /**
   * Redo the last set of changes.
   *
   * Note: Applying events can often result in new events being emitted, which
   * clears the redo stack. In the case of undo/redo, we want to preserve the
   * redo stack, so we make a copy and reset it afterwards.
   */
  @action
  redo() {
    const changes = this.redoStack.pop();
    if (changes) {
      const redoStack = [...this.redoStack];
      for (const event of changes) {
        this.applyEvent(event);
      }
      this.redoStack = redoStack;
    }
  }

  resolveProps(props: Record<string, unknown>) {
    return Object.entries(props).reduce((acc, [key, value]) => {
      if (key.endsWith("Id") && typeof value === "string") {
        const targetModel = this.getOrCreatePlaceholder(key.slice(0, -2), value);
        acc[key.slice(0, -2)] = targetModel;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);
  }

  /**
   * Update the store with an event. Usually you update state by mutating a
   * model or through methods on the store. But for some internal operations
   * it's useful to be able to apply an event directly.
   *
   * The application of an event emits then emits the event, which queues
   * it for syncing and triggers reactions.
   */
  applyEvent(event: StoreEvent): Error | undefined {
    switch (event.type) {
      case "create": {
        const resolvedProps = this.resolveProps(event.props ?? {});
        this.create(event.model, { ...resolvedProps, id: event.id });
        break;
      }
      case "update": {
        const modelName = event.model;
        const model = this.models[modelName]?.get(event.id);
        if (!model) {
          return new Error(`Unknown model ${event.model} with id ${event.id}`);
        }
        const resolvedProps = this.resolveProps({ [event.field]: event.newValue });
        Object.assign(model, resolvedProps);
        break;
      }
      case "delete": {
        const collectionKey = this.modelNameToCollectionKey[event.model];
        const model = this.models[collectionKey].get(event.id);
        if (!model) {
          return new Error(`Unknown model ${event.model} with id ${event.id}`);
        }
        this.delete(model);
        break;
      }
      default:
        event satisfies never;
    }
    this.notifySubscribers([event]);
  }

  patchToEvent(patch: Patch): StoreEvent[] {
    const collectionKey = this.modelNameToCollectionKey[patch.model];
    const instance = this.models[collectionKey].get(patch.id);
    if (patch.props === null) {
      // TODO: Feels weird to have an empty oldProps object. Doesn't matter cause they
      // aren't used during rebase, which is the only place this is called.
      return [{ type: "delete", model: patch.model, id: patch.id, oldProps: {} }];
    } else {
      if (instance) {
        return Object.entries(patch.props).map(([field, value]) => ({
          type: "update",
          model: patch.model,
          id: patch.id,
          field,
          oldValue: (instance as any)[field],
          newValue: value,
        }));
      } else {
        return [{ type: "create", model: patch.model, id: patch.id, props: patch.props }];
      }
    }
  }

  dispose() {
    this.disposers.forEach((dispose) => dispose());
  }
}

// TODO: This is a hack. We need to figure out a better way to serialize
function serializeModel(model: BaseModel) {
  return Object.fromEntries(
    Object.entries(model)
      .map(([key, value]) => {
        if (key === "id" || key === "placeholder") return null;
        if (value instanceof BaseModel) return [key + "Id", value.id];
        return [key, value];
      })
      .filter((entry): entry is [string, unknown] => entry !== null)
  );
}
