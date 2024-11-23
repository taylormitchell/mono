import { backlinks, BaseModel, link, property, Store } from "../store";

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
      store.commit();
      project.title = "Updated";
      store.commit();

      store.undo();
      expect(project.title).toBe("Original");

      store.redo();
      expect(project.title).toBe("Updated");
    });

    it("should undo and redo link changes", () => {
      const project = store.create("project", { title: "Test Project" });
      const issue = store.create("issue", { title: "Test Issue" });
      store.commit();

      issue.project = project;
      expect(project.issues.has(issue)).toBe(true);
      store.commit();

      store.undo();
      expect(issue.project).toBeNull();
      expect(project.issues.has(issue)).toBe(false);

      store.redo();
      expect(issue.project).toBe(project);
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
      expect(realProject.issues.has(issue)).toBe(true);
    });
  });
});
