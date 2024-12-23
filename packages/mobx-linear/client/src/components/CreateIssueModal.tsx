import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useStore } from "../lib/useStore";
import styles from "./CreateIssueModal.module.css";
import { CloseIcon } from "./Icons";
import { useKeyDown } from "./useKeyDown";

interface CreateIssueModalProps {
  onClose: () => void;
}

export const CreateIssueModal = observer(({ onClose }: CreateIssueModalProps) => {
  const store = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useKeyDown("Escape", onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    store.create("issue", {
      title: title.trim(),
      body: body.trim(),
    });
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Create Issue</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            <div className={styles.field}>
              <input
                type="text"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.titleInput}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <textarea
                placeholder="Add a description..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={styles.descriptionInput}
                rows={4}
              />
            </div>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.createButton} disabled={!title.trim()}>
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </>
  );
});
