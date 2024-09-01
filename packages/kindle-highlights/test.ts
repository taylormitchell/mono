import { getDefinitions } from "./ai";

getDefinitions(["hello", "world"]).then((definitions) => {
  console.log(definitions);
});
