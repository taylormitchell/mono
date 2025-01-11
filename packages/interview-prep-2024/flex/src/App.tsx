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
      <div ref={containerRef} style={{ width: `${defaultWidth}px` }}>
        <form>
          <input className="bg-gray-200" type="text" placeholder="Name" />
          <input className="bg-gray-200" type="email" placeholder="Email Address" />
          <input className="bg-blue-200" type="submit" value="Subscribe" />
        </form>
      </div>
    </div>
  );
}

export default App;
