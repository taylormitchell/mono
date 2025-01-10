/**
 * # Calculator mini challenge
 * 
 * Requirements:
 * - only 2 values supported
 * - only 1 operator supported
 * - if you press = while only 1 value is present, you get nan
 * - -/+ toggles the left-most value
 * - operator buttons swap the current operator
 * - pressing operator does nothing if no first value is present
 * 
{ 
  type: "2 values",
  first: Value | null,
  second: Value | null,
  operator: Value | null,
} | {
  type: "1 value"
  first: Value | null,
  operator: Value | null: 
}

 */

export type Expression =
  | {
      type: "empty";
    }
  | {
      type: "one_value";
      first: Value;
    }
  | {
      type: "value_and_operator";
      first: Value;
      operator: Operator;
    }
  | {
      type: "value_and_operator_and_value";
      first: Value;
      operator: Operator;
      second: Value;
    };

export type Operator = "+" | "-" | "/" | "*";

export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Value = { type: "number"; value: string } | { type: "nan" };

export type Action =
  | { type: "add_digit"; value: Digit | "." }
  | { type: "add_operator"; value: Operator }
  | { type: "evaluate" };

function combine_values(value: Value, digit: Digit | "."): Value {
  if (value.type === "nan") {
    if (digit === ".") {
      return { type: "number", value: "0." };
    } else {
      return { type: "number", value: digit };
    }
  } else if (value.type === "number") {
    if (digit === ".") {
      return value.value.includes(".") ? value : { type: "number", value: value.value + "." };
    } else {
      return { type: "number", value: value.value + digit };
    }
  } else {
    return value satisfies never;
  }
}

export function update_state(state: Expression, action: Action): Expression {
  if (action.type === "add_digit") {
    if (state.type === "empty") {
      if (action.value === ".") {
        return { type: "one_value", first: { type: "number", value: "." } };
      } else {
        return { type: "one_value", first: { type: "number", value: action.value } };
      }
    } else if (state.type === "one_value") {
      return { type: "one_value", first: combine_values(state.first, action.value) };
    } else if (state.type === "value_and_operator") {
      return {
        type: "value_and_operator_and_value",
        first: state.first,
        operator: state.operator,
        second: { type: "number", value: action.value },
      };
    } else if (state.type === "value_and_operator_and_value") {
      return {
        type: "value_and_operator_and_value",
        first: state.first,
        operator: state.operator,
        second: combine_values(state.second, action.value),
      };
    } else {
      return state satisfies never;
    }
  } else if (action.type === "add_operator") {
    if (state.type === "empty") {
      return state;
    } else if (state.type === "one_value") {
      return { type: "value_and_operator", first: state.first, operator: action.value };
    } else if (state.type === "value_and_operator") {
      return {
        type: "value_and_operator",
        first: state.first,
        operator: action.value,
      };
    } else if (state.type === "value_and_operator_and_value") {
      return {
        type: "value_and_operator_and_value",
        first: state.first,
        operator: action.value,
        second: state.second,
      };
    } else {
      return state satisfies never;
    }
  } else if (action.type === "evaluate") {
    return evaluate_expression(state);
  } else {
    return action satisfies never;
  }
}

function value_to_string(value: Value) {
  if (value.type === "nan") {
    return "NaN";
  } else if (value.type === "number") {
    return value.value;
  }
  return value satisfies never;
}

export function state_to_string(state: Expression): string {
  if (state.type === "empty") {
    return "";
  } else if (state.type === "one_value") {
    return value_to_string(state.first);
  } else if (state.type === "value_and_operator") {
    return `${value_to_string(state.first)}${state.operator}`;
  } else if (state.type === "value_and_operator_and_value") {
    return `${value_to_string(state.first)}${state.operator}${value_to_string(state.second)}`;
  }
  return state satisfies never;
}

export function evaluate_expression(expression: Expression): Expression {
  if (expression.type === "empty") {
    return expression;
  } else if (expression.type === "one_value") {
    return expression;
  } else if (expression.type === "value_and_operator") {
    if (expression.operator === "+" || expression.operator === "-") {
      return { type: "one_value", first: { type: "nan" } };
    } else if (expression.operator === "*") {
      return { type: "one_value", first: expression.first };
    } else if (expression.operator === "/") {
      return { type: "one_value", first: { type: "nan" } }; // should be infinity
    } else {
      return expression.operator satisfies never;
    }
  } else if (expression.type === "value_and_operator_and_value") {
    const first_number = Number(value_to_string(expression.first));
    const second_number = Number(value_to_string(expression.second));
    const result =
      expression.operator === "+"
        ? first_number + second_number
        : expression.operator === "-"
        ? first_number - second_number
        : expression.operator === "*"
        ? first_number * second_number
        : expression.operator === "/"
        ? first_number / second_number
        : (expression.operator satisfies never);
    return {
      type: "one_value",
      first: isNaN(result) ? { type: "nan" } : { type: "number", value: result.toString() },
    };
  }
  return expression satisfies never;
}

const updates: { name: string; state: Expression; action: Action }[] = [
  // first value: "" -> press "1" -> "1"
  {
    name: "first value: '' -> press '1' -> '1'",
    state: { type: "empty" },
    action: { type: "add_digit", value: "1" },
  },
  // append digit: "1" -> press "2" -> "12"
  {
    name: "append digit: '1' -> press '2' -> '12'",
    state: { type: "one_value", first: { type: "number", value: "1" } },
    action: { type: "add_digit", value: "2" },
  },
  // add decimal: "1" -> press "." -> "1."
  {
    name: "add decimal: '1' -> press '.' -> '1.'",
    state: { type: "one_value", first: { type: "number", value: "1" } },
    action: { type: "add_digit", value: "." },
  },
  // append digit to decimal: "1.2" -> press "2" -> "1.23"
  {
    name: "append digit to decimal: '1.2' -> press '3' -> '1.23'",
    state: { type: "one_value", first: { type: "number", value: "1.2" } },
    action: { type: "add_digit", value: "3" },
  },
  // replace operator: "1+" -> press "-" -> "1-"
  {
    name: "replace operator: '1+' -> press '-' -> '1-'",
    state: { type: "value_and_operator", first: { type: "number", value: "1" }, operator: "+" },
    action: { type: "add_operator", value: "-" },
  },
  // evaluate: "123" -> press "=" -> "123"
  {
    name: "evaluate: '123' -> press '=' -> '123'",
    state: { type: "one_value", first: { type: "number", value: "123" } },
    action: { type: "evaluate" },
  },
  // evaluate: "1+1" -> press "=" -> "2"
  {
    name: "evaluate: '1+1' -> press '=' -> '2'",
    state: {
      type: "value_and_operator_and_value",
      first: { type: "number", value: "1" },
      operator: "+",
      second: { type: "number", value: "1" },
    },
    action: { type: "evaluate" },
  },
];

for (const { name, state, action } of updates) {
  const new_state = update_state(state, action);
  const new_state_string = state_to_string(new_state);
  console.log(name);
  console.log(new_state_string);
}
