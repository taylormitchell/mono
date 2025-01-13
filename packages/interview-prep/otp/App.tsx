import { useRef, useState } from "react";

function App() {
  const [inputValues, setInputValues] = useState<string[]>(["", "", "", "", ""]);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (index: number, value: string) => {
    if (!value.match(/^[0-9]*$/)) {
      return;
    }
    if (inputValues[index] === "") {
      const newInputValues = [...inputValues];
      newInputValues[index] = value;
      setInputValues(newInputValues);
    }
    if (index < inputValues.length - 1) {
      const nextInput = inputContainerRef.current?.children[index + 1] as HTMLInputElement;
      nextInput.focus();
    }
  };

  const handleDelete = (index: number) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = "";
    setInputValues(newInputValues);
    if (index > 0) {
      const prevInput = inputContainerRef.current?.children[index - 1] as HTMLInputElement;
      prevInput.focus();
    }
  };

  return (
    <>
      <div ref={inputContainerRef} className="flex gap-4">
        {inputValues.map((value, index) => (
          <input
            key={index}
            type="text"
            className="w-14 h-14 border rounded-md p-2"
            value={value}
            onChange={(e) => {
              console.log("on change", e.target.value);
              handleInputChange(index, e.target.value);
            }}
            onKeyDown={(e) => {
              console.log("on key down", e.key);
              if (e.key === "Backspace") {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(index);
              }
            }}
          />
        ))}
        <p>test</p>
      </div>
    </>
  );
}

export default App;
