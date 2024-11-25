import { property, backlinks, link, BaseModel, Store, updatedAt } from "./store";

class Issue extends BaseModel {
  @property()
  accessor title: string = "";

  @link()
  accessor project: Project | null = null;

  @property()
  accessor createdAt: number = Date.now();

  @updatedAt()
  accessor updatedAt: number = Date.now();

  @backlinks("relation.from")
  readonly relationsFrom = new Set<Relation>();

  @backlinks("relation.to")
  readonly relationsTo = new Set<Relation>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class Project extends BaseModel {
  @property()
  accessor title = "";

  @property()
  accessor createdAt = Date.now();

  @updatedAt()
  accessor updatedAt = Date.now();

  @backlinks("issue.project")
  readonly issues = new Set<Issue>();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

class Relation extends BaseModel {
  @link("issue")
  accessor from: Issue | null = null;

  @link("issue")
  accessor to: Issue | null = null;

  @property()
  accessor createdAt = Date.now();

  @updatedAt()
  accessor updatedAt = Date.now();

  constructor(props: { id?: string; placeholder?: boolean } = {}) {
    super(props);
  }
}

export function createStore() {
  return new Store(
    {
      issue: Issue,
      project: Project,
      relation: Relation,
    },
    {
      puller: "/api/pull",
      pusher: "/api/push",
    }
  );
}
