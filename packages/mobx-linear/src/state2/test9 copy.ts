// First define some base types
interface Constructor<T> {
  new (...args: any[]): T;
}

// Store class definition with generic type constraints
class Store<TModels extends Record<string, Constructor<any>>> {
  private models: TModels;

  constructor(models: TModels) {
    this.models = models;
  }

  // create method with type inference
  create<K extends keyof TModels>(modelName: K): InstanceType<TModels[K]> {
    const ModelClass = this.models[modelName];
    return new ModelClass();
  }
}

// Helper function to create the store with type inference
function createStore<TModels extends Record<string, Constructor<any>>>(
  models: TModels
): Store<TModels> {
  return new Store(models);
}

// Example usage:
class Issue {
  title: string = "";
  description: string = "";
}

class Project {
  name: string = "";
}

class Relation {
  from: string = "";
  to: string = "";
}

const store = createStore({
  issue: Issue,
  project: Project,
  relation: Relation,
});

// These will have correct types inferred:
const newIssue = store.create("issue"); // type: Issue
const newProject = store.create("project"); // type: Project
const newRelation = store.create("relation"); // type: Relation

// This would cause a type error:
// const invalid = store.create("nonexistent");
