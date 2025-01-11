import { useEffect, useState } from "react";
import "./App.css";

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
      } else if (e.key === "ArrowUp") {
        setHighlightedOption((prev) => {
          if (!prev) return filteredOptions[filteredOptions.length - 1];
          const nextIndex =
            (filteredOptions.indexOf(prev) - 1 + filteredOptions.length) % filteredOptions.length;
          return filteredOptions[nextIndex];
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputValue]);

  return (
    <div>
      <h1>Typeahead</h1>
      <input
        className="border border-gray-300 rounded-md p-2"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <ul>
          {filteredOptions.map((option) => (
            <li
              className={option === highlightedOption ? "underline" : ""}
              key={option}
              onClick={() => {
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
      )}
    </div>
  );
}

export default App;
