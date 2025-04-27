import { useSubscribe } from "replicache-react";
import { rep } from "../replicache";
import { listLists, listTasks } from "../mutators";
import type { Task, TaskList, ViewSelection } from "../types";

export default function Sidebar({
  view,
  setView,
}: {
  view: ViewSelection;
  setView: (view: ViewSelection) => void;
}) {
  const lists = useSubscribe(rep, listLists, { default: [] as TaskList[] });
  const tasks = useSubscribe(rep, listTasks, { default: [] as Task[] });

  const tags = tasks
    ? Array.from(
        new Set(
          tasks
            .map((task) => {
              const matches = task.notes?.match(/#(\w+)/g) || [];
              return matches.map((tag: string) => tag.substring(1));
            })
            .flat()
        )
      ).sort()
    : [];

  const handleSelectList = (listId: string) => {
    setView({ type: "list", id: listId });
  };

  const handleSelectTag = (tag: string) => {
    setView({ type: "tag", id: tag });
  };

  const handleCreateList = () => {
    // To be implemented with mutators later
    console.log("Create new list");
  };

  if (!lists) return null;

  return (
    <div className="w-64 bg-white dark:bg-gray-900 p-4 border-r border-gray-200 dark:border-gray-800 h-screen">
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
      {/* List actions */}
      <div className="mt-4">
        <button
          onClick={handleCreateList}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New List
        </button>
      </div>
    </div>
  );
}
