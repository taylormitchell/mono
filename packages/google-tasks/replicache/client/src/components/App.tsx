import { useState } from "react";
import Sidebar from "./Sidebar";
import MainPane from "./MainPane";

const rep = rep;

export default function App() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar
        selectedListId={selectedListId}
        setSelectedListId={setSelectedListId}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />
      <MainPane selectedListId={selectedListId} selectedTag={selectedTag} />
    </div>
  );
}
