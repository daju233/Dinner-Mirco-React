import { createElement, render } from "./Dinner-React/index.js";

const container = document.getElementById("root");

const JonasApp = (props) => {
  return createElement(
    "p",
    null,
    props.name,
    createElement(MaxwellApp, { name: "Maxwell" })
  );
};
const MaxwellApp = (props) => {
  return createElement("h2", null, props.name);
};
const element2 = createElement(JonasApp, { name: "Jonas" });
console.log("渲染开始");
render(element2, container);
