import Toolbar from "./Toolbar";
import TaskList from "./TaskList";
import { useSubscribe } from "replicache-react";
import { useState } from "react";

type MainPaneProps = {
  selectedListId: string | null;
  selectedTag: string | null;
};

export default function MainPane({ selectedListId, selectedTag }: MainPaneProps) {
  const [filterText, setFilterText] = useState("");

  // Get lists for title lookup
  const lists = useSubscribe((tx) => tx.scan({ prefix: "list/" }).entries().toArray());

  // Find the selected list title
  const selectedList = lists ? lists.find(([_, list]) => list.id === selectedListId)?.[1] : null;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <Toolbar
        filterText={filterText}
        setFilterText={setFilterText}
        selectedListId={selectedListId}
        selectedTag={selectedTag}
        listTitle={selectedList?.title}
      />
      <TaskList selectedListId={selectedListId} selectedTag={selectedTag} filterText={filterText} />
    </div>
  );
}
