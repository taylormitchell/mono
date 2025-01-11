import { useEffect, useRef, useState } from "react";
import "./App.css";

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const options = [
  "Canada",
  "United States",
  "United Kingdom",
  "Australia",
  "New Zealand",
  "India",
  "China",
  "Japan",
  "South Korea",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Portugal",
  "Greece",
  "Brazil",
  "Argentina",
  "Chile",
  "Peru",
  "Colombia",
  "Mexico",
  "Cuba",
  "Russia",
  "Turkey",
  "Egypt",
  "Nigeria",
  "South Africa",
  "Kenya",
  "Caaaa",
  "Cbbbb",
  "Ccccc",
  "Cdddd",
  "Ceeee",
  "Cffff",
  "Cgggg",
  "Chhhh",
  "Ciiii",
];

/**
 * there's a input field and a dropdown
 * - when you type in the input field, the dropdown should filter the options
 * - the dropdown should be closed:
 *  - when you click outside of it
 *  - when you click on an option
 *  - when you press escape
 * - the dropdown should be open:
 *  - when there are any options which start with the input value
 * - the highlighted option should:
 *  - be null by default
 *  - be updated when you press down or up arrow
 * 
 * when the dropdown first opens, don't highlight the option under the mouse until
 * the mouse has moved. 
 
 * 
 * 
 
 */

function App() {
  const [inputValue, setInputValue] = useState("");
  const [highlightedOption, setHighlightedOption] = useState<string | null>(null);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightedElementRef = useRef<HTMLLIElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const highlightedOptionRef = useRef<string | null>(null);
  highlightedOptionRef.current = highlightedOption;
  useEffect(() => {
    const loweredInputValue = inputValue.toLowerCase();

    // On empty input, clear the filtered options and highlighted option
    if (loweredInputValue.length === 0) {
      setFilteredOptions([]);
      setHighlightedOption(null);
      return;
    }

    // Filter the options based on the input value
    const filteredOptions = options.filter((option) =>
      option.toLowerCase().startsWith(loweredInputValue)
    );
    setFilteredOptions(filteredOptions);

    // Handle keyboard events
    function handleKeyDown(e: KeyboardEvent) {
      if (!filteredOptions.length) return;
      // todo handle modifier keys
      if (e.key === "ArrowDown") {
        setHighlightedOption((prev) => {
          if (!prev) return filteredOptions[0];
          const nextIndex = (filteredOptions.indexOf(prev) + 1) % filteredOptions.length;
          return filteredOptions[nextIndex];
        });
        // Add scroll logic
        requestAnimationFrame(() => {
          if (highlightedElementRef.current && dropdownRef.current) {
            const container = dropdownRef.current;
            const element = highlightedElementRef.current;

            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            const bottomThreshold = containerRect.bottom - containerRect.height * 0.1;

            if (elementRect.bottom > bottomThreshold) {
              container.scrollTop += container.scrollTop + containerRect.height / 2;
            }
          }
        });
      } else if (e.key === "ArrowUp") {
        setHighlightedOption((prev) => {
          if (!prev) return filteredOptions[filteredOptions.length - 1];
          const nextIndex =
            (filteredOptions.indexOf(prev) - 1 + filteredOptions.length) % filteredOptions.length;
          return filteredOptions[nextIndex];
        });
        requestAnimationFrame(() => {
          if (highlightedElementRef.current && dropdownRef.current) {
            const container = dropdownRef.current;
            const element = highlightedElementRef.current;

            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            const topThreshold = containerRect.top + containerRect.height * 0.1;

            if (elementRect.top < topThreshold) {
              container.scrollTop -= containerRect.height / 2;
            }
          }
        });
      } else if (e.key === "Enter") {
        if (highlightedOptionRef.current) {
          setInputValue(highlightedOptionRef.current);
          setHighlightedOption(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputValue]);

  return (
    <div>
      <h1>Typeahead</h1>
      <input
        ref={inputRef}
        className="border border-gray-300 rounded-md p-2 w-full"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <div ref={dropdownRef} className="overflow-y-auto max-h-[150px]">
          <ul>
            {filteredOptions.map((option) => (
              <li
                ref={option === highlightedOption ? highlightedElementRef : null}
                className={cn(
                  option === highlightedOption ? "bg-blue-500 text-white" : "",
                  "h-[30px]"
                )}
                key={option}
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                  setInputValue(option);
                }}
                onMouseEnter={() => {
                  setHighlightedOption(option);
                }}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
