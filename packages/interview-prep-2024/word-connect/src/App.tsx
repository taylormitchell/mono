import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [groupSize, setGroupSize] = useState(3);
  const [itemCount, setItemCount] = useState(3);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
      <Config
        configs={[
          {
            name: "Group Size",
            value: groupSize,
            setValue: setGroupSize,
            min: 1,
            max: 10,
          },
          {
            name: "Item Count",
            value: itemCount,
            setValue: setItemCount,
            min: 1,
            max: 20,
          },
        ]}
      />
    </>
  );
}

function Config({
  configs,
}: {
  configs: {
    name: string;
    value: number;
    setValue: (value: number) => void;
    min: number;
    max: number;
  }[];
}) {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isOpen, setIsOpen] = useState(true); // Add toggle state
  const isHolding = useRef(false);

  useEffect(() => {
    const handleMouseUp = () => (isHolding.current = false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isHolding.current) {
        setPosition({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: position.y,
        left: position.x,
        fontSize: "0.7em",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
        backgroundColor: "black",
        padding: "10px",
        color: "white",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        minWidth: "150px", // Added to maintain consistent width
      }}
    >
      <div
        style={{
          cursor: "grab",
          display: "flex",
        }}
        onMouseDown={() => (isHolding.current = true)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag when clicking button
            setIsOpen(!isOpen);
          }}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "1.2em",
            transition: "transform 0.2s ease-in-out",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </button>
        <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
          <div>Configs</div>
        </div>
      </div>
      <div
        style={{
          maxHeight: isOpen ? "200px" : "0",
          overflow: "hidden",
          transition: "max-height 0.2s ease-in-out",
        }}
      >
        {configs.map((config) => (
          <ConfigItem key={config.name} {...config} />
        ))}
      </div>
    </div>
  );
}

function ConfigItem({
  name,
  value,
  setValue,
  min,
  max,
}: {
  name: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px" }}>
      <span style={{ minWidth: "100px" }}>{name}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ minWidth: "30px" }}>{value}</span>
    </div>
  );
}

export default App;
