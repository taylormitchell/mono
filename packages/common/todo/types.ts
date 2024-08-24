export type Heading = {
  type: "heading";
  level: number;
  text: string;
};
export const TODO_KEYWORDS = ["TODO", "DOING", "DONE", "MAYBE", "WAITING"] as const;
export const TODO_REGEX = new RegExp(`^-?\\s*(${TODO_KEYWORDS.join("|")})`);
export type TodoStatus = (typeof TODO_KEYWORDS)[number];
export type Todo = {
  type: "todo";
  text: string;
  status: TodoStatus;
  due?: Date;
  id?: string;
  filename?: string;
  relativeFilename?: string;
  headings?: Heading[];
};

export function deserializeTodo(todo: Omit<Todo, "due"> & { due?: string }): Todo {
  let due: Date | undefined;
  if (todo.due) {
    const [year, month, day] = todo.due.split("-").map(Number);
    due = new Date(year, month - 1, day);
  }
  return { ...todo, due };
}
