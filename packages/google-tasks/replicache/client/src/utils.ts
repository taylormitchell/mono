import { ViewSelection } from "./types";

export function getViewId(view: ViewSelection) {
  if (view.type === "list") {
    return view.type + "/" + view.id;
  } else if (view.type === "tag") {
    return view.type + "/" + view.id;
  } else if (view.type === "all") {
    return view.type;
  } else if (view.type === "due-today") {
    return view.type;
  } else if (view.type === "upcoming") {
    return view.type;
  } else {
    return view satisfies never;
  }
}

const TASK_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TASK_ID_LENGTH = 22;

export function generateId() {
  let id = "";

  const randomValues = crypto.getRandomValues(new Uint8Array(TASK_ID_LENGTH));
  for (let i = 0; i < TASK_ID_LENGTH; i++) {
    id += TASK_ID_ALPHABET[randomValues[i] % TASK_ID_ALPHABET.length];
  }
  return id;
}
