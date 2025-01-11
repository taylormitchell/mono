import { useRef } from "react";
import "./App.css";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidth = 600;
  return (
    <div>
      <input
        type="range"
        min="100"
        max="600"
        defaultValue={defaultWidth}
        onChange={(e) => {
          const width = e.target.value;
          if (containerRef.current) {
            containerRef.current.style.width = `${width}px`;
          }
        }}
      />
      <div className="p-4 border" ref={containerRef} style={{ width: `${defaultWidth}px` }}>
        <form className="flex flex-wrap flex-end">
          <input className="bg-gray-200 min-w-16 is-24 grow" type="text" placeholder="Name" />
          <input className="bg-gray-200 min-w-16 basis-32 grow-2" type="text" placeholder="Name" />
          <input className="bg-blue-200 min-w-16 grow" type="submit" value="Subscribe" />
        </form>
      </div>
    </div>
  );
}

export default App;
