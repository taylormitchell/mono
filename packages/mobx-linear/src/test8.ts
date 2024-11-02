import { observable, reaction, runInAction } from "mobx";

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

const modelMetadata = {
  issue: {},
  relation: {},
  project: {},
};

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
const Property = (
  target: ClassAccessorDecoratorTarget<any, any>,
  context: ClassAccessorDecoratorContext
) => {
  const observableResult = observable(target, context);
  if (!observableResult) {
    throw new Error("Failed to apply observable decorator");
  }

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
        model: this.constructor.name.toLowerCase(),
        id: (this as any).id,
        oldProps: { [String(context.name)]: oldValue },
        newProps: { [String(context.name)]: newValue },
      });
      observableResult.set?.call(this, newValue);
    },
    init(value: unknown) {
      return observableResult.init?.call(this, value);
    },
  };
};

const ForeignKey = (serializedKeyName?: string) => {
  return (
    target: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
  ) => {
    // const keyName = `${String(context.name)}Id`;
    const keyName = String(context.name);
    const observableResult = observable(target, context);
    if (!observableResult) {
      throw new Error("Failed to apply observable decorator");
    }

    return {
      get() {
        assertModelExists(this.model, this.id);
        return observableResult.get?.call(this);
      },
      set(newValue: Model | null) {
        assertModelExists(this.model, this.id);
        const oldValue: Model | null = observableResult.get?.call(this);
        emitEvent({
          model: this.constructor.name.toLowerCase(),
          id: (this as any).id,
          operation: "update",
          propKey: keyName,
          oldValue,
          newValue,
        });
        observableResult.set?.call(this, newValue);
      },
      init(value: unknown) {
        if (!modelMetadata[this.model][keyName]) {
          modelMetadata[this.model][keyName] = serializedKeyName ?? keyName;
        }
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

  @Property
  accessor title = "";

  @ForeignKey()
  accessor project: Project | null = null;

  relationsFrom = new Backlinks<Relation>(this, { from: "relation", key: "from" });

  relationsTo = new Backlinks<Relation>(this, { from: "relation", key: "to" });

  constructor(id: string) {
    this.id = id;
  }
}

class Relation implements Model {
  readonly model = "relation";
  readonly id: string;

  @ForeignKey()
  accessor from: Issue | null = null;

  @ForeignKey()
  accessor to: Issue | null = null;

  constructor(id: string) {
    this.id = id;
  }
}

class Project implements Model {
  readonly model = "project";
  readonly id: string;

  @Property
  accessor title = "";

  issues = new Backlinks<Issue>(this, { from: "issue", key: "project" });

  constructor(id: string) {
    this.id = id;
  }

  destroy() {
    this.issues.unsubscribe?.();
  }
}

function createIssue(id: string) {
  const issue = new Issue(id);
  issues.set(id, issue);
  return issue;
}

function createProject(id: string) {
  const project = new Project(id);
  projects.set(id, project);
  return project;
}

function createRelation(id: string) {
  const relation = new Relation(id);
  relations.set(id, relation);
  return relation;
}

// Test code
const project1 = createProject("project1");
const issue1 = createIssue("issue1");

runInAction(() => {
  issue1.project = project1;
});
console.log("project1.issues.ids", project1.issues.ids);

runInAction(() => {
  project1.issues.remove(issue1);
});
console.log("issue1.project", issue1.project);

const relation1 = createRelation("relation1");
const relation2 = createRelation("relation2");
runInAction(() => {
  relation1.from = issue1;
  relation2.from = issue1;
});
for (const relation of issue1.relationsFrom) {
  console.log("relation", relation);
}

// runInAction(() => {
//   issue.title = "issue 1";
//   project.title = "project 1";
//   issue.project = project;
//   project.issues.delete("issue1");
// });
// console.log("after assigning then deleting");
// console.log("project.issues.size", project.issues.size);
// console.log("issue.project?.id", issue.project?.id);

// runInAction(() => {
//   issue.project = project2;
// });
// console.log("after assigning to another project");
// console.log("project2.issues.size", project2.issues.size);
// console.log("issue.project?.id", issue.project?.id);
