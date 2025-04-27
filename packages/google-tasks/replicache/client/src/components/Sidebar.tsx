import { useSubscribe } from "replicache-react";

type ListListProps = {
  lists: [string, any][];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
};

const ListList = ({ lists, selectedListId, onSelectList }: ListListProps) => {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Lists</h2>
      <ul className="space-y-1">
        {lists.map(([_, list]: [string, any]) => (
          <li
            key={list.id}
            className={`px-3 py-2 rounded-md cursor-pointer ${
              selectedListId === list.id
                ? "bg-blue-100 dark:bg-blue-900"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => onSelectList(list.id)}
          >
            {list.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

type TagListProps = {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
};

const TagList = ({ tags, selectedTag, onSelectTag }: TagListProps) => {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2">Tags</h2>
      <ul className="space-y-1">
        {tags.map((tag) => (
          <li
            key={tag}
            className={`px-3 py-2 rounded-md cursor-pointer ${
              selectedTag === tag
                ? "bg-blue-100 dark:bg-blue-900"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => onSelectTag(tag)}
          >
            #{tag}
          </li>
        ))}
      </ul>
    </div>
  );
};

type ListActionsProps = {
  onCreateList: () => void;
};

const ListActions = ({ onCreateList }: ListActionsProps) => {
  return (
    <div className="mt-4">
      <button
        onClick={onCreateList}
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
  );
};

type SidebarProps = {
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
};

export default function Sidebar({
  selectedListId,
  setSelectedListId,
  selectedTag,
  setSelectedTag,
}: SidebarProps) {
  const lists = useSubscribe<[string, any][]>((tx) =>
    tx.scan({ prefix: "list/" }).entries().toArray()
  );

  // Extract tags from task notes (basic implementation - can be improved)
  const tasks = useSubscribe<[string, any][]>((tx) =>
    tx.scan({ prefix: "task/" }).entries().toArray()
  );
  const tags = tasks
    ? Array.from(
        new Set(
          tasks
            .map(([_, task]) => {
              const matches = task.notes?.match(/#(\w+)/g) || [];
              return matches.map((tag: string) => tag.substring(1));
            })
            .flat()
        )
      ).sort()
    : [];

  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
    setSelectedTag(null);
  };

  const handleSelectTag = (tag: string) => {
    setSelectedTag(tag);
    setSelectedListId(null);
  };

  const handleCreateList = () => {
    // To be implemented with mutators later
    console.log("Create new list");
  };

  if (!lists) return null;

  return (
    <div className="w-64 bg-white dark:bg-gray-900 p-4 border-r border-gray-200 dark:border-gray-800 h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Google Tasks</h1>
      </div>
      <ListList lists={lists} selectedListId={selectedListId} onSelectList={handleSelectList} />
      {tags.length > 0 && (
        <TagList tags={tags} selectedTag={selectedTag} onSelectTag={handleSelectTag} />
      )}
      <ListActions onCreateList={handleCreateList} />
    </div>
  );
}
