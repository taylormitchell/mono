import { useState } from "react";
import "./App.css";
import { State, Action, update } from "./calculator";

function state_to_string(state: State): string {
  return state.type === "value"
    ? state.first
    : state.type === "incomplete_expression"
    ? state.first + state.operator
    : state.first + state.operator + state.second;
}

function App() {
  const [state, setState] = useState<State>({ type: "value", first: "" });

  const dispatch = (action: Action) => {
    setState(update(state, action));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col gap-2 bg-white p-4 rounded-lg shadow-lg w-80">
        <div
          className="bg-gray-100 rounded text-right text-2xl p-2 font-mono h-[60px] overflow-y-auto flex items-center justify-end"
          ref={(el) => {
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          }}
        >
          <div className="text-right break-words w-full">{state_to_string(state)}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => dispatch({ type: "clear" })}
            className="col-span-2 bg-red-500 text-white p-4 rounded hover:bg-red-600"
          >
            Clear
          </button>
          <button
            onClick={() => dispatch({ type: "add_negative" })}
            className="bg-gray-200 p-4 rounded hover:bg-gray-300"
          >
            +/-
          </button>
          <button
            onClick={() => dispatch({ type: "add_operator", operator: "/" })}
            className="bg-orange-400 text-white p-4 rounded hover:bg-orange-500"
          >
            ÷
          </button>

          {[7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => dispatch({ type: "add_digit", digit: num.toString() })}
              className="bg-gray-200 p-4 rounded hover:bg-gray-300"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => dispatch({ type: "add_operator", operator: "*" })}
            className="bg-orange-400 text-white p-4 rounded hover:bg-orange-500"
          >
            ×
          </button>

          {[4, 5, 6].map((num) => (
            <button
              key={num}
              onClick={() => dispatch({ type: "add_digit", digit: num.toString() })}
              className="bg-gray-200 p-4 rounded hover:bg-gray-300"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => dispatch({ type: "add_operator", operator: "-" })}
            className="bg-orange-400 text-white p-4 rounded hover:bg-orange-500"
          >
            -
          </button>

          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => dispatch({ type: "add_digit", digit: num.toString() })}
              className="bg-gray-200 p-4 rounded hover:bg-gray-300"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => dispatch({ type: "add_operator", operator: "+" })}
            className="bg-orange-400 text-white p-4 rounded hover:bg-orange-500"
          >
            +
          </button>

          <button
            onClick={() => dispatch({ type: "add_digit", digit: "0" })}
            className="col-span-2 bg-gray-200 p-4 rounded hover:bg-gray-300"
          >
            0
          </button>
          <button
            onClick={() => dispatch({ type: "add_decimal" })}
            className="bg-gray-200 p-4 rounded hover:bg-gray-300"
          >
            .
          </button>
          <button
            onClick={() => dispatch({ type: "evaluate" })}
            className="bg-orange-400 text-white p-4 rounded hover:bg-orange-500"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
