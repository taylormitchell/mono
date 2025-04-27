import { useState } from "react";
import Sidebar from "./Sidebar";
import type { ViewSelection } from "../types";
import Toolbar from "./Toolbar";
import TaskListView from "./TaskList";

export default function App() {
  const [view, setView] = useState<ViewSelection>({ type: "all" });
  const [filterText, setFilterText] = useState("");
  console.log("view", view);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar view={view} setView={setView} />
      <div className="flex-1 p-6 overflow-auto">
        <Toolbar filterText={filterText} setFilterText={setFilterText} view={view} />
        <TaskListView view={view} filterText={filterText} />
      </div>
    </div>
  );
}
