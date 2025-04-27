import { useMemo } from "react";
import { useSubscribe } from "replicache-react";
import { rep } from "../replicache";
import { listLists, listTasks } from "../replicache";
import type { ViewSelection } from "../types";
import type { Task, TaskList } from "../../../shared/types";

export default function Sidebar({
  view,
  setView,
}: {
  view: ViewSelection;
  setView: (view: ViewSelection) => void;
}) {
  const lists = useSubscribe(rep, listLists, { default: [] as TaskList[] });
  const tasks = useSubscribe(rep, listTasks, { default: [] as Task[] });

  const tags = useMemo(() => {
    return tasks
      ? Array.from(
          new Set(
            tasks
              .map((task) => {
                const matches = task.notes?.match(/#(\S+)/g) || [];
                return matches.map((tag: string) => tag.substring(1));
              })
              .flat()
          )
        ).sort()
      : [];
  }, [tasks]);

  const handleSelectList = (listId: string) => {
    setView({ type: "list", id: listId });
  };

  const handleSelectTag = (tag: string) => {
    setView({ type: "tag", id: tag });
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 p-4 border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto flex flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Views</h2>
        <ul className="space-y-1">
          <li
            className={`px-3 py-2 rounded-md cursor-pointer ${
              view.type === "all"
                ? "bg-blue-100 dark:bg-blue-900"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => setView({ type: "all" })}
          >
            All Tasks
          </li>
        </ul>
      </div>
      {/* Lists list */}
      <div className="mb-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Lists</h2>
        <ul className="space-y-1">
          {lists.map((list) => (
            <li
              key={list.id}
              className={`px-3 py-2 rounded-md cursor-pointer ${
                view.type === "list" && view.id === list.id
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleSelectList(list.id)}
            >
              {list.title}
            </li>
          ))}
        </ul>
      </div>
      {/* Tags list */}
      <div className="mb-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Tags</h2>
        <ul className="space-y-1">
          {tags.map((tag) => (
            <li
              key={tag}
              className={`px-3 py-2 rounded-md cursor-pointer ${
                view.type === "tag" && view.id === tag
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleSelectTag(tag)}
            >
              #{tag}
            </li>
          ))}
        </ul>
      </div>
      {/* Debug controls */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Debug</h2>
        <div className="space-y-2">
          <button
            onClick={() => rep.pull()}
            className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          >
            Pull
          </button>
          <button
            onClick={() => {
              indexedDB.deleteDatabase(rep.idbName);
              window.location.reload();
            }}
            className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
