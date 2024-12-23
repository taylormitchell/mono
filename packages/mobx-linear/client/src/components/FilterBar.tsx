import { observer } from "mobx-react-lite";
import styles from "./FilterBar.module.css";
import { useEffect, useRef, useState } from "react";
import { FilterDropdown } from "./FilterDropdown";
import { useKeyDown } from "./useKeyDown";

interface FilterBarProps {
  onSearch: (query: string) => void;
}

export const FilterBar = observer(({ onSearch }: FilterBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useKeyDown("Escape", () => {
    if (ref.current && ref.current.contains(document.activeElement)) {
      if (ref.current.value !== "") {
        setSearchQuery("");
      } else {
        ref.current.blur();
      }
    }
  });

  useKeyDown("f", (e) => {
    if (
      !ref.current ||
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    e.preventDefault();
    ref.current.focus();
  });

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  return (
    <div className={styles.container}>
      <div className={styles.filterContainer}>
        <button className={styles.filterButton} onClick={() => setIsDropdownOpen(true)}>
          <FilterIcon />
          Filter
        </button>
        <FilterDropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)} />
      </div>
      <div className={styles.searchContainer}>
        <SearchIcon />
        <input
          ref={ref}
          type="text"
          placeholder="Search issues..."
          value={searchQuery}
          onKeyDown={(e) => {
            if (ref.current && ref.current.contains(document.activeElement) && e.key !== "Escape") {
              e.stopPropagation();
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          className={styles.searchInput}
        />
      </div>
    </div>
  );
});

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 4H14M4 8H12M6 12H10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M11.3333 11.3333L14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
