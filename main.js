import { createElement, render } from "./Dinner-React/index.js";
import { useState } from "./Dinner-React/Dinner-render.js";

const container = document.getElementById("root");

const handleChange = (e) => {
  render(e.target.value);
};

const Counter = () => {
  const [state, setState] = useState(1);
  return createElement(
    "h1",
    { onclick: () => setState((prev) => prev + 1) },
    state
  );
};

const element = createElement(Counter);
render(element, container);
