import { observer } from "mobx-react-lite";
import { useState } from "react";
import styles from "./CreateIssueModal.module.css"; // Reuse the same styles
import { CloseIcon } from "./Icons";
import { useKeyDown } from "./useKeyDown";
import { useStore } from "../lib/useStore";

interface EditIssueModalProps {
  issueId: string;
  onClose: () => void;
}

export const EditIssueModal = observer(({ issueId, onClose }: EditIssueModalProps) => {
  const store = useStore();
  const issue = store.get("issue", issueId);
  const [title, setTitle] = useState(issue?.title || "");
  const [body, setBody] = useState(issue?.body || "");

  const labels = store.getAll("label");
  const selectedLabelIds = new Set(issue?.labels.map((label) => label.id) || []);

  useKeyDown("Escape", () => {
    onClose();
  });

  if (!issue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    issue.title = title.trim();
    issue.body = body.trim();
    onClose();
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.has(labelId)) {
      selectedLabelIds.delete(labelId);
    } else {
      selectedLabelIds.add(labelId);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Edit Issue</h2>
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
            <div className={styles.field}>
              <div className={styles.labels}>
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className={`${styles.labelButton} ${
                      selectedLabelIds.has(label.id) ? styles.labelSelected : ""
                    }`}
                    style={{ backgroundColor: label.name }}
                    onClick={() => toggleLabel(label.id)}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.createButton} disabled={!title.trim()}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </>
  );
});
