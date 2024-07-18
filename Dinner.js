function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
//提交节点树
function commitRoot() {
  //TODO add notes to dom
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentFiber = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.dom, fiber.props);
  }
  // domParent.appendChild(fiber.dom);
  // commitWork(fiber.child);
  // commitWork(fiber.sibling);
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentFiber,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}
let nextUnitOfWork = null;
let currentFiber = null;
let wipRoot = null;
let deletions = null;

//创建fiber的dom
function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);
  //赋予属性
  Object.keys(fiber.props)
    .filter((key) => key !== "children")
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });
  //递归渲染子元素
  fiber.props.children.forEach((child) => render(child, dom));
  //追加到父节点
  container.appendChild(dom);
  return dom;
}

const isEvent = (key) => key.startWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] != next[key];
const isGone = (prev, next) => (key) => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
      //此处name应当是一个函数
      dom[name] = "";
    });

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
      dom[name] = nextProps[name];
    });
}

//启动渲染进程
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  //创建fiber DOM
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  //添加fiber子节点
  const elements = fiber.props.children;
  reconclieChildren(fiber, elements);

  //返回子节点
  if (fiber.child) {
    return fiber.child;
  }
  //无子节点则返回兄弟节点，无兄弟节点则返回父节点
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function reconclieChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  //添加与fiber同一层的subling
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    const newFiber = null;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      effectTag = "DELETION";
      deletions.push(oldFiber);
      //DELETE
    }

    if (oldFiber) {
      oldFiber = oldFiber.subling;
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}
const Dinner = {
  createElement,
  render,
};

export default Dinner;
