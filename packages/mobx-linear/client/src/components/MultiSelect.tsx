import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { CheckIcon } from "@radix-ui/react-icons";
import styles from "./MultiSelect.module.css";

interface Option {
  id: string;
  name: string;
  color?: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  placeholder?: string;
}

export const MultiSelect = ({
  options,
  selectedIds,
  onToggle,
  placeholder = "Select items...",
}: MultiSelectProps) => {
  const [search, setSearch] = React.useState("");
  const contentRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover.Root>
      <Popover.Trigger className={styles.trigger}>
        {selectedIds.size > 0 ? `${selectedIds.size} selected` : placeholder}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className={styles.content} sideOffset={5} ref={contentRef}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />

          <div className={styles.optionsList}>
            {filteredOptions.map((option) => (
              <div key={option.id} className={styles.option} onClick={() => onToggle(option.id)}>
                <div className={styles.checkbox}>{selectedIds.has(option.id) && <CheckIcon />}</div>
                {option.color ? (
                  <span className={styles.colorDot} style={{ backgroundColor: option.color }} />
                ) : null}
                {option.name}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
