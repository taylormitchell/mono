export type ViewSelection =
  | {
      type: "list";
      id: string;
    }
  | {
      type: "tag";
      id: string;
    }
  | {
      type: "all";
    };
