import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createElement } from "react";
import "./App.css";

const ShopifyButtonElement = (props: React.HTMLAttributes<HTMLElement>) => {
  return createElement("shopify-button", props, props.children);
};

const ShopifyInputElement = (props: React.HTMLAttributes<HTMLElement>) => {
  return createElement("shopify-input", props, props.children);
};

function App() {
  return (
    <div>
      <div id="some-button" />
      <input id="some-input" />
      <SDK />
    </div>
  );
}

function SDK() {
  const [button, setButton] = useState<HTMLElement | null>(null);
  const [input, setInput] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setButton(document.querySelector("#some-button"));
    setInput(document.querySelector("#some-input"));
    return () => {
      setButton(null);
      setInput(null);
    };
  }, []);

  return (
    <>
      {button &&
        createPortal(<ShopifyButtonElement>This is a Shopify button</ShopifyButtonElement>, button)}
      {input &&
        createPortal(<ShopifyInputElement>This is a Shopify input</ShopifyInputElement>, input)}
    </>
  );
}

export default App;
