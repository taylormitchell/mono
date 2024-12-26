import { action, observable, reaction, runInAction } from "mobx";
import { Store } from "../old/state";

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

// Types and utilities
interface PropertyMetadataField {
  type: "property";
  fieldKey: string;
  serializedKey: string;
}

interface UpdatedAtMetadataField {
  type: "updatedAt";
  fieldKey: string;
  serializedKey: string;
}

interface LinkMetadataField {
  type: "link";
  fieldKey: string;
  serializedKey: string;
  targetModelName: string;
}

interface BacklinksMetadataField {
  type: "backlinks";
  fieldKey: string;
  sourceModelName: string;
  sourceKey: string;
}

type ModelMetadataField = PropertyMetadataField | LinkMetadataField | BacklinksMetadataField;

type ModelMetadata = {
  fields: Record<string, ModelMetadataField>;
  updatedAtField?: UpdatedAtMetadataField;
};

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
      return { type: "delete", model: event.model, id: event.id };
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
      return { type: "create", model: event.model, id: event.id };
  }
}

// Global metadata registry
// This allows classes to work without a store while still maintaining their metadata
const modelMetadataRegistry = new Map<Function, ModelMetadata>();

function getModelMetadata(target: Function): ModelMetadata {
  if (!modelMetadataRegistry.has(target)) {
    modelMetadataRegistry.set(target, {
      fields: {},
    });
  }
  return modelMetadataRegistry.get(target)!;
}

export abstract class BaseModel {
  readonly id: string;
  placeholder = false;
  _store?: Store<any>;

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    this.id = props.id ?? crypto.randomUUID();
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

export function property(opts: { serializedKey?: string } = {}) {
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
            model: this.constructor.name,
            id: this.id,
            field: fieldName,
            oldValue,
            newValue,
          });
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        metadata.fields[fieldName] = { type: "property", serializedKey, fieldKey: fieldName };
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

export function updatedAt(opts: { serializedKey?: string } = {}) {
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
            model: this.constructor.name,
            id: this.id,
            field: fieldName,
            oldValue,
            newValue,
          });
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        if (metadata.updatedAtField && metadata.updatedAtField.fieldKey !== fieldName) {
          throw new Error("UpdatedAt field already set. Only one is allowed.");
        }
        metadata.updatedAtField = { type: "updatedAt", serializedKey, fieldKey: fieldName };
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

export function link(targetModelName?: string, opts: { serializedKey?: string } = {}) {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const fieldName = String(context.name);
    const serializedKey = opts.serializedKey ?? `${fieldName}Id`;

    const observableResult = observable(target, context);
    if (!observableResult) throw new Error("Failed to create observable link");

    return {
      get(this: BaseModel) {
        return observableResult.get?.call(this);
      },
      set(this: BaseModel, newValue: BaseModel | null) {
        const oldValue = observableResult.get?.call(this);
        runInAction(() => {
          observableResult.set?.call(this, newValue);
          this.emitIfStored({
            type: "update",
            model: this.constructor.name,
            id: this.id,
            field: serializedKey,
            oldValue: oldValue?.id ?? null,
            newValue: newValue?.id ?? null,
          });
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        metadata.fields[fieldName] = {
          type: "link",
          fieldKey: fieldName,
          serializedKey,
          targetModelName: targetModelName ?? fieldName,
        };
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

export function ManyToOne<T extends BaseModel>(collectionName: keyof T) {
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
        observableResult.set?.call(this, newParent);
        runInAction(() => {
          if (oldParent) {
            oldParent[collectionName].delete(this);
          }
          if (newParent) {
            newParent[collectionName].add(this);
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
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        metadata.fields[fieldName] = {
          type: "manyToOne",
          fieldKey: fieldName,
          serializedKey,
          collectionName,
        };
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

class Collection {
  private _set = new Set<BaseModel>();

  has(model: BaseModel) {
    return this._set.has(model);
  }

  get size() {
    return this._set.size;
  }

  *[Symbol.iterator]() {
    yield* this._set;
  }
}

export function backlinks(sourceRef: string) {
  const [sourceModelName, sourceKey] = sourceRef.split(".");
  if (!sourceModelName || !sourceKey) {
    throw new Error("Invalid backlinks reference format. Expected 'model.field'");
  }
  return (_: any, context: ClassFieldDecoratorContext) => {
    const fieldName = String(context.name);
    return function (this: BaseModel, initialValue: unknown) {
      const metadata = getModelMetadata(this.constructor);
      metadata.fields[fieldName] = {
        type: "backlinks",
        fieldKey: fieldName,
        sourceModelName,
        sourceKey,
      };
      if (!(initialValue instanceof Set)) {
        throw new Error("Backlinks must be initialized with a Set");
      }
      const set = observable.set();
      const setAdd = set.add.bind(set);
      const setDelete = set.delete.bind(set);
      set.add = action((sourceModel: BaseModel) => {
        const result = setAdd(sourceModel);
        if (sourceModel._store !== this._store) {
          console.warn(
            `Backlink ${sourceModel.constructor.name} is in a different store than the linking model ${this.constructor.name}`
          );
        }
        if (sourceModel.constructor.name !== sourceModelName) {
          console.warn(
            `Backlink ${sourceModel.constructor.name} does not match source model ${sourceModelName}`
          );
        }
        const alreadyLinksToThis = (sourceModel as any)[sourceKey] === this;
        if (!alreadyLinksToThis) {
          this.applyIfStored({
            type: "update",
            model: sourceModel.constructor.name,
            id: sourceModel.id,
            field: sourceKey,
            oldValue: (sourceModel as any)[sourceKey],
            newValue: this.id,
          });
        }
        return result;
      });
      set.delete = action((sourceModel: BaseModel) => {
        const result = setDelete(sourceModel);
        if (sourceModel._store !== this._store) {
          console.warn(
            `Backlink ${sourceModel.constructor.name} is in a different store than the linking model ${this.constructor.name}`
          );
        }
        if (sourceModel.constructor.name !== sourceModelName) {
          console.warn(
            `Backlink ${sourceModel.constructor.name} does not match source model ${sourceModelName}`
          );
        }
        const alreadyLinksToThis = (sourceModel as any)[sourceKey] === this;
        if (!alreadyLinksToThis) {
          this.applyIfStored({
            type: "update",
            model: sourceModel.constructor.name,
            id: sourceModel.id,
            field: sourceKey,
            oldValue: this.id,
            newValue: null,
          });
        }
        return result;
      });

      return set;
    };
  };
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
  readonly clientId = crypto.randomUUID();
  private puller?: Puller;
  private pusher?: Pusher;
  private poker?: Pocker;

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

  modelMetadata = {} as Record<keyof TModels, ModelMetadata>;

  private modelNameToConstructor = {} as Record<string, BaseModelConstructor>;
  private modelNameToCollectionKey = {} as Record<string, keyof TModels>;
  private collectionKeyToModelName = {} as Record<keyof TModels, string>;

  private eventSubscribers = new Set<(event: StoreEvent) => void>();

  private undoStack: StoreEvent[][] = [];
  private redoStack: StoreEvent[][] = [];
  private stagedChanges: StoreEvent[] = [];

  private localMutationId = 0;
  private localMutations: OptimisticMutation[] = [];

  private eventsEmittedCount = observable.box(0);
  private disposers: Array<() => void> = [];

  private emittingEnabled = true;
  private syncEnabled = true;

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
      new ModelClass(); // Initializes metadata (TODO: kinda weird)
      const modelName = ModelClass.name;
      this.modelNameToConstructor[modelName] = ModelClass;
      this.modelNameToCollectionKey[modelName] = modelCollectionKey;
      this.collectionKeyToModelName[modelCollectionKey] = modelName;

      this.models[modelCollectionKey] = observable.map();
      this.deletedModels[modelCollectionKey] = observable.map();
      this.modelMetadata[modelCollectionKey] = getModelMetadata(ModelClass);
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

    // Set up triggers
    this.setupBacklinksTrigger();
    this.setupUpdatedAtTrigger();

    // Start syncing
    if (syncEnabled) {
      this.enableSync();
    } else {
      this.disableSync();
    }

    // Set up poker
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

  private setupBacklinksTrigger() {
    this.subscribe((event) => {
      // Get model class and metadata early
      const ModelClass = this.modelNameToConstructor[event.model];
      if (!ModelClass) return;
      const metadata = getModelMetadata(ModelClass);
      const collectionKey = this.modelNameToCollectionKey[event.model];

      // Gather all link changes
      const linkChanges: {
        field: LinkMetadataField;
        sourceInst: BaseModel;
        oldTargetId: string | null;
        newTargetId: string | null;
      }[] = [];
      if (event.type === "update") {
        const field = metadata.fields[event.field];
        if (field?.type === "link") {
          linkChanges.push({
            field,
            sourceInst: this.models[collectionKey].get(event.id)!,
            oldTargetId: event.oldValue as string | null,
            newTargetId: event.newValue as string | null,
          });
        }
      } else if (event.type === "create") {
        Object.values(metadata.fields)
          .filter((f): f is LinkMetadataField => f.type === "link")
          .forEach((field) => {
            const targetId = event.props?.[field.serializedKey] as string | undefined;
            if (targetId) {
              linkChanges.push({
                field,
                sourceInst: this.models[collectionKey].get(event.id)!,
                oldTargetId: null,
                newTargetId: targetId,
              });
            }
          });
      }

      // Process all link changes through the same code path
      linkChanges.forEach(({ field, sourceInst, oldTargetId, newTargetId }) => {
        const TargetClass = this.modelNameToConstructor[field.targetModelName];
        if (!TargetClass) return;
        const targetCollectionKey = this.modelNameToCollectionKey[field.targetModelName];

        const targetMetadata = getModelMetadata(TargetClass);
        const backlink = Object.values(targetMetadata.fields).find(
          (f) =>
            f.type === "backlinks" &&
            f.sourceModelName === event.model &&
            f.sourceKey === field.fieldKey
        ) as BacklinksMetadataField | undefined;

        if (backlink) {
          if (oldTargetId) {
            const oldTarget = this.models[targetCollectionKey].get(oldTargetId) as any;
            if (oldTarget) {
              (oldTarget[backlink.fieldKey] as Set<BaseModel>).delete(sourceInst);
            }
          }

          if (newTargetId) {
            const newTarget = this.models[targetCollectionKey].get(newTargetId) as any;
            if (newTarget) {
              (newTarget[backlink.fieldKey] as Set<BaseModel>).add(sourceInst);
            }
          }
        }
      });
    });
  }

  private setupUpdatedAtTrigger() {
    this.subscribe((event) => {
      const metadata = getModelMetadata(this.modelNameToConstructor[event.model]);
      if (
        event.type === "update" &&
        metadata.updatedAtField &&
        event.field !== metadata.updatedAtField.serializedKey
      ) {
        const collectionKey = this.modelNameToCollectionKey[event.model];
        const model = this.models[collectionKey].get(event.id);
        if (model) {
          (model as any)[metadata.updatedAtField.fieldKey] = Date.now();
        }
      }
    });
  }

  // Model operations with type safety
  @action
  create<K extends keyof TModels>(
    collectionKey: K, // TODO: Just make this the model name?
    serializedProps: Record<string, unknown> = {}
  ): InstanceType<TModels[K]> {
    const modelName = this.collectionKeyToModelName[collectionKey];
    const ModelClass = this.modelNameToConstructor[modelName];
    if (!ModelClass) {
      throw new Error(`Unknown model: ${String(modelName)}`);
    }

    const existing =
      typeof serializedProps.id === "string"
        ? this.models[collectionKey].get(serializedProps.id) ??
          // In case where we rollback a created model and then re-create it
          // we want to use the same instance from before rolling back.
          this.deletedModels[collectionKey].get(serializedProps.id)
        : undefined;
    const instance =
      existing ??
      (new ModelClass({
        id: serializedProps.id,
        placeholder: serializedProps.placeholder,
      }) as InstanceType<TModels[K]>);

    // Transform serialized props into constructor props
    const metadata = getModelMetadata(ModelClass);
    Object.entries(metadata.fields).forEach(([fieldName, field]) => {
      switch (field.type) {
        case "property":
          if (serializedProps[field.serializedKey] !== undefined) {
            // constructorProps[fieldName] = serializedProps[field.serializedKey];
            (instance as any)[fieldName] = serializedProps[field.serializedKey];
          }
          break;

        case "link":
          if (serializedProps[field.serializedKey]) {
            const targetId = serializedProps[field.serializedKey] as string;
            (instance as any)[fieldName] = this.getOrCreatePlaceholder(
              field.targetModelName,
              targetId
            );
          }
          break;
      }
    });
    if (metadata.updatedAtField) {
      const updatedAt = serializedProps[metadata.updatedAtField.serializedKey];
      if (updatedAt !== undefined) {
        (instance as any)[metadata.updatedAtField.fieldKey] = updatedAt;
      }
    }

    if (existing && serializedProps.placeholder === undefined) {
      instance.placeholder = false;
    }

    instance._setStore(this);

    // Register in store
    this.models[collectionKey].set(instance.id, instance);

    // Emit create event
    this.emit({
      type: "create",
      model: instance.constructor.name,
      id: instance.id,
      props: serializedProps,
    });

    return instance;
  }

  private getOrCreatePlaceholder<T extends BaseModel>(modelName: string, id: string): T {
    const collectionKey = this.modelNameToCollectionKey[modelName];
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
   */
  @action
  delete(model: BaseModel) {
    const collectionKey = this.modelNameToCollectionKey[model.constructor.name];
    this.models[collectionKey].delete(model.id);
    this.deletedModels[collectionKey].set(model.id, model as InstanceType<TModels[keyof TModels]>);
    this.emit({ type: "delete", model: model.constructor.name, id: model.id });
  }

  get<K extends keyof TModels>(collectionKey: K, id: string) {
    const model = this.models[collectionKey].get(id);
    return model as InstanceType<TModels[K]> | undefined;
  }

  getAll<K extends keyof TModels>(collectionKey: K) {
    return Array.from(this.models[collectionKey].values()) as InstanceType<TModels[K]>[];
  }

  subscribe(handler: (event: StoreEvent) => void) {
    this.eventSubscribers.add(handler);
    return () => this.eventSubscribers.delete(handler);
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
      case "create":
        this.create(event.model, { ...event.props, id: event.id });
        break;
      case "update": {
        const collectionKey = this.modelNameToCollectionKey[event.model];
        const model = this.models[collectionKey].get(event.id);
        if (!model) {
          return new Error(`Unknown model ${event.model} with id ${event.id}`);
        }
        const metadata = getModelMetadata(model.constructor);
        const field = metadata.fields[event.field];
        if (field?.type === "link" && event.newValue) {
          const targetModel = this.models[field.targetModelName].get(event.newValue as string);
          (model as any)[event.field] = targetModel;
        } else {
          (model as any)[event.field] = event.newValue;
        }
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
      return [{ type: "delete", model: patch.model, id: patch.id }];
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
