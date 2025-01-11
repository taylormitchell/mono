import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

/**
 * How's the data stored?
 * do I have it in one big nested tree?
 * is it in a flat data structure?
 *
 * Let's say I've got it in a big object
 *
 *
 */

type File = {
  type: "file";
  name: string;
};

type Directory = {
  type: "directory";
  name: string;
  isOpen: boolean;
  children: (File | Directory)[];
};

const files: Directory = {
  type: "directory",
  name: "root",
  children: [
    {
      type: "directory",
      name: "public",
      isOpen: true,
      children: [
        {
          type: "directory",
          name: "images",
          isOpen: true,
          children: [],
        },
        {
          type: "file",
          name: "public_nested_file",
        },
      ],
    },
    {
      type: "directory",
      name: "src",
      isOpen: true,
      children: [
        {
          type: "directory",
          name: "components",
          isOpen: true,
          children: [],
        },
        {
          type: "file",
          name: "main.jsx",
        },
        {
          type: "file",
          name: "App.jsx",
        },
        {
          type: "file",
          name: "app.module.css",
        },
      ],
    },
    {
      type: "directory",
      name: "dist",
      isOpen: true,
      children: [
        {
          type: "file",
          name: "index.js",
        },
        {
          type: "file",
          name: "index.html",
        },
        {
          type: "file",
          name: "index.css",
        },
      ],
    },
    {
      type: "file",
      name: "package.json",
    },
    {
      type: "file",
      name: "package-lock.json",
    },
  ],
};

function App() {
  const [count, setCount] = useState(0);

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
    </>
  );
}

export default App;
