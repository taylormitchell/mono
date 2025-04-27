import type { ViewSelection } from "../types";
import { useSubscribe } from "replicache-react";
import { rep } from "../replicache";
import { getList } from "../mutators";
import { getViewId } from "../utils";

export default function Toolbar({
  filterText,
  setFilterText,
  view,
}: {
  filterText: string;
  setFilterText: (text: string) => void;
  view: ViewSelection;
}) {
  const viewId = getViewId(view);
  const title = useSubscribe(
    rep,
    async (tx) => {
      if (view.type === "all") {
        return "All Tasks";
      } else if (view.type === "list") {
        const list = await getList(tx, view.id);
        return list?.title ?? "Untitled List";
      } else if (view.type === "tag") {
        return `#${view.id}`;
      }
    },
    { default: "", dependencies: [viewId] }
  );

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Filter tasks..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>
    </div>
  );
}
