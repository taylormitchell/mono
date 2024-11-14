import { observable, reaction } from "mobx";

type Event = any;
let events: Event[] = [];
const eventsDirty = observable.box(false);
function emitEvent(event: Event) {
  events.push(event);
  eventsDirty.set(true);
  for (const subscriber of subscribers) {
    subscriber(event);
  }
}
type Subscriber = (event: Event) => void;
const subscribers = new Set<Subscriber>();

function subscribe(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

class ModelMetadata {
  private metadata = {
    issue: {},
    relation: {},
    project: {},
  };

  addPropNameMapper(mapper: { model: ModelName; modelProp: string; serializedProp?: string }) {
    this.metadata[mapper.model][mapper.modelProp] = mapper.serializedProp ?? mapper.modelProp;
  }

  mapPropName(model: ModelName, prop: string) {
    return this.metadata[model][prop] ?? prop;
  }
}

const modelMetadata = new ModelMetadata();

const issues = new Map<string, Issue>();
const relations = new Map<string, Relation>();
const projects = new Map<string, Project>();

type ModelName = "issue" | "relation" | "project";

function getModel(model: ModelName, id: string) {
  switch (model) {
    case "issue":
      return issues.get(id);
    case "relation":
      return relations.get(id);
    case "project":
      return projects.get(id);
  }
}

function assertModelExists(model: ModelName, id: string) {
  if (!getModel(model, id)) {
    throw new Error(`Model ${model} with id ${id} not found`);
  }
}

reaction(
  () => eventsDirty.get(),
  () => {
    if (eventsDirty.get()) {
      console.log("Events:", events);
      events = [];
      eventsDirty.set(false);
    }
  }
);

/* eslint-disable @typescript-eslint/no-explicit-any */
const Property = (serializedKeyName?: string) => {
  return (
    target: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
  ) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to apply observable decorator");
    }
    const keyName = String(context.name);

    return {
      get() {
        assertModelExists(this.model, this.id);
        return observableResult.get?.call(this);
      },
      set(newValue: unknown) {
        assertModelExists(this.model, this.id);
        const oldValue = observableResult.get?.call(this);
        emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey: mapPropName(keyName),
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: unknown) {
        modelMetadata.addPropNameMapper({
          model: this.model,
          modelProp: keyName,
          serializedProp: serializedKeyName,
        });
        return observableResult.init?.call(this, value);
      },
    };
  };
};

const ForeignKey = (serializedKeyName?: string) => {
  return (
    target: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
  ) => {
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to apply observable decorator");
    }
    const keyName = String(context.name);

    return {
      get() {
        assertModelExists(this.model, this.id);
        return observableResult.get?.call(this);
      },
      set(newValue: unknown) {
        assertModelExists(this.model, this.id);
        const oldValue = observableResult.get?.call(this);
        emitEvent({
          operation: "update",
          model: this.model,
          id: this.id,
          propKey: mapPropName(this.model, keyName),
          oldValue: oldValue?.id ?? null,
          newValue: newValue?.id ?? null,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: unknown) {
        modelMetadata.addPropNameMapper({
          model: this.model,
          modelProp: keyName,
          serializedProp: serializedKeyName,
        });
        return observableResult.init?.call(this, value);
      },
    };
  };
};

class Backlinks<T extends Model> implements Iterable<T> {
  private map = new Map<string, T>();
  unsubscribe: (() => void) | null = null;

  constructor(private owner: Model, private link: { from: string; key: string }) {
    this.unsubscribe = subscribe((event) => {
      if (event.model === link.from) {
        if (event.operation === "delete") {
          if (this.map.has(event.id)) {
            this.map.delete(event.id);
          }
        } else if (event.operation === "update" && event.propKey === link.key) {
          if (event.oldValue && event.oldValue === this.owner && this.map.has(event.id)) {
            this.map.delete(event.id);
          }
          if (event.newValue && event.newValue === this.owner && !this.map.has(event.id)) {
            const model = getModel(event.model, event.id);
            if (model) {
              this.map.set(model.id, model);
            } else {
              console.error(`Model ${event.model} with id ${event.id} not found`);
            }
          }
        }
      }
    });
  }

  add(value: T): void {
    value[this.link.key] = this.owner;
  }

  remove(value: T): void {
    value[this.link.key] = null;
  }

  get size(): number {
    return this.map.size;
  }

  get ids(): string[] {
    return Array.from(this.map.values()).map((value) => value.id);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.map.values();
  }
}

interface Model {
  id: string;
  model: string;
}

class Issue implements Model {
  readonly model = "issue";
  readonly id: string;

  @Property()
  accessor title = "";

  @ForeignKey("projectId")
  accessor project: Project | null = null;

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "fromId" });

  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "toId" });

  constructor(id: string) {
    this.id = id;
  }
}

class Relation implements Model {
  readonly model = "relation";
  readonly id: string;

  @ForeignKey("fromId")
  accessor from: Issue | null = null;

  @ForeignKey("toId")
  accessor to: Issue | null = null;

  constructor(id: string) {
    this.id = id;
  }
}

class Project implements Model {
  readonly model = "project";
  readonly id: string;

  @Property()
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "projectId" });

  constructor(id: string) {
    this.id = id;
  }

  destroy() {
    this.issues.unsubscribe?.();
  }
}
