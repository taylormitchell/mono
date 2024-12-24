import { observer } from "mobx-react-lite";
import styles from "./IssueList.module.css";
import { useStore } from "../lib/useStore";
import { FilterBar } from "./FilterBar";
import { useState, useRef } from "react";
import { IssueType } from "../lib/models";
import { CreateIssueModal } from "./CreateIssueModal";
import { EditIssueModal } from "./EditIssueModal";
import { createPosition, getNewPositionsForMove } from "../lib/position";
import { useKeyDown } from "./useKeyDown";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const useAllIssuesView = () => {
  const store = useStore();
  let view = store.get("issueView", "all");
  if (!view) {
    view = store.create("issueView", { id: "all" });
  }
  return view;
};

export const IssueList = observer(() => {
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; issueId: string } | null>(
    null
  );
  const allIssuesView = useAllIssuesView();

  useKeyDown("c", (e) => {
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    e.preventDefault();
    setModal({ type: "create" });
  });

  const issues = allIssuesView.issues
    .filter(
      (issue) => !searchQuery || issue.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((issue) => ({
      issue,
      position:
        allIssuesView.issueViewPositionsById[issue.id]?.position ?? createPosition(issue.createdAt),
    }))
    .sort((a, b) => (a.position > b.position ? 1 : -1));

  const ROW_HEIGHT = 50; // Adjust based on your actual row height

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Issues</h2>
            <span className={styles.issueCount}>{issues.length}</span>
          </div>
          <button className={styles.createButton} onClick={() => setModal({ type: "create" })}>
            New Issue
          </button>
        </div>
        <FilterBar onSearch={setSearchQuery} />

        <div className={styles.list}>
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={issues.length}
                itemSize={ROW_HEIGHT}
                itemData={{ issues }}
                overscanCount={10}
              >
                {({ index, style, data }: any) => {
                  const { issue, position } = data.issues[index];
                  return (
                    <div style={style}>
                      <IssueRow
                        issue={issue}
                        position={position}
                        setIsEditModalOpen={() => setModal({ type: "edit", issueId: issue.id })}
                        moveItem={(dragId: string, hoverId: string) => {
                          const dragIndex = issues.findIndex((i) => i.issue.id === dragId);
                          const hoverIndex = issues.findIndex((i) => i.issue.id === hoverId);
                          const rePositions = getNewPositionsForMove(
                            issues,
                            (i) => i.position,
                            dragIndex,
                            hoverIndex - 1
                          );
                          if (rePositions.size === 0) return;
                          rePositions.forEach((position, item) => {
                            allIssuesView.upsertPosition(item.issue, position);
                          });
                        }}
                      />
                    </div>
                  );
                }}
              </List>
            )}
          </AutoSizer>
        </div>
        {modal?.type === "edit" && (
          <EditIssueModal issueId={modal.issueId} onClose={() => setModal(null)} />
        )}
        {modal?.type === "create" && <CreateIssueModal onClose={() => setModal(null)} />}
      </div>
    </DndProvider>
  );
});

const IssueRow = observer(
  ({
    issue,
    position,
    setIsEditModalOpen,
    moveItem,
  }: {
    issue: IssueType;
    position?: string;
    setIsEditModalOpen: (open: boolean) => void;
    moveItem: (dragId: string, hoverId: string) => void;
  }) => {
    const store = useStore();

    const [{ isDragging }, drag] = useDrag({
      type: "ISSUE",
      item: { id: issue.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [{ isOver }, drop] = useDrop({
      accept: "ISSUE",
      drop: (item: { id: string }) => {
        const dragId = item.id;
        const hoverId = issue.id;
        if (dragId === hoverId) return;
        moveItem(dragId, hoverId);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    const ref = useRef<HTMLDivElement>(null);
    drag(drop(ref));

    return (
      <div
        ref={ref}
        className={`${styles.issueRow} ${isDragging ? styles.isDragging : ""}`}
        data-is-over={isOver}
        onClick={() => setIsEditModalOpen(true)}
      >
        <div className={styles.dragHandle}>⋮⋮</div>
        <div className={styles.issueStatus}>●</div>
        <div className={styles.issueTitle}>{issue.title}</div>
        {/* <div>{position}</div> */}
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            store.delete(issue);
          }}
        >
          Delete
        </button>
      </div>
    );
  }
);
