import { ViewSelection } from "./types";

export function getViewId(view: ViewSelection) {
  if (view.type === "list") {
    return view.type + "/" + view.id;
  } else if (view.type === "tag") {
    return view.type + "/" + view.id;
  } else if (view.type === "all") {
    return view.type;
  } else {
    return view satisfies never;
  }
}
