import "./style.css";
import Dinner from "./Dinner.js";

/** @jsx Didact.createElement */
const element = Dinner.createElement(
  "h1",
  { id: "title", style: "background:skyblue" },
  "Hello World",
  Dinner.createElement(
    "h2",
    { id: "hh2" },
    "fuckyou",
    Dinner.createElement("a", { href: "https://www.baidu.com" }, "百度")
  )
);
// const H1 = Dinner.createElement("h1", { id: "title" }, "Hello World");
Dinner.render(element, document.getElementById("root"));
