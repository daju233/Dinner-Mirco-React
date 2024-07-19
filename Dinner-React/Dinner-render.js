//创建fiber的dom
function createDom(fiber) {
  console.log("createDom", fiber.type);
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
  return dom;
}

//渲染root
//Commit Phase
function commitRoot() {
  console.log("commitRoot", wipRoot);
  deletions.forEach((item) => commitWork(item));
  commitWork(wipRoot.child);
  // commit完成后，把wipRoot变为currentRoot
  currentRoot = wipRoot;
  console.log(currentRoot);
  wipRoot = null;
}

function render(element, container) {
  //Root Fiber
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };

  console.log("render", element, container, wipRoot);
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function commitWork(fiber) {
  console.log("commitWork", fiber);
  if (!fiber) {
    return;
  }
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "DELETION" && fiber.dom != null) {
    commitDeletion(fiber, domParent);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

let nextUnitOfWork = null;
// 正在进行的渲染
let wipRoot = null;
// 上次渲染
let currentRoot = null;
// 要删除的fiber
let deletions = null;

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] != next[key];
const isGone = (prev, next) => (key) => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  console.log("prev", prevProps, "next", nextProps);
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      //此处name应当是一个函数
      dom[name] = "";
    });
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}
//删除组件
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
    //为什么函数组件要向下查找？？？因为fiber节点里面存的是fiber对象.
    //fiber对象里有type(函数组件)和child，函数组件(实际应该说函数组件的fiber对象)本身没有dom。child里面才是真正的dom
  }
}

//启动渲染进程
function workLoop(deadline) {
  console.log("渲染进程，启动！", nextUnitOfWork);
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
  console.log("performUnitOfWork", fiber);
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  //返回子节点
  if (fiber.child) {
    console.log("fiber.child", fiber.child);
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

const updateHostComponent = (fiber) => {
  //创建fiber DOM
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  //添加fiber子节点
  const elements = fiber.props.children;
  reconclieChildren(fiber, elements);
};
let wipFiber = null;
let hookIndex = null;
// 处理函数式组件
const updateFunctionComponent = (fiber) => {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  console.log("fuctionComponent", fiber, children);
  reconclieChildren(fiber, children);
};

//useState Hook
//hook是什么？
export function useState(init) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : init,
    queue: [],
  };
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });
  const setState = (action) => {
    // 通知更新
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function reconclieChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  console.log(elements);
  //添加与fiber同一层的subling
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    const sameType = oldFiber && element && element.type == oldFiber.type;

    let newFiber = null;

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
      wipFiber.child = newFiber;
      console.log(wipFiber, wipFiber.child);
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

export default render;
