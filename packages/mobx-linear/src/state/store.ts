import { observable, reaction } from "mobx";
import { ModelName } from "./types";

// Types and utilities
type ModelMetadataField =
  | {
      type: "property";
      serializedKey: string;
    }
  | {
      type: "link";
      serializedKey: string;
      targetModel: ModelName;
    }
  | {
      type: "backlinks";
      sourceModel: ModelName;
      sourceKey: string;
    };

type ModelMetadata = {
  name: ModelName;
  fields: Record<string, ModelMetadataField>;
};

// Event types
type StoreEvent =
  | {
      type: "create";
      model: ModelName;
      id: string;
      props?: Record<string, unknown>;
    }
  | {
      type: "update";
      model: ModelName;
      id: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: "delete";
      model: ModelName;
      id: string;
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
      name: target.name.toLowerCase() as ModelName,
      fields: {},
    });
  }
  return modelMetadataRegistry.get(target)!;
}

// Base model that all domain models extend from
export abstract class BaseModel {
  readonly id: string;
  placeholder = false;
  private store?: Store<any>;

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    this.id = props.id ?? crypto.randomUUID();
    this.placeholder = props.placeholder ?? false;
  }

  // TODO: I don't like these

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

// Standalone decorators
export function property(opts: { serializedKey?: string } = {}) {
  return (target: any, context: ClassAccessorDecoratorContext) => {
    const fieldName = String(context.name);
    const serializedKey = opts.serializedKey ?? fieldName;

    const observableResult = observable(target, context);
    if (!observableResult) throw new Error("Failed to create observable property");

    context.addInitializer(function (this: any) {
      const metadata = getModelMetadata(this.constructor);
      metadata.fields[fieldName] = { type: "property", serializedKey };
    });

    return {
      get(this: BaseModel) {
        return observableResult.get?.call(this);
      },
      set(this: BaseModel, newValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        const oldValue = observableResult.get?.call(this);
        observableResult.set?.call(this, newValue);
        this.emitIfStored({
          type: "update",
          model: metadata.name,
          id: this.id,
          field: fieldName,
          oldValue,
          newValue,
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        metadata.fields[fieldName] = { type: "property", serializedKey };
        return observableResult.init?.call(this, initialValue);
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
        observableResult.set?.call(this, newValue);
        this.emitIfStored({
          type: "update",
          model,
          id: this.id,
          field: fieldName,
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
      },
      init(this: BaseModel, initialValue: unknown) {
        const metadata = getModelMetadata(this.constructor);
        metadata.fields[fieldName] = {
          type: "link",
          serializedKey,
          targetModel: targetModel ?? fieldName,
        };
        return observableResult.init?.call(this, initialValue);
      },
    };
  };
}

// TODO better types
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
        sourceModel,
        sourceKey,
      };
      if (!(initialValue instanceof Set)) {
        throw new Error("Backlinks must be initialized with a Set");
      }
      const set = observable.set();
      const setAdd = set.add.bind(set);
      const setDelete = set.delete.bind(set);
      set.add = (value: BaseModel) => {
        const result = setAdd(value);
        // TODO: handle case where they're in different stores?
        if (this.inStore()) {
          const metadata = getModelMetadata(value.constructor);
          if (metadata.name !== sourceModel) {
            console.warn(`Backlink ${metadata.name} does not match source model ${sourceModel}`);
          }
          if (value[sourceKey] !== this) {
            this.applyIfStored({
              type: "update",
              model: sourceModel,
              id: value.id,
              field: sourceKey,
              oldValue: value[sourceKey],
              newValue: this.id,
            });
          }
        }
        return result;
      };
      set.delete = (value: BaseModel) => {
        const result = setDelete(value);
        if (this.inStore()) {
          const metadata = getModelMetadata(value.constructor);
          if (metadata.name !== sourceModel) {
            console.warn(`Backlink ${metadata.name} does not match source model ${sourceModel}`);
          }
          if (value[sourceKey] === this) {
            this.applyIfStored({
              type: "update",
              model: sourceModel,
              id: this.id,
              field: sourceKey,
              oldValue: value.id,
              newValue: null,
            });
          }
        }
        return result;
      };

      return set;
    };
  };
}

type ModelRecord = Record<string, new (...args: any[]) => BaseModel>;

// Store implementation
export class Store<TModels extends ModelRecord> {
  private models = {} as Record<keyof TModels, Map<string, InstanceType<TModels[keyof TModels]>>>;
  private modelClasses: TModels;
  private eventSubscribers = new Set<(event: StoreEvent) => void>();

  private undoStack: StoreEvent[][] = [];
  private redoStack: StoreEvent[][] = [];
  private pendingChanges: StoreEvent[] = [];

  private lastChangeTimestamp = observable.box(0);
  private disposers: Array<() => void> = [];

  constructor(modelClasses: TModels) {
    this.modelClasses = modelClasses;

    // Initialize model storage
    for (const name in modelClasses) {
      this.models[name] = new Map();
    }

    // Set up auto-commit
    this.disposers.push(
      reaction(
        () => this.lastChangeTimestamp.get(),
        () => this.commit()
      )
    );

    // Set up bidirectional sync
    this.setupBidirectionalSync();
  }

  // TODO: Need to _not_ do this during undo/redo?
  commit() {
    if (this.pendingChanges.length > 0) {
      this.undoStack.push(this.pendingChanges);
      this.redoStack = [];
      this.pendingChanges = [];
    }
  }

  emit(event: StoreEvent) {
    this.pendingChanges.push(event);
    this.lastChangeTimestamp.set(Date.now());
    this.eventSubscribers.forEach((subscriber) => subscriber(event));
  }

  private setupBidirectionalSync() {
    this.subscribe((event) => {
      if (event.type !== "update") return;

      const ModelClass = this.modelClasses[event.model];
      if (!ModelClass) return;

      const metadata = getModelMetadata(ModelClass);
      const field = metadata.fields[event.field];

      if (field?.type === "link") {
        // Find corresponding backlinks
        const TargetClass = this.modelClasses[field.targetModel];
        if (!TargetClass) return;

        const targetMetadata = getModelMetadata(TargetClass);
        const backlink = Object.entries(targetMetadata.fields).find(
          ([, f]) =>
            f.type === "backlinks" && f.sourceModel === event.model && f.sourceKey === event.field
        );

        if (backlink) {
          const [backlinkField] = backlink;
          const sourceInst = this.models[event.model].get(event.id);

          if (event.oldValue) {
            const oldTarget = this.models[field.targetModel].get(event.oldValue as string);
            if (oldTarget) {
              (oldTarget[backlinkField] as Set<BaseModel>).delete(sourceInst!);
            }
          }

          if (event.newValue) {
            const newTarget = this.models[field.targetModel].get(event.newValue as string);
            if (newTarget) {
              (newTarget[backlinkField] as Set<BaseModel>).add(sourceInst!);
            }
          }
        }
      }
    });
  }

  // Model operations with type safety
  create<K extends keyof TModels>(
    modelName: K,
    serializedProps: Record<string, unknown>
  ): InstanceType<TModels[K]> {
    const ModelClass = this.modelClasses[modelName];
    if (!ModelClass) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const metadata = getModelMetadata(ModelClass);
    const constructorProps: Record<string, unknown> = {
      id: serializedProps.id,
      placeholder: serializedProps.placeholder,
    };

    // Transform serialized props into constructor props
    Object.entries(metadata.fields).forEach(([fieldName, field]) => {
      switch (field.type) {
        case "property":
          if (serializedProps[field.serializedKey] !== undefined) {
            constructorProps[fieldName] = serializedProps[field.serializedKey];
          }
          break;

        case "link":
          if (serializedProps[field.serializedKey]) {
            const targetId = serializedProps[field.serializedKey] as string;
            constructorProps[fieldName] = this.getOrCreatePlaceholder(field.targetModel, targetId);
          }
          break;
      }
    });

    const instance = new ModelClass(constructorProps) as InstanceType<TModels[K]>;
    instance._setStore(this);

    // Register in store
    this.models[modelName].set(instance.id, instance);

    // Emit create event
    this.emit({
      type: "create",
      model: modelName,
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

    return this.create(modelName, { id, placeholder: true });
  }

  delete(model: BaseModel) {
    const modelName = modelMetadataRegistry.get(model.constructor)?.name;
    if (!modelName) throw new Error("Unknown model");
    this.models[modelName].delete(model.id);
  }

  get<K extends keyof TModels>(modelName: K, id: string) {
    return this.models[modelName].get(id) as InstanceType<TModels[K]> | undefined;
  }

  getAll<K extends keyof TModels>(modelName: K) {
    return Array.from(this.models[modelName].values()) as InstanceType<TModels[K]>[];
  }

  subscribe(handler: (event: StoreEvent) => void) {
    this.eventSubscribers.add(handler);
    return () => this.eventSubscribers.delete(handler);
  }

  undo() {
    const changes = this.undoStack.pop();
    if (changes) {
      const reversedChanges = changes.map(reverseEvent).reverse();
      this.redoStack.push(reversedChanges);
      for (const event of reversedChanges) {
        this.applyEvent(event);
      }
    }
  }

  redo() {
    const changes = this.redoStack.pop();
    if (changes) {
      this.undoStack.push(changes);
      for (const event of changes) {
        this.applyEvent(event);
      }
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
        this.create(event.model, event.props ?? {});
        break;
      case "update": {
        const model = this.models[event.model].get(event.id);
        if (!model) {
          return new Error(`Unknown model ${event.model} with id ${event.id}`);
        }
        (model as any)[event.field] = event.newValue;
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
  }

  dispose() {
    this.disposers.forEach((dispose) => dispose());
  }
}
