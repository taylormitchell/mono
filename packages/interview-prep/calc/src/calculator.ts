export type State =
  | {
      type: "value";
      first: string;
    }
  | {
      type: "incomplete_expression";
      first: string;
      operator: "+" | "-" | "*" | "/";
    }
  | {
      type: "expression";
      first: string;
      operator: "+" | "-" | "*" | "/";
      second: string;
    };

export type Action =
  | {
      type: "evaluate";
    }
  | {
      type: "clear";
    }
  | {
      type: "add_digit";
      digit: string;
    }
  | {
      type: "add_operator";
      operator: "+" | "-" | "*" | "/";
    }
  | {
      type: "add_decimal";
    }
  | {
      type: "add_negative";
    };

export function update(state: State, action: Action): State {
  if (action.type === "evaluate") {
    if (state.type === "value") {
      return state;
    } else if (state.type === "incomplete_expression") {
      return { type: "value", first: "NaN" };
    } else if (state.type === "expression") {
      const result = eval(`${state.first} ${state.operator} ${state.second}`);
      return {
        type: "value",
        first: result.toString(),
      };
    } else {
      return state satisfies never;
    }
  } else if (action.type === "clear") {
    return {
      type: "value",
      first: "",
    };
  } else if (action.type === "add_digit") {
    if (state.type === "value") {
      return {
        type: "value",
        first: state.first + action.digit,
      };
    } else if (state.type === "incomplete_expression") {
      return {
        type: "expression",
        first: state.first,
        operator: state.operator,
        second: action.digit,
      };
    } else if (state.type === "expression") {
      return {
        type: "expression",
        first: state.first,
        operator: state.operator,
        second: state.second + action.digit,
      };
    } else {
      return state satisfies never;
    }
  } else if (action.type === "add_operator") {
    if (state.type === "value") {
      return {
        type: "incomplete_expression",
        first: state.first,
        operator: action.operator,
      };
    } else {
      return {
        ...state,
        operator: action.operator,
      };
    }
  } else if (action.type === "add_decimal") {
    if (state.type === "value") {
      if (state.first.includes(".")) {
        return state;
      } else {
        return {
          ...state,
          first: state.first + ".",
        };
      }
    } else if (state.type === "incomplete_expression") {
      return {
        type: "expression",
        first: state.first,
        operator: state.operator,
        second: ".",
      };
    } else if (state.type === "expression") {
      if (state.second.includes(".")) {
        return state;
      } else {
        return {
          ...state,
          second: state.second + ".0",
        };
      }
    } else {
      return state satisfies never;
    }
  } else if (action.type === "add_negative") {
    if (state.type === "value" || state.type === "incomplete_expression") {
      if (state.first.startsWith("-")) {
        return {
          ...state,
          first: state.first.slice(1),
        };
      } else {
        return {
          ...state,
          first: "-" + state.first,
        };
      }
    } else if (state.type === "expression") {
      if (state.second.startsWith("-")) {
        return {
          ...state,
          second: state.second.slice(1),
        };
      } else {
        return {
          ...state,
          second: "-" + state.second,
        };
      }
    } else {
      return state satisfies never;
    }
  }
  return action satisfies never;
}
