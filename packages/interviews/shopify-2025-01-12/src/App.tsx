import { useEffect } from "react";

function test() {
  console.log("test");
}

function App() {
  useEffect(() => {
    test();
  }, []);

  return (
    <div>
      <h1>Shopify interview</h1>
      <p>
        This is a test for the Shopify interview. It is a simple React app that displays a list of
        products.
      </p>
    </div>
  );
}

export default App;
