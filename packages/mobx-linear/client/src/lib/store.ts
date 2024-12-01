import { action, observable, reaction, runInAction } from "mobx";

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
  targetModel: string;
}

interface BacklinksMetadataField {
  type: "backlinks";
  fieldKey: string;
  sourceModel: string;
  sourceKey: string;
}

type ModelMetadataField = PropertyMetadataField | LinkMetadataField | BacklinksMetadataField;

type ModelMetadata = {
  name: string;
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
      name: target.name.toLowerCase(),
      fields: {},
    });
  }
  return modelMetadataRegistry.get(target)!;
}

export abstract class BaseModel {
  readonly id: string;
  placeholder = false;
  protected store?: Store<any>;

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    this.id = props.id ?? crypto.randomUUID();
    this.placeholder = props.placeholder ?? false;
  }

  protected emitIfStored(event: StoreEvent) {
    this.store?.emit(event);
  }

  protected applyIfStored(event: StoreEvent) {
    this.store?.applyEvent(event);
  }

  inStore() {
    return !!this.store;
  }

  // TODO: Can only belong to one store?
  _setStore(store: Store<any>) {
    this.store = store;
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
        const metadata = getModelMetadata(this.constructor);
        const oldValue = observableResult.get?.call(this);
        runInAction(() => {
          observableResult.set?.call(this, newValue);
          this.emitIfStored({
            type: "update",
            model: metadata.name,
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
        const metadata = getModelMetadata(this.constructor);
        const oldValue = observableResult.get?.call(this);
        runInAction(() => {
          observableResult.set?.call(this, newValue);
          this.emitIfStored({
            type: "update",
            model: metadata.name,
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

export function link(targetModel?: string, opts: { serializedKey?: string } = {}) {
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
        const model = getModelMetadata(this.constructor).name;
        runInAction(() => {
          observableResult.set?.call(this, newValue);
          this.emitIfStored({
            type: "update",
            model,
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
          targetModel: targetModel ?? fieldName,
        };
        return runInAction(() => observableResult.init?.call(this, initialValue));
      },
    };
  };
}

export function backlinks(sourceRef: string) {
  const [sourceModel, sourceKey] = sourceRef.split(".");
  if (!sourceModel || !sourceKey) {
    throw new Error("Invalid backlinks reference format. Expected 'model.field'");
  }
  return (_: any, context: ClassFieldDecoratorContext) => {
    const fieldName = String(context.name);
    return function (this: BaseModel, initialValue: unknown) {
      const metadata = getModelMetadata(this.constructor);
      metadata.fields[fieldName] = {
        type: "backlinks",
        fieldKey: fieldName,
        sourceModel: sourceModel,
        sourceKey,
      };
      if (!(initialValue instanceof Set)) {
        throw new Error("Backlinks must be initialized with a Set");
      }
      const set = observable.set();
      const setAdd = set.add.bind(set);
      const setDelete = set.delete.bind(set);
      set.add = action((value: BaseModel) => {
        const result = setAdd(value);
        // TODO: handle case where they're in different stores?
        if (this.inStore()) {
          const metadata = getModelMetadata(value.constructor);
          if (metadata.name !== sourceModel) {
            console.warn(`Backlink ${metadata.name} does not match source model ${sourceModel}`);
          }
          if ((value as any)[sourceKey] !== this) {
            this.applyIfStored({
              type: "update",
              model: sourceModel,
              id: value.id,
              field: sourceKey,
              oldValue: (value as any)[sourceKey],
              newValue: this.id,
            });
          }
        }
        return result;
      });
      set.delete = action((value: BaseModel) => {
        const result = setDelete(value);
        if (this.inStore()) {
          const metadata = getModelMetadata(value.constructor);
          if (metadata.name !== sourceModel) {
            console.warn(`Backlink ${metadata.name} does not match source model ${sourceModel}`);
          }
          if ((value as any)[sourceKey] === this) {
            this.applyIfStored({
              type: "update",
              model: sourceModel,
              id: value.id,
              field: sourceKey,
              oldValue: this.id,
              newValue: null,
            });
          }
        }
        return result;
      });

      return set;
    };
  };
}

type ModelRecord = Record<string, new (...args: any[]) => BaseModel>;

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

  private modelClasses: TModels;
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
    modelClasses: TModels,
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
    this.modelClasses = modelClasses;
    this.puller = typeof puller === "string" ? createPuller(puller) : puller;
    this.pusher = typeof pusher === "string" ? createPusher(pusher) : pusher;
    this.poker = typeof poker === "string" ? createPoker(poker) : poker;

    // Initialize model storage
    for (const name in modelClasses) {
      const ModelClass = modelClasses[name];
      new ModelClass(); // Initializes metadata (TODO: kinda weird)
      this.models[name] = observable.map();
      this.deletedModels[name] = observable.map();
      this.modelMetadata[name] = getModelMetadata(ModelClass);
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
      const ModelClass = this.modelClasses[event.model];
      if (!ModelClass) return;
      const metadata = getModelMetadata(ModelClass);

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
            sourceInst: this.models[event.model].get(event.id)!,
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
                sourceInst: this.models[event.model].get(event.id)!,
                oldTargetId: null,
                newTargetId: targetId,
              });
            }
          });
      }

      // Process all link changes through the same code path
      linkChanges.forEach(({ field, sourceInst, oldTargetId, newTargetId }) => {
        const TargetClass = this.modelClasses[field.targetModel];
        if (!TargetClass) return;

        const targetMetadata = getModelMetadata(TargetClass);
        const backlink = Object.values(targetMetadata.fields).find(
          (f) =>
            f.type === "backlinks" &&
            f.sourceModel === event.model &&
            f.sourceKey === field.fieldKey
        ) as BacklinksMetadataField | undefined;

        if (backlink) {
          if (oldTargetId) {
            const oldTarget = this.models[field.targetModel].get(oldTargetId) as any;
            if (oldTarget) {
              (oldTarget[backlink.fieldKey] as Set<BaseModel>).delete(sourceInst);
            }
          }

          if (newTargetId) {
            const newTarget = this.models[field.targetModel].get(newTargetId) as any;
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
      const metadata = getModelMetadata(this.modelClasses[event.model]);
      if (
        event.type === "update" &&
        metadata.updatedAtField &&
        event.field !== metadata.updatedAtField.serializedKey
      ) {
        const model = this.models[event.model].get(event.id);
        if (model) {
          (model as any)[metadata.updatedAtField.fieldKey] = Date.now();
        }
      }
    });
  }

  // Model operations with type safety
  create<K extends keyof TModels>(
    modelName: K,
    serializedProps: Record<string, unknown> = {}
  ): InstanceType<TModels[K]> {
    const ModelClass = this.modelClasses[modelName];
    if (!ModelClass) {
      throw new Error(`Unknown model: ${String(modelName)}`);
    }

    const existing =
      typeof serializedProps.id === "string"
        ? this.models[modelName].get(serializedProps.id) ??
          // In case where we rollback a created model and then re-create it
          // we want to use the same instance from before rolling back.
          this.deletedModels[modelName].get(serializedProps.id)
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
            // constructorProps[fieldName] = this.getOrCreatePlaceholder(field.targetModel, targetId);
            (instance as any)[fieldName] = this.getOrCreatePlaceholder(field.targetModel, targetId);
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
    this.models[modelName].set(instance.id, instance);

    // Emit create event
    this.emit({
      type: "create",
      model: String(modelName),
      id: instance.id,
      props: serializedProps,
    });

    return instance;
  }

  private getOrCreatePlaceholder<T extends BaseModel>(
    modelName: keyof typeof this.models,
    id: string
  ): T {
    const existing = this.models[modelName].get(id) as T;
    if (existing) return existing;
    return this.create(modelName, { id, placeholder: true }) as T;
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
    const modelName = modelMetadataRegistry.get(model.constructor)?.name;
    if (!modelName) throw new Error("Unknown model");
    this.models[modelName].delete(model.id);
    this.deletedModels[modelName].set(model.id, model as InstanceType<TModels[keyof TModels]>);
    this.emit({ type: "delete", model: modelName, id: model.id });
  }

  get<K extends keyof TModels>(modelName: K, id: string) {
    const model = this.models[modelName].get(id);
    return model as InstanceType<TModels[K]> | undefined;
  }

  getAll<K extends keyof TModels>(modelName: K) {
    return Array.from(this.models[modelName].values()) as InstanceType<TModels[K]>[];
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
        const model = this.models[event.model].get(event.id);
        if (!model) {
          return new Error(`Unknown model ${event.model} with id ${event.id}`);
        }
        const metadata = getModelMetadata(model.constructor);
        const field = metadata.fields[event.field];
        if (field?.type === "link" && event.newValue) {
          const targetModel = this.models[field.targetModel].get(event.newValue as string);
          (model as any)[event.field] = targetModel;
        } else {
          (model as any)[event.field] = event.newValue;
        }
        break;
      }
      case "delete": {
        const model = this.models[event.model].get(event.id);
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
    const instance = this.models[patch.model].get(patch.id);
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
