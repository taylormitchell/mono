import { useState } from "react";
import "./App.css";

const n = 9;
const cellSize = 40;

const grid = Array(n)
  .fill(0)
  .map((_, i) =>
    Array(n)
      .fill(0)
      .map((_, j) => ({
        x: j,
        y: i,
      }))
  );

const walls: { x: number; y: number; dir: "up" | "down" | "left" | "right" }[] = [
  { x: 5, y: 5, dir: "right" },
  { x: 2, y: 3, dir: "right" },
  { x: 7, y: 1, dir: "down" },
  { x: 4, y: 6, dir: "up" },
  { x: 1, y: 8, dir: "right" },
  { x: 6, y: 4, dir: "down" },
];

function App() {
  const [blackCell, setBlackCell] = useState<{
    x: number;
    y: number;
    dir: "up" | "down" | "left" | "right";
  }>({
    x: 0,
    y: 0,
    dir: "down",
  });

  return (
    <div>
      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
          gap: "2px",
        }}
      >
        {grid.flat().map((cell) => (
          <div
            key={`${cell.x}-${cell.y}`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor:
                cell.x === blackCell?.x && cell.y === blackCell?.y ? "black" : "white",
              border: "1px solid #ccc",
              position: "relative",
            }}
          >
            {walls
              .filter((wall) => wall.x === cell.x && wall.y === cell.y)
              .map((wall) => (
                <div
                  key={`${wall.x}-${wall.y}-${wall.dir}`}
                  style={{
                    position: "absolute",
                    width: "10px",
                    height: `${cellSize}px`,
                    zIndex: 90,
                    backgroundColor: "red",
                    ...(wall.dir === "up"
                      ? {
                          top: 0,
                          left: "50%",
                          transform: "translate(-50%, -50%) rotate(90deg)",
                        }
                      : wall.dir === "down"
                      ? {
                          bottom: 0,
                          left: "50%",
                          transform: "translate(-50%, 50%) rotate(90deg)",
                        }
                      : wall.dir === "right"
                      ? {
                          right: 0,
                          top: "50%",
                          transform: "translate(50%, -50%)",
                        }
                      : {}),
                  }}
                />
              ))}
            {cell.x === blackCell.x && cell.y === blackCell.y && (
              <div
                style={{
                  position: "absolute",
                  width: "10px",
                  height: "10px",
                  zIndex: 100,
                  backgroundColor: "black",
                  ...(blackCell.dir === "up" && {
                    top: 0,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }),
                  ...(blackCell.dir === "down" && {
                    bottom: 0,
                    left: "50%",
                    transform: "translate(-50%, 60%)",
                  }),
                  ...(blackCell.dir === "left" && {
                    left: 0,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }),
                  ...(blackCell.dir === "right" && {
                    right: 0,
                    top: "50%",
                    transform: "translate(50%, -50%)",
                  }),
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => {
            // Rotate clockwise
            setBlackCell((prev) => {
              const dirs = ["up", "right", "down", "left"] as const;
              const currentIndex = dirs.indexOf(prev.dir);
              const nextIndex = (currentIndex + 1) % dirs.length;
              return {
                ...prev,
                dir: dirs[nextIndex],
              };
            });
          }}
          style={{ marginRight: "10px" }}
        >
          Rotate Clockwise
        </button>

        <button
          onClick={() => {
            // Can't move through walls
            if (isWall(walls, blackCell)) return;
            setBlackCell((prev) => {
              const newCell = { ...prev };
              switch (prev.dir) {
                case "up":
                  if (prev.y > 0) newCell.y = prev.y - 1;
                  break;
                case "down":
                  if (prev.y < n - 1) newCell.y = prev.y + 1;
                  break;
                case "left":
                  if (prev.x > 0) newCell.x = prev.x - 1;
                  break;
                case "right":
                  if (prev.x < n - 1) newCell.x = prev.x + 1;
                  break;
              }
              return newCell;
            });
          }}
        >
          Move Forward
        </button>
      </div>
    </div>
  );
}

function isWall(
  walls: { x: number; y: number; dir: "up" | "down" | "left" | "right" }[],
  blackCell: { x: number; y: number; dir: "up" | "down" | "left" | "right" }
) {
  for (const wall of walls) {
    switch (blackCell.dir) {
      case "up":
        if (wall.x === blackCell.x && wall.y === blackCell.y && wall.dir === "up") {
          return true;
        }
        if (wall.x === blackCell.x && wall.y === blackCell.y - 1 && wall.dir === "down") {
          return true;
        }
        break;
      case "down":
        if (wall.x === blackCell.x && wall.y === blackCell.y && wall.dir === "down") {
          return true;
        }
        if (wall.x === blackCell.x && wall.y === blackCell.y + 1 && wall.dir === "up") {
          return true;
        }
        break;
      case "left":
        if (wall.x === blackCell.x && wall.y === blackCell.y && wall.dir === "left") {
          return true;
        }
        if (wall.x === blackCell.x - 1 && wall.y === blackCell.y && wall.dir === "right") {
          return true;
        }
        break;
      case "right":
        if (wall.x === blackCell.x && wall.y === blackCell.y && wall.dir === "right") {
          return true;
        }
        if (wall.x === blackCell.x + 1 && wall.y === blackCell.y && wall.dir === "left") {
          return true;
        }
        break;
    }
  }
  return false;
}

export default App;
