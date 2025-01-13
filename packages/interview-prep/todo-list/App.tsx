import { useState } from "react";

type Todo = {
  text: string;
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<string>("");

  const handleAddTodo = () => {
    setTodos([...todos, { text: newTodo }]);
    setNewTodo("");
  };

  const handleCancelTodo = () => {
    setNewTodo("");
  };

  const handleDeleteTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  const handleEditTodo = (index: number, value: string) => {
    setTodos(todos.map((todo, i) => (i === index ? { ...todo, text: value } : todo)));
  };

  return (
    <div className="flex justify-center">
      <div className="w-full md:w-[50%] border p-4 flex flex-col gap-2">
        <div className="flex flex-col items-end gap-2">
          <input
            className="border bg-gray-600 rounded-md w-full"
            type="text"
            placeholder="Enter a new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <div className="flex flex-row gap-2">
            <button className="bg-gray-600 p-2 rounded-md" onClick={handleAddTodo}>
              Submit
            </button>
            <button className="bg-gray-600 p-2 rounded-md" onClick={handleCancelTodo}>
              Cancel
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {todos.map((todo, index) => (
            <TodoItem
              key={index}
              todo={todo}
              onDelete={() => handleDeleteTodo(index)}
              onEdit={(value) => handleEditTodo(index, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onDelete: () => void;
  onEdit: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTodo, setNewTodo] = useState(todo.text);

  return (
    <div className="w-full flex flex-row gap-2">
      {!isEditing ? (
        <>
          <span className="grow">{todo.text}</span>
          <button className="bg-red-600 p-2 rounded-md" onClick={onDelete}>
            Delete
          </button>
          <button className="bg-gray-600 p-2 rounded-md" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            className="border bg-gray-600 rounded-md grow"
          />
          <button className="bg-gray-600 p-2 rounded-md" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
          <button
            className="bg-gray-600 p-2 rounded-md"
            onClick={() => {
              onEdit(newTodo);
              setIsEditing(false);
            }}
          >
            Save
          </button>
        </>
      )}
    </div>
  );
}

export default App;
