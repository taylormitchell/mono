# Calculator mini challenge

Requirements:
- only 2 values supported
- only 1 operator supported
- if you press = while only 1 value is present, you get nan
- -/+ toggles the left-most value
- operator buttons swap the current operator
- pressing operator does nothing if no first value is present



```ts

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


type Expression = 
  [Value] |
  [Value, Operator]
  [Value, Operator, Value]

type Value = { int: string, decimal?: string }

type Operator = "add" | "subtract" | "divide" | "multiply" | "equals"


const state: Expression


```