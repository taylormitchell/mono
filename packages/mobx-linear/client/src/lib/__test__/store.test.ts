import { backlinks, BaseModel, link, Property, Store } from "../store";
import { InMemoryServer } from "../../../../shared/InMemoryServer";

describe("Store", () => {
  class Project extends BaseModel {
    @Property()
    accessor title = "";

    @backlinks("issue.project")
    readonly issues = new Set<Issue>();

    constructor(props: { id?: string; placeholder?: boolean; title?: string } = {}) {
      super(props);
      this.title = props.title ?? "";
    }
  }

  class Issue extends BaseModel {
    @Property()
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
      const project = store.create("project", { title: "Test" });
      project.title = "Updated";

      // @ts-expect-error allow private access in test
      const events = store.localMutations.flatMap((m) => m.events);

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
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });
      issue.project = project;

      // Get the last mutation
      // @ts-expect-error allow private access in test
      const events = store.localMutations.slice(-1)[0].events;

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
    let server: InMemoryServer;

    function createStore() {
      return new Store(
        { project: Project, issue: Issue },
        {
          pusher: (clientId, mutations) => server.handlePush(clientId, mutations),
          puller: (clientId) => server.handlePull(clientId),
        }
      );
    }

    beforeEach(() => {
      server = new InMemoryServer();
      store = createStore();
    });

    it("should handle basic push/pull", async () => {
      const issue = store.create("issue");
      await store.push();
      await store.pull();
      expect(store.get("issue", issue.id)).toBeDefined();
    });

    it("should clear local mutations after pull", async () => {
      store.create("project", { title: "Test" });
      // @ts-expect-error allow private access in test
      expect(store.localMutations.length).toBe(1);
      await store.push();
      // @ts-expect-error allow private access in test
      expect(store.localMutations.length).toBe(1);
      await store.pull();
      // @ts-expect-error allow private access in test
      expect(store.localMutations.length).toBe(0);
    });

    it("should sync updates between clients", async () => {
      // First client creates and updates
      const project = store.create("project", { title: "Original" });
      await store.push();
      project.title = "Updated";
      await store.push();

      // Second client syncs
      const store2 = createStore();

      await store2.pull();
      const syncedProject = store2.get("project", project.id);
      expect(syncedProject?.title).toBe("Updated");
    });

    it("should replay local mutations after pull", async () => {
      // Stores 1 and 2 are initially in sync
      const projectId = store.create("project", { title: "Original" }).id;
      await store.push();
      const store2 = createStore();
      await store2.pull();

      // Then they make concurrent changes
      const store1Project = store.get("project", projectId)!;
      const store2Project = store2.get("project", projectId)!;
      store1Project.title = "Store 1's Update";
      store2Project.title = "Store 2's Update";

      // Store 2 pushes to server
      await store2.push();

      // Store 1 pulls, but doesn't lose it's local mutation, cause it
      // was re-applied after pull
      await store.pull();
      expect(store1Project.title).toBe("Store 1's Update");
    });
  });
});
