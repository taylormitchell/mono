import { backlinks, BaseModel, link, OptimisticMutation, Patch, property, Store } from "../store";
import { ModelName } from "../types";

class MockServer {
  private globalVersion = 0;
  private models: Record<
    string,
    Map<string, { data: Record<string, unknown>; deleted?: boolean; version: number }>
  > = {};
  private clients: Map<string, { lastPulledVersion: number; lastPushedMutationId: number }> =
    new Map();

  constructor(modelTypes: string[]) {
    // Initialize empty maps for each model type
    modelTypes.forEach((type) => {
      this.models[type] = new Map();
    });
  }

  async push(clientId: string, mutations: OptimisticMutation[]) {
    // Apply each mutation in order
    for (const { mutationId, events } of mutations) {
      // Skip if we've already seen this mutation
      const lastPushedMutationId = this.clients.get(clientId)?.lastPushedMutationId ?? -1;
      if (lastPushedMutationId >= mutationId) continue;

      // Apply each event in the mutation
      this.globalVersion++;
      for (const event of events) {
        const modelMap = this.models[event.model];
        const existing = modelMap.get(event.id);
        switch (event.type) {
          case "create":
          case "update": {
            if (existing?.deleted) continue;
            const existingData = existing?.data ?? {};
            const newData =
              event.type === "create"
                ? { ...event.props }
                : { ...existingData, [event.field]: event.newValue };
            modelMap.set(event.id, {
              data: newData,
              version: this.globalVersion,
            });
            break;
          }
          case "delete": {
            if (!existing || existing.deleted) continue;
            modelMap.set(event.id, {
              ...existing,
              deleted: true,
              version: this.globalVersion,
            });
            break;
          }
        }
      }

      this.clients.set(clientId, {
        lastPulledVersion: this.globalVersion,
        lastPushedMutationId: mutationId,
      });
    }
  }

  private getClient(clientId: string) {
    let client = this.clients.get(clientId);
    if (!client) {
      client = {
        lastPulledVersion: 0,
        lastPushedMutationId: 0,
      };
      this.clients.set(clientId, client);
    }
    return client;
  }

  async pull(clientId: string) {
    const client = this.getClient(clientId);

    const lastPulledVersion = client.lastPulledVersion;
    const patches: Patch[] = [];

    // Look through all models for changes since last version
    for (const [modelName, modelMap] of Object.entries(this.models)) {
      for (const [id, { data, version, deleted }] of modelMap.entries()) {
        if (version > lastPulledVersion) {
          patches.push({
            type: "set",
            model: modelName as ModelName,
            id,
            props: deleted ? null : data,
          });
        }
      }
    }

    client.lastPulledVersion = this.globalVersion;
    return {
      patches,
      lastMutationId: client.lastPushedMutationId,
    };
  }
}

describe("Store", () => {
  class Project extends BaseModel {
    @property()
    accessor title = "";

    @backlinks("issue.project")
    readonly issues = new Set<Issue>();

    constructor(props: { id?: string; placeholder?: boolean; title?: string } = {}) {
      super(props);
      this.title = props.title ?? "";
    }
  }

  class Issue extends BaseModel {
    @property()
    accessor title: string;

    @link()
    accessor project: Project | null;

    constructor(
      props: {
        id?: string;
        placeholder?: boolean;
        title?: string;
        project?: Project | null;
      } = {}
    ) {
      super(props);
      this.title = props.title ?? "";
      this.project = props.project ?? null;
    }
  }

  let store: Store<{ project: typeof Project; issue: typeof Issue }>;

  beforeEach(() => {
    store = new Store({ project: Project, issue: Issue });
  });

  afterEach(() => {
    store.dispose();
  });

  describe("basic CRUD operations", () => {
    it("should create and retrieve models", () => {
      const project = store.create("project", { title: "Test Project" });
      expect(project.title).toBe("Test Project");
      expect(store.get("project", project.id)).toBe(project);
    });

    it("should update model properties", () => {
      const project = store.create("project", { title: "Test Project" });
      project.title = "Updated Project";
      expect(store.get("project", project.id)?.title).toBe("Updated Project");
    });

    it("should delete models", () => {
      const project = store.create("project", { title: "Test Project" });
      store.delete(project);
      expect(store.get("project", project.id)).toBeUndefined();
    });
  });

  describe("bidirectional links", () => {
    it("should update backlinks on create", () => {
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue", projectId: project.id });
      expect(project.issues.has(issue)).toBe(true);
    });

    it("should update backlinks when setting a link", () => {
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });

      // Set the link
      issue.project = project;

      // Check both sides of the relationship
      expect(issue.project).toBe(project);
      expect(project.issues.has(issue)).toBe(true);
      expect(project.issues.size).toBe(1);
    });

    it("should update backlinks when clearing a link", () => {
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });

      // Set up the relationship
      issue.project = project;

      // Clear the link
      issue.project = null;

      // Check both sides
      expect(issue.project).toBeNull();
      expect(project.issues.has(issue)).toBe(false);
      expect(project.issues.size).toBe(0);
    });

    it("should update link when removing from backlinks set", () => {
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });

      // Set up the relationship
      issue.project = project;

      // Remove via backlinks
      project.issues.delete(issue);

      // Check both sides
      expect(issue.project).toBeNull();
      expect(project.issues.has(issue)).toBe(false);
    });

    it("should handle changing links between different models", () => {
      const project1 = store.create("project", { title: "Project 1" });
      const project2 = store.create("project", { title: "Project 2" });
      const issue = store.create("issue", { title: "Test Issue" });

      // Set initial link
      issue.project = project1;
      expect(project1.issues.has(issue)).toBe(true);
      expect(project2.issues.has(issue)).toBe(false);

      // Change link
      issue.project = project2;
      expect(project1.issues.has(issue)).toBe(false);
      expect(project2.issues.has(issue)).toBe(true);
    });
  });

  describe("undo/redo functionality", () => {
    it("should undo and redo property changes", () => {
      const project = store.create("project", { title: "Original" });
      project.title = "Updated";

      store.undo();
      expect(project.title).toBe("Original");

      store.redo();
      expect(project.title).toBe("Updated");
    });

    it("should undo and redo link changes", () => {
      const projectId = crypto.randomUUID();
      const project = store.create("project", { id: projectId, title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });
      store.commit();

      issue.project = project;
      expect(project.issues.has(issue)).toBe(true);
      store.commit();

      store.undo();
      expect(issue.project).toBeNull();
      expect(project.issues.has(issue)).toBe(false);

      store.redo();
      expect(issue.project?.id).toBe(projectId);
      expect(project.issues.has(issue)).toBe(true);
    });
  });

  describe("event handling", () => {
    it("should emit events for model changes", () => {
      const events: any[] = [];
      store.subscribe((event) => events.push(event));

      const project = store.create("project", { title: "Test" });
      project.title = "Updated";

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        type: "create",
        model: "project",
      });
      expect(events[1]).toMatchObject({
        type: "update",
        model: "project",
        field: "title",
        oldValue: "Test",
        newValue: "Updated",
      });
    });

    it("should emit events for link changes", () => {
      const events: any[] = [];
      store.subscribe((event) => events.push(event));

      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });

      events.length = 0; // Clear creation events
      issue.project = project;

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "update",
        model: "issue",
        field: "project",
        oldValue: null,
        newValue: project.id,
      });
    });
  });

  describe("placeholder handling", () => {
    it("should create placeholder models when setting links", () => {
      const issue = store.create("issue", {
        title: "Test Issue",
        projectId: "non-existent-id",
      });

      const placeholder = issue.project;
      expect(placeholder).toBeTruthy();
      expect(placeholder?.placeholder).toBe(true);
      expect(placeholder?.id).toBe("non-existent-id");
    });

    it("should replace placeholders with real models when they are created", () => {
      const issue = store.create("issue", {
        title: "Test Issue",
        projectId: "future-id",
      });

      const placeholder = issue.project;
      expect(placeholder?.placeholder).toBe(true);

      const realProject = store.create("project", {
        id: "future-id",
        title: "Real Project",
      });

      expect(issue.project).toBe(realProject);
      expect(realProject.placeholder).toBe(false);
    });
  });

  describe("sync functionality", () => {
    let server: MockServer;

    function createStore() {
      return new Store(
        { project: Project, issue: Issue },
        {
          pusher: (clientId, mutations) => server.push(clientId, mutations),
          puller: (clientId) => server.pull(clientId),
        }
      );
    }

    beforeEach(() => {
      server = new MockServer(["project", "issue"]);
      store = createStore();
    });

    it("should sync created models to server", async () => {
      const project = store.create("project", { title: "Test Project" });
      await store.push();

      // Create a second store to verify sync
      const store2 = createStore();

      await store2.pull();
      const syncedProject = store2.get("project", project.id);
      expect(syncedProject?.title).toBe("Test Project");
    });

    it("should sync updates between clients", async () => {
      // First client creates and updates
      const project = store.create("project", { title: "Original" });
      await store.push();
      project.title = "Updated";
      await store.push();

      // Second client syncs
      const store2 = new Store(
        { project: Project, issue: Issue },
        {
          pusher: (clientId, mutations) => server.push(clientId, mutations),
          puller: (clientId) => server.pull(clientId),
        }
      );

      await store2.pull();
      const syncedProject = store2.get("project", project.id);
      expect(syncedProject?.title).toBe("Updated");
    });

    it("should handle concurrent updates", async () => {
      // First client creates
      const project = store.create("project", { title: "Original" });
      await store.push();

      // Second client syncs and updates
      const store2 = new Store(
        { project: Project, issue: Issue },
        {
          pusher: (clientId, mutations) => server.push(clientId, mutations),
          puller: (clientId) => server.pull(clientId),
        }
      );
      await store2.pull();
      const project2 = store2.get("project", project.id)!;
      project2.title = "Store 2's Update";
      await store2.push();

      // First client updates without pulling
      project.title = "Store 1's Update";
      await store.push();
      await store.pull(); // Now pull to get Store 2's changes

      // Both stores should have the latest state
      expect(project.title).toBe("Store 2's Update");
      expect(project2.title).toBe("Store 2's Update");
    });
  });
});
