import { useRef } from "react";
import "./App.css";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidth = 600;
  return (
    <div>
      <input
        type="range"
        min="200"
        max="600"
        defaultValue={defaultWidth}
        onChange={(e) => {
          const width = e.target.value;
          if (containerRef.current) {
            containerRef.current.style.width = `${width}px`;
          }
        }}
      />
      {/* <div
        className="p-4 border min-w-40"
        ref={containerRef}
        style={{ width: `${defaultWidth}px` }}
      >
        <form className="flex flex-wrap flex-end">
          <input className="bg-gray-200 w-32" type="text" placeholder="Name" />
          <input className="bg-gray-200 basis-16 w-32" type="text" placeholder="Name" />
          <input className="bg-blue-200 min-w-32" type="submit" value="Subscribe" />
        </form>
      </div> */}
      <div className="border border-black flex w-96">
        <div className="w-16 mr-auto h-16 bg-blue-200 border" />
        <div className="w-16 h-16 bg-blue-200 border" />
        <div className="w-16 h-16 bg-blue-200 border" />
      </div>
    </div>
  );
}

export default App;
