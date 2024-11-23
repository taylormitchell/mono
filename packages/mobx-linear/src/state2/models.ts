import { property, backlinks, link, BaseModel } from "./store";

class Issue extends BaseModel {
  @property()
  accessor title: string;

  @link()
  accessor project: Project | null;

  @backlinks("relation.from")
  readonly relationsFrom = new Set<Relation>();

  @backlinks("relation.to")
  readonly relationsTo = new Set<Relation>();

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

class Relation extends BaseModel {
  @link("issue")
  accessor from: Issue | null = null;

  @link("issue")
  accessor to: Issue | null = null;

  constructor(
    props: { id?: string; placeholder?: boolean; from?: Issue | null; to?: Issue | null } = {}
  ) {
    super(props);
    this.from = props.from ?? null;
    this.to = props.to ?? null;
  }
}
