import { fetchDefinitions } from "./ai";

fetchDefinitions(["hello", "world"]).then((definitions) => {
  console.log(definitions);
});
