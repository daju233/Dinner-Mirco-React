import { createElement, render } from "./Dinner-React/index.js";

const container = document.getElementById("#root");
const App = (props) => {
  return createElement("h1", null, "Hi", props.name);
};

const element = createElement(App, { name: "Maxwell" });

render(element, container);
