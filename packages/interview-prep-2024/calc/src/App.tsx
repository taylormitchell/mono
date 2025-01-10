import { useState } from "react";
import { Digit, Expression, Operator, state_to_string, update_state } from "./calculator";

function App() {
  const [state, setState] = useState<Expression>({ type: "empty" });

  const handleDigit = (digit: Digit | ".") => {
    setState((prevState) => update_state(prevState, { type: "add_digit", value: digit }));
  };

  const handleOperator = (operator: Operator) => {
    setState((prevState) => update_state(prevState, { type: "add_operator", value: operator }));
  };

  const handleEvaluate = () => {
    setState((prevState) => update_state(prevState, { type: "evaluate" }));
  };

  return (
    <div className="w-80 mx-auto mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
      <div className="h-16 bg-white p-4 mb-4 text-right text-2xl min-h-[4rem] border border-gray-200 rounded">
        {state_to_string(state)}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button text="1" onClick={() => handleDigit("1")} />
          <Button text="2" onClick={() => handleDigit("2")} />
          <Button text="3" onClick={() => handleDigit("3")} />
          <Button text="+" onClick={() => handleOperator("+")} />
        </div>
        <div className="flex gap-2">
          <Button text="4" onClick={() => handleDigit("4")} />
          <Button text="5" onClick={() => handleDigit("5")} />
          <Button text="6" onClick={() => handleDigit("6")} />
          <Button text="-" onClick={() => handleOperator("-")} />
        </div>
        <div className="flex gap-2">
          <Button text="7" onClick={() => handleDigit("7")} />
          <Button text="8" onClick={() => handleDigit("8")} />
          <Button text="9" onClick={() => handleDigit("9")} />
          <Button text="*" onClick={() => handleOperator("*")} />
        </div>
        <div className="flex gap-2">
          <Button text="0" onClick={() => handleDigit("0")} />
          <Button text="/" onClick={() => handleOperator("/")} />
          <Button text="=" onClick={handleEvaluate} />
          <Button text="clear" onClick={() => setState({ type: "empty" })} />
        </div>
      </div>
    </div>
  );
}

function Button({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-48 h-48 p-0 border border-gray-300 rounded bg-white hover:bg-gray-100 active:bg-gray-200"
    >
      {text}
    </button>
  );
}

export default App;
