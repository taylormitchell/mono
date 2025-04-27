import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { rep } from "../replicache";
import type { ViewSelection } from "../types";
import type { Task } from "../../../shared/types";
import { listTasks } from "../replicache";
import { generateId, getViewId } from "../utils";
const TaskItem = ({
  task,
  onToggleComplete,
  onEdit,
}: {
  task: Task;
  onToggleComplete: (taskId: string, listId: string) => void;
  onEdit: (taskId: string) => void;
}) => {
  return (
    <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 group hover:bg-gray-50 dark:hover:bg-gray-800">
      <input
        type="checkbox"
        checked={task.status === "completed"}
        onChange={() => onToggleComplete(task.id, task.listId)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 ml-3">
        <p className={`${task.status === "completed" ? "line-through text-gray-500" : ""}`}>
          {task.title}
        </p>
        {task.due && (
          <p className="text-xs text-gray-500">Due: {new Date(task.due).toLocaleDateString()}</p>
        )}
        {task.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.notes}</p>
        )}
      </div>
      <button
        onClick={() => onEdit(task.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
    </div>
  );
};

type CompletedAccordionProps = {
  tasks: Task[];
  onToggleComplete: (taskId: string, listId: string) => void;
  onEdit: (taskId: string) => void;
};

const CompletedAccordion = ({ tasks, onToggleComplete, onEdit }: CompletedAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">Completed ({tasks.length})</span>
        <svg
          className={`h-5 w-5 transform ${isOpen ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskAddRow = ({ view }: { view: ViewSelection }) => {
  const [title, setTitle] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      try {
        await rep.mutate.createTask({
          id: generateId(),
          listId: view.type === "list" ? view.id : undefined,
          title,
          notes: view.type === "tag" ? `#${view.id}` : "",
        });
      } catch (err) {
        console.error("Error adding task:", err);
      }
      setTitle("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700"
    >
      <input
        type="text"
        placeholder="Add a task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 border-0 focus:ring-0 text-gray-800 dark:text-gray-200 dark:bg-transparent placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="ml-2 p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </form>
  );
};

export default function TaskListView({
  view,
  filterText,
}: {
  view: ViewSelection;
  filterText: string;
}) {
  const viewId = getViewId(view);
  const tasks = useSubscribe(
    rep,
    async (tx) => {
      const tasks = await listTasks(tx);

      if (view.type === "list") {
        return tasks.filter((task) => task.listId === view.id);
      } else if (view.type === "tag") {
        return tasks.filter((task) => task.notes?.includes(`#${view.id}`));
      } else if (view.type === "due-today") {
        // Filter tasks due today
        const today = new Date().toISOString().split("T")[0];

        return tasks.filter((task) => {
          if (!task.due) return false;
          const dueDate = task.due.split("T")[0];
          return dueDate === today;
        });
      } else if (view.type === "upcoming") {
        return tasks
          .filter((task) => task.due)
          .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime());
      }
    },
    { default: [] as Task[], dependencies: [viewId] }
  );
  const handleToggleComplete = async (taskId: string) => {
    try {
      const task = tasks.find((task) => task.id === taskId);
      if (task) {
        await rep.mutate.updateTask({
          id: taskId,
          status: task.status === "completed" ? "needsAction" : "completed",
        });
      }
    } catch (err) {
      console.error("Error toggling task status:", err);
    }
  };

  const handleEditTask = (taskId: string) => {
    // This would typically open a modal or inline form
    // For now, just log it - this would be connected to a UI element later
    console.log("Edit task:", taskId);
  };

  if (!tasks) return <div className="p-4">Loading...</div>;

  let filteredTasks = tasks;

  // Filter by text if provided
  if (filterText) {
    const searchRegex = new RegExp(filterText, "i");
    filteredTasks = filteredTasks.filter(
      (task) => searchRegex.test(task.title ?? "") || searchRegex.test(task.notes ?? "")
    );
  }

  // Separate completed and active tasks
  const activeTasks = filteredTasks.filter((task) => task.status !== "completed");
  const completedTasks = filteredTasks.filter((task) => task.status === "completed");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-md shadow overflow-hidden flex flex-col h-full">
      <TaskAddRow view={view} />
      <div className="flex-1 overflow-y-auto">
        {activeTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {filterText ? "No matching tasks" : "No tasks in this list"}
          </div>
        ) : (
          <div>
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTask}
              />
            ))}
          </div>
        )}

        <CompletedAccordion
          tasks={completedTasks}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEditTask}
        />
      </div>
    </div>
  );
}
