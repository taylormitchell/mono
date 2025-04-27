import { useState } from "react";
import Sidebar from "./Sidebar";
import type { ViewSelection } from "../types";
import Toolbar from "./Toolbar";
import TaskListView from "./TaskList";

export default function App() {
  const [view, setView] = useState<ViewSelection>({ type: "all" });
  const [filterText, setFilterText] = useState("");

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar view={view} setView={setView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-2">
          <Toolbar filterText={filterText} setFilterText={setFilterText} view={view} />
        </div>
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <TaskListView view={view} filterText={filterText} />
        </div>
      </div>
    </div>
  );
}
