let TEMPLATE_COUNTER = 0;
const TEMPLATE_CACHE = new Map();
const COMPILER_TEMPLATE = document.createElement("template");
const GLOBAL_HANDLERS = {};

const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

const nodeProto = Node.prototype;
const elementProto = Element.prototype;
const characterDataProto = CharacterData.prototype;
const arrayProto = Array.prototype;

const objectHasOwnProperty = Object.prototype.hasOwnProperty;

const nodeCloneNode = nodeProto.cloneNode;
const nodeInsertBefore = nodeProto.insertBefore;
const nodeAppendChild = nodeProto.appendChild;
const nodeRemoveChild = nodeProto.removeChild;
const nodeSetTextContent = getDescriptor(nodeProto, "textContent").set;
const nodeGetFirstChild = getDescriptor(nodeProto, "firstChild").get;
const nodeGetNextSibling = getDescriptor(nodeProto, "nextSibling").get;
const nodeGetChildNodes = getDescriptor(nodeProto, "childNodes").get;

const elementSetClassName = getDescriptor(elementProto, "className").set;
const elementRemove = elementProto.remove;
const elementSetAttribute = elementProto.setAttribute;
const elementRemoveAttribute = elementProto.removeAttribute;

const htmlElementGetStyle = getDescriptor(HTMLElement.prototype, "style").get;

const characterDataSetData = getDescriptor(characterDataProto, "data").set;

const indexOf = arrayProto.indexOf;

let _depth = 0;
function _resetState() {
  _depth = 0;
}

export function _resetTemplateCounter() {
  TEMPLATE_COUNTER = 0;
}

// Getters/setters
function setContent(refs, v, vnode) {
  refs[this.instKey] = renderValue(
    v,
    refs[this.refKey],
    this.afterNodeFn(refs),
    this.flag,
    vnode,
  );
}

function updateContent(refs, v) {
  refs[this.instKey] = updateValue(
    v,
    refs[this.instKey],
    this.afterNodeFn(refs),
  );
}

function setClassname(refs, v) {
  if (v) elementSetClassName.call(refs[this.refKey], v);
}

function updateClassname(refs, v) {
  elementSetClassName.call(refs[this.refKey], v);
}

function setStyle(refs, v) {
  const style = htmlElementGetStyle.call(refs[this.refKey]);
  let key;
  for (key in v) {
    style.setProperty(key, v[key]);
  }
  refs[this.instKey] = v;
}

function updateStyle(refs, b) {
  const style = htmlElementGetStyle.call(refs[this.refKey]);
  const a = refs[this.instKey];
  let key;
  let bValue;
  let matchCount = 0;
  let i = 0;
  for (key in a) {
    const aValue = a[key];
    bValue =
      objectHasOwnProperty.call(b, key) === true
        ? (matchCount++, b[key])
        : void 0;
    if (aValue !== bValue) {
      if (bValue !== void 0) {
        style.setProperty(key, bValue);
      } else {
        style.removeProperty(key);
      }
    }
  }
  const keys = Object.keys(b);
  for (; matchCount < keys.length && i < keys.length; ++i) {
    key = keys[i];
    if (objectHasOwnProperty.call(a, key) === false) {
      ++matchCount;
      style.setProperty(key, b[key]);
    }
  }
  refs[this.instKey] = b;
}

function createAttributeSetter(key) {
  return function (refs, v) {
    if (!v) return;

    const node = refs[this.refKey];
    if (key in node) {
      node[key] = v;
    } else {
      elementSetAttribute.call(node, key, v);
    }
  };
}

function createAttributeUpdater(key) {
  return function (refs, v) {
    const node = refs[this.refKey];
    if (key in node) {
      node[key] = v;
    } else if (v === false) {
      elementRemoveAttribute.call(node, key);
    } else {
      elementSetAttribute.call(node, key, v);
    }
  };
}

// Compiler
function getWalkNode() {
  return {
    getRef: null,
    refKey: null,
    prevKey: null,
  };
}

function getArgNode() {
  return {
    flag: 0,
    refKey: null,
    afterKey: null,
    instKey: null,
    propIdx: null,
    applyData: null,
    updateData: null,
    afterNodeFn: null,
    prevRef: null,
    type: null,
    path: null,
  };
}

function foldStaticTrees(ways, activeIdx) {
  let result = [];

  ways.forEach((w, idx) => {
    if (activeIdx[w.refKey] !== undefined) {
      result.push(w);

      if (idx > 0) {
        idx--;
        let targetKey = w.prevKey;
        while (1) {
          const n = ways[idx];
          if (n.refKey === targetKey) {
            result.push(n);
            targetKey = n.prevKey;
          }
          if (idx === 0) break;
          idx--;
        }
      }
    }
  });

  result = [...new Set(result)].sort((a, b) =>
    a.prevKey > b.prevKey ? 1 : a.prevKey === b.prevKey ? 0 : -1,
  );

  return result;
}

function correctIndices(ways, args, events, insertionPoints) {
  const idxMap = {
    0: 0,
  };

  let nextIdx = 1;

  ways.forEach(w => {
    w.prevKey = idxMap[w.prevKey];
    w.refKey = idxMap[w.refKey] = nextIdx++;
  });

  args.forEach(a => {
    a.refKey = idxMap[a.refKey];
    a.instKey = idxMap[a.instKey] = nextIdx++;
  });
  args.forEach(a => {
    if (a.afterKey !== null) a.afterKey = idxMap[a.afterKey];
  });

  events.map(e => {
    e.prevRef = idxMap[e.prevRef];
    e.refKey = nextIdx++;
  });

  const insertionPointsClone = insertionPoints.slice();

  insertionPoints.splice(0, insertionPoints.length);

  insertionPointsClone.forEach((points, insertionIdx) => {
    insertionPoints.push({
      refIdx: idxMap[insertionIdx],
      points: points.map(point => {
        point.instKey = idxMap[point.instKey];
        return point;
      }),
    });
  });

  args.forEach(a => {
    if (a.afterNodeFn === afterNodeInstance) {
      const keys = [a.afterKey];
      let instArg = a;
      while (instArg.afterNodeFn === afterNodeInstance) {
        const afterInst = args.find(arg => arg.instKey === instArg.afterKey);
        keys.push(afterInst.afterKey);
        instArg = afterInst;
      }
      a.afterKey = keys;
    }
  });

  return nextIdx;
}

function getProducer(size) {
  return () => Array(size);
}

function afterNodeDefault(refs) {
  return refs[this.afterKey];
}

function afterNodeInstance(refs) {
  let i = 0;
  const len = this.afterKey.length;
  let result;
  while (i < len) {
    const next = refs[this.afterKey[i++]];
    if (next) {
      if (i === len) {
        result = next;
      } else {
        result = getDomNode(next);
      }
    }
    if (result) break;
  }
  return result;
}

function afterNodeNoop() {
  return null;
}

function compileTemplate(strings) {
  let instanceIdx = 0;

  let insideTag = false;
  const html = strings
    .map(s => {
      const result = s.replace(/[\w-]+=$/, "");
      const trimmed = result.trim();
      let output;
      if (trimmed.length > 0 && !insideTag && !trimmed.match(/^(<\/?|\/?>)/)) {
        output = `<!-- -->${result}`;
      } else {
        output = result;
      }
      const openTags = trimmed.match(/</g);
      const closedTags = trimmed.match(/>/g);
      const flip =
        (openTags ? openTags.length : 0) !==
        (closedTags ? closedTags.length : 0);
      if (flip) insideTag = !insideTag;
      return output;
    })
    .join("")
    .replace(/\n\s+(\w+=)/g, " $1")
    .replace(/\n\s+/g, "")
    .replace(/\n/g, "")
    .replace(/>\s+</g, "><")
    .replace(/(\w+"?)\s+(\w+=)/g, "$1 $2")
    .replace(/(\w+"?)\s+(\/?>)/g, "$1$2")
    .trim();
  COMPILER_TEMPLATE.innerHTML = html;

  let ways = [];
  const argsWays = [];
  const events = [];
  const stack = [];
  const lastIdx = strings.length - 1;
  const activeWayNodes = {};
  const insertionPoints = [];

  const getStackInfo = (ref, prev) => ({
    staticsBefore: 0,
    parentRef: ref,
    lastRef: ref,
    lastDataRef: prev.lastDataRef,
    eventsPath: prev.eventsPath,
    fullPath: prev.fullPath,
  });

  let goBack = false,
    nextContentKey = null,
    stackInfo = getStackInfo(null, {
      lastDataRef: null,
      eventsPath: "",
      fullPath: "",
    }),
    nextNode = null;

  // Append <p /> to non DOM nodes,
  // to help compiler detect such content
  const process = str => {
    str = str.trim();

    const terms = str.split(/(<\/?[\w|\s]+\/?>)/g);

    terms.unshift(...terms.shift().split(/^(\/?>)/g));
    terms.push(...terms.pop().split(/(<\w.*)$/g));
    return terms
      .map(v => {
        if (v.match(/<|>/g)) return v;
        if (v.match(/\w+=$/g)) return v;
        return v.trim().length > 0 ? `${v}<p />` : v;
      })
      .join("");
  };

  insideTag = false;

  strings.forEach((str, idx) => {
    str = process(str);

    const strLen = str.length;

    const attr = str.match(/(\S+)=$/);

    let commands = str.match(/<\/?|[\/-]>/g);

    let removeScheduled = false;
    if (strLen > 0 && !attr && !insideTag && !str.match(/^(<\/?|\/?>)/)) {
      removeScheduled = true;
    }

    if (commands !== null) {
      if (idx === lastIdx) commands = [commands[0]];

      for (let cmd of commands) {
        if (cmd.length === 2) {
          // Close tag
          stackInfo = stack.shift();
          goBack = true;
        } else {
          // Open tag
          nextNode = getWalkNode();
          nextNode.refKey = instanceIdx++;
          nextNode.getRef =
            goBack === true ? nodeGetNextSibling : nodeGetFirstChild;
          nextNode.prevKey = stackInfo.lastRef;

          if (ways.length > 0) {
            const next = goBack === true ? "0" : "1";
            stackInfo.eventsPath += next;
            stackInfo.fullPath += next;
          }

          if (removeScheduled) {
            const toRemovePath = stackInfo.fullPath.split("").map(Number);
            const commentNode = tracebackReference(
              toRemovePath,
              COMPILER_TEMPLATE.content.firstChild,
            );
            const parent = commentNode.parentNode;
            parent.removeChild(commentNode);
            removeScheduled = false;
          }

          if (nextNode.refKey === nextContentKey) {
            activeWayNodes[nextNode.refKey] = 1;

            stackInfo.lastDataRef = nextNode.refKey;
            stackInfo.eventsPath = "";

            nextContentKey = null;
          }

          if (ways.length === 0) {
            stackInfo.lastDataRef = nextNode.refKey;
          }
          ways.push(nextNode);

          stackInfo.staticsBefore++;
          stackInfo.lastRef = nextNode.refKey;

          stack.unshift(stackInfo);
          stackInfo = getStackInfo(nextNode.refKey, stackInfo);

          goBack = false;
        }
      }
    }

    if (idx !== lastIdx) {
      const nextArgNode = getArgNode();
      nextArgNode.propIdx = idx + 1;
      nextArgNode.refKey = stackInfo.lastRef;

      let skipArg = false;
      if (attr !== null) {
        const attrName = attr[1];
        if (attrName[0] === "o" && attrName[1] === "n") {
          skipArg = true;
          nextArgNode.type = attrName.slice(2);

          nextArgNode.prevRef = stackInfo.lastDataRef;
          nextArgNode.path = stackInfo.eventsPath.split("").map(Number);

          events.push(nextArgNode);

          setupGlobalHandler(nextArgNode.type);
        } else {
          activeWayNodes[nextNode.refKey] = 1;
          stackInfo.lastDataRef = stackInfo.lastRef;
          stackInfo.eventsPath = "";

          const prevStack = stack[0];
          prevStack.lastDataRef = stackInfo.lastDataRef;
          prevStack.eventsPath = stackInfo.eventsPath;
          switch (attrName) {
            case "class":
              nextArgNode.applyData = setClassname;
              nextArgNode.updateData = updateClassname;
              break;
            case "style":
              nextArgNode.applyData = setStyle;
              nextArgNode.updateData = updateStyle;
              break;
            default:
              nextArgNode.applyData = createAttributeSetter(attrName);
              nextArgNode.updateData = createAttributeUpdater(attrName);
              break;
          }
        }
      } else {
        const { parentRef } = stackInfo;
        nextArgNode.refKey = parentRef;
        nextArgNode.instKey = instanceIdx++;
        nextArgNode.applyData = setContent;
        nextArgNode.updateData = updateContent;

        insertionPoints[parentRef] = insertionPoints[parentRef] || [];

        insertionPoints[parentRef].push({
          staticElemsBefore: stackInfo.staticsBefore,
          instKey: nextArgNode.instKey,
          propIdx: nextArgNode.propIdx,
        });

        stackInfo.staticsBefore = 0;

        // Look for afterKey
        const nextIdx = idx + 1;
        const nextStr = strings[nextIdx].trim();
        const hasNextStaticSibling =
          nextStr.match(/^<\w/g) !== null ||
          (nextStr.length > 0 && nextStr[0] !== "<");
        const hasNextDynamicSibling = nextIdx !== lastIdx && nextStr === "";
        const hasNextSibling = hasNextStaticSibling || hasNextDynamicSibling;

        if (hasNextSibling) {
          nextArgNode.flag |= 2;
          nextContentKey = nextArgNode.afterKey = instanceIdx;
          nextArgNode.afterNodeFn = hasNextStaticSibling
            ? afterNodeDefault
            : afterNodeInstance;
        } else {
          nextArgNode.afterNodeFn = afterNodeNoop;
        }

        const hasPrevStaticSibling = goBack === true;
        const hasPrevDynamicSibling = str === "" && idx > 0;
        const hasPrevSibling = hasPrevStaticSibling || hasPrevDynamicSibling;
        if (hasPrevSibling) nextArgNode.flag |= 2;

        activeWayNodes[parentRef] = 1;

        stackInfo.lastDataRef = parentRef;
        stackInfo.eventsPath = "";

        const prevStack = stack[0];
        prevStack.lastDataRef = stackInfo.lastDataRef;
        prevStack.eventsPath = stackInfo.eventsPath;
      }

      if (!skipArg) argsWays.push(nextArgNode);
    }

    const openTags = str.match(/</g);
    const closedTags = str.match(/>/g);
    const flip =
      (openTags ? openTags.length : 0) !== (closedTags ? closedTags.length : 0);
    if (flip) insideTag = !insideTag;
  });

  ways = foldStaticTrees(ways.slice(1), activeWayNodes);

  const size = COMPILER_TEMPLATE.content.childNodes.length;
  const refsSize = correctIndices(ways, argsWays, events, insertionPoints);
  const producer = getProducer(refsSize);

  const unmountPoints = insertionPoints.reduce(
    (acc, v) => [...acc, ...v.points],
    [],
  );

  // Used in type detection to differ templates from each other
  let type = 8 | (TEMPLATE_COUNTER++ << 6);

  let templateNode;
  if (size !== 1) {
    templateNode = nodeCloneNode.call(COMPILER_TEMPLATE.content, true);
    type |= 16;
  } else {
    templateNode = COMPILER_TEMPLATE.content.firstChild;
  }

  return {
    ways,
    events,
    argsWays,
    producer,
    templateNode,
    size,
    insertionPoints,
    unmountPoints,
    type,
  };
}

function getTemplate(strings) {
  return (
    TEMPLATE_CACHE.get(strings) ||
    (TEMPLATE_CACHE.set(strings, compileTemplate(strings)) &&
      TEMPLATE_CACHE.get(strings))
  );
}

export function html() {
  arguments.t = 4;
  arguments.p = getTemplate(arguments[0]);
  return arguments;
}

// Virtual Nodes

const createTextVirtualNode = () => ({
  t: 1,
  n: undefined, // text node
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
});

const createArrayVirtualNode = () => ({
  t: 2,
  n: undefined, // nodes
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
});

const createTemplateVirtualNode = () => ({
  t: 4,
  k: undefined, // key
  p: undefined, // props
  r: undefined, // refs
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
});

const createFragmentVirtualNode = () => ({
  t: 8,
  k: undefined, // key
  p: undefined, // props
  r: undefined, // refs
  z: undefined, // roots
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
});

const createComponentVirtualNode = () => ({
  t: 16,
  k: undefined, // key
  c: undefined, // props
  n: undefined, // init
  v: undefined, // render
  u: undefined, // unmount,
  q: undefined, // children
  d: _depth, // depth
  f: 0, // flags
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
});

function renderValue(props, parent, afterNode, notSingleNode, parentVnode) {
  let vnode;
  if (typeof props === "object") {
    if (props instanceof Array) {
      vnode = createArrayVirtualNode();
      vnode.x = parentVnode;
      vnode.w = parent;
      vnode.g = notSingleNode;

      vnode.n = props.map(function (props) {
        return renderValue(props, parent, afterNode, 2, vnode);
      });
    } else if ((props.t & 16) !== 0) {
      vnode = createComponentVirtualNode();
      vnode.x = parentVnode;
      vnode.w = parent;
      vnode.g = notSingleNode;

      vnode.k = props.k;
      vnode.c = props.p;

      const init = props.n;
      vnode.n = init;

      const render = init(vnode);
      vnode.v = render;

      const view = render(props.p);

      const currentDepth = _depth;
      _depth = currentDepth + 1;
      vnode.q = renderValue(view, parent, afterNode, notSingleNode, vnode);
      _depth = currentDepth;
    } else if ((props.t & 4) !== 0) {
      const templateInstance = props.p;

      const { type, templateNode, ways, argsWays, producer } = templateInstance;

      const tNode = nodeCloneNode.call(templateNode, true);

      const refs = producer();

      if ((type & 16) !== 0) {
        vnode = createFragmentVirtualNode();

        const nodes = Array.from(nodeGetChildNodes.call(tNode));
        vnode.z = nodes;

        refs[0] = nodes[0];
      } else {
        vnode = createTemplateVirtualNode();

        refs[0] = tNode;
      }

      vnode.x = parentVnode;
      vnode.w = parent;
      vnode.g = notSingleNode;
      vnode.p = props;
      vnode.r = refs;

      for (let w of ways) refs[w.refKey] = w.getRef.call(refs[w.prevKey]);
      for (let a of argsWays) a.applyData(refs, props[a.propIdx], vnode);

      if (afterNode) {
        nodeInsertBefore.call(parent, tNode, afterNode);
      } else {
        nodeAppendChild.call(parent, tNode);
      }
    }
  } else {
    vnode = createTextVirtualNode();
    vnode.x = parentVnode;
    vnode.w = parent;
    vnode.g = notSingleNode;

    if ((notSingleNode & 2) !== 0) {
      const node = document.createTextNode(props);
      vnode.n = node;
      nodeInsertBefore.call(parent, node, afterNode);
    } else {
      nodeSetTextContent.call(parent, props);
      vnode.n = nodeGetFirstChild.call(parent);
    }
  }
  return vnode;
}

function unmountWalk(vnode) {
  const { t } = vnode;

  if ((t & 1) !== 0) {
  } else if ((t & 2) !== 0) {
    vnode.n.forEach(unmountWalk);
  } else if ((t & 16) !== 0) {
    unmountWalk(vnode.q);

    if (vnode.u !== undefined) {
      const unmount = vnode.u;
      if (typeof unmount === "function") {
        unmount();
      } else {
        for (const hook of unmount) {
          hook();
        }
      }
    }
    vnode.f = 4;
  } else {
    const refs = vnode.r;
    const template = vnode.p.p;

    const { unmountPoints } = template;
    for (const point of unmountPoints) {
      unmountWalk(refs[point.instKey]);
    }
  }
}

function _removeVNode(vnode) {
  const { t } = vnode;

  if ((t & 1) !== 0) {
    if (vnode.n) {
      const parent = vnode.n.parent;
      nodeRemoveChild.call(parent, vnode.n);
    }
  } else if ((t & 2) !== 0) {
    vnode.n.forEach(_removeVNode);
  } else if ((t & 16) !== 0) {
    _removeVNode(vnode.q);
  } else if ((t & 8) !== 0) {
    vnode.z.forEach(n => elementRemove.call(n));
  } else {
    elementRemove.call(vnode.r[0]);
  }
}

function removeVNode(vnode) {
  unmountWalk(vnode);
  _removeVNode(vnode);
}

function updateValue(b, vnode, afterNode) {
  const prevType = vnode.t;
  const parent = vnode.w;
  const notSingleNode = vnode.g;

  if ((prevType & 1) !== 0) {
    if (typeof b !== "object") {
      characterDataSetData.call(vnode.n, b);
    } else {
      if (vnode.n) nodeRemoveChild.call(parent, vnode.n);
      vnode = renderValue(b, parent, afterNode, notSingleNode, vnode.x);
    }
  } else if ((prevType & 2) !== 0) {
    const nodes = vnode.n;
    if (b instanceof Array) {
      if (b.length === 0) {
        if (nodes.length > 0) {
          if ((notSingleNode & 2) !== 0) {
            nodes.forEach(removeVNode);
          } else {
            nodes.forEach(unmountWalk);
            nodeSetTextContent.call(parent, "");
          }
          vnode.n = [];
        }
      } else if (nodes.length === 0) {
        vnode.n = b.map(function (props) {
          return renderValue(props, parent, afterNode, 2, vnode);
        });
      } else {
        vnode.n = updateArray(b, afterNode, vnode);
      }
    } else {
      if ((notSingleNode & 2) !== 0) {
        nodes.forEach(removeVNode);
      } else {
        nodes.forEach(unmountWalk);
        nodeSetTextContent.call(parent, "");
      }
      vnode = renderValue(b, parent, afterNode, notSingleNode, vnode.x);
    }
  } else if ((prevType & 16) !== 0) {
    if (typeof b === "object" && (b.t & 16) !== 0 && b.n === vnode.n) {
      if (b.p !== vnode.c) {
        vnode.c = b.p;

        const currentDepth = vnode.d;
        _depth = currentDepth + 1;
        vnode.q = updateValue(vnode.v(b.p), vnode.q, afterNode);
        _depth = currentDepth;

        vnode.f = 0;
      }
    } else {
      removeVNode(vnode);
      vnode = renderValue(b, parent, afterNode, notSingleNode, vnode.x);
    }
  } else {
    // Template or Fragment
    if (
      typeof b === "object" &&
      (b.t & 4) !== 0 &&
      b.p.type === vnode.p.p.type
    ) {
      const prev = vnode.p;
      const refs = vnode.r;
      for (let a of prev.p.argsWays) {
        if (prev[a.propIdx] !== b[a.propIdx]) {
          a.updateData(refs, b[a.propIdx]);
        }
      }
      vnode.p = b;
    } else {
      removeVNode(vnode);
      vnode = renderValue(b, parent, afterNode, notSingleNode, vnode.x);
    }
  }

  return vnode;
}

export function render(component, container) {
  _resetState();

  let inst = container.$INST;
  if (inst !== undefined) {
    inst.c = updateValue(component, inst.c, null);
  } else {
    nodeSetTextContent.call(container, "");
    const vnode = renderValue(component, container, null, 0, null);
    inst = { c: vnode };
    container.$INST = inst;
  }
}

// Events
function tracebackReference(path, root) {
  if (path.length === 0) return root;

  let result = root;
  for (let p of path)
    result =
      p === 0
        ? nodeGetNextSibling.call(result)
        : nodeGetFirstChild.call(result);

  return result;
}

function findNodeInstance(insertions, nodeIndex, refs) {
  let nodeInstance = null,
    shift = 0;

  outer: for (let insertionEl of insertions) {
    shift += insertionEl.staticElemsBefore;

    const inst = refs[insertionEl.instKey];
    const { t } = inst;

    if ((t & 1) !== 0) {
      if (nodeIndex === shift) {
        nodeInstance = inst;
        break;
      } else {
        shift++;
      }
    } else if ((t & 2) !== 0) {
      const nodes = inst.n;
      let node;
      for (node of nodes) {
        const size = getVNodeSize(node);
        if (nodeIndex <= size - 1 + shift) {
          nodeInstance = node;
          break outer;
        } else {
          shift += size;
        }
      }
    } else if ((t & 16) !== 0) {
      const size = getVNodeSize(inst);
      if (nodeIndex <= size - 1 + shift) {
        nodeInstance = inst;
        break;
      } else {
        shift += size;
      }
    } else if ((t & 8) !== 0) {
      const size = inst.z.length;
      if (nodeIndex <= size - 1 + shift) {
        nodeInstance = inst;
        break;
      } else {
        shift += size;
      }
    } else {
      if (nodeIndex === shift) {
        nodeInstance = inst;
        break;
      } else {
        shift++;
      }
    }
  }

  return nodeInstance;
}

function getVNodeSize(vnode) {
  let size = 0;
  const { t } = vnode;
  if ((t & 1) !== 0) {
    size = 1;
  } else if ((t & 2) !== 0) {
    const nodes = vnode.n;
    let node;
    for (node of nodes) {
      size += getVNodeSize(node);
    }
  } else if ((t & 16) !== 0) {
    size = getVNodeSize(vnode.q);
  } else if ((t & 8) !== 0) {
    size = vnode.z.length;
  } else {
    size = 1;
  }
  return size;
}

function findEventTarget(vnode, event, targets, parent) {
  let handled = false;

  const { t } = vnode;
  if ((t & 1) !== 0) {
  } else if ((t & 2) !== 0) {
    const nodeIdx = indexOf.call(nodeGetChildNodes.call(parent), targets[1]);
    const nodes = vnode.n;
    let shift = 0;
    let node;
    let nodeInstance;
    for (node of nodes) {
      const size = getVNodeSize(node);
      if (nodeIdx <= size - 1 + shift) {
        nodeInstance = node;
        break;
      } else {
        shift += size;
      }
    }
    if (nodeInstance) {
      handled = findEventTarget(nodeInstance, event, targets, parent);
    }
  } else if ((t & 16) !== 0) {
    handled = findEventTarget(vnode.q, event, targets, parent);
  } else {
    // Template or Fragment
    const { p: props, r: refs } = vnode;
    const { events, insertionPoints } = props.p;

    events.forEach(e => {
      if (refs[e.refKey] === undefined) {
        refs[e.refKey] = tracebackReference(e.path, refs[e.prevRef]);
      }
    });

    const eventsRefs = events.map(({ refKey }) => refs[refKey]);
    const insertionRefs = insertionPoints.map(({ refIdx }) => refs[refIdx]);

    let idx = 0;
    for (let target of targets) {
      const i1 = eventsRefs.indexOf(target);
      if (i1 >= 0) {
        const eventName = event.type;

        // Multiple handlers can be attached to one node
        eventsRefs.forEach((r, i) => {
          if (r === target) {
            const ev = events[i];
            if (ev.type === eventName) {
              props[ev.propIdx](event);
              handled = true;
            }
          }
        });
      }

      if (handled === false) {
        const i2 = insertionRefs.indexOf(target);

        if (i2 >= 0) {
          const nodeIdx = indexOf.call(
            nodeGetChildNodes.call(insertionRefs[i2]),
            targets[idx + 1],
          );

          const inst = findNodeInstance(
            insertionPoints[i2].points,
            nodeIdx,
            refs,
          );
          if (inst !== null) {
            handled = findEventTarget(
              inst,
              event,
              targets.slice(idx),
              insertionRefs[i2],
            );
          }
        }
      }

      if (handled === true) break;
      idx++;
    }
  }

  return handled;
}

function globalEventHandler(event) {
  let targets = [];
  let node = event.target;
  while (1) {
    const nodeInstance = node.$INST;

    if (nodeInstance !== undefined) {
      findEventTarget(nodeInstance.c, event, targets.reverse(), node);
      targets = [];
    }
    if (node.parentNode === null) break;
    targets.push(node);
    node = node.parentNode;
  }
}

function setupGlobalHandler(name) {
  if (GLOBAL_HANDLERS[name] === 1) return;
  document.addEventListener(name, globalEventHandler, true);
  GLOBAL_HANDLERS[name] = 1;
}

function getDomNode(vnode) {
  const { t } = vnode;
  if ((t & 1) !== 0) {
    return vnode.n;
  } else if ((t & 2) !== 0) {
    const first = vnode.n[0];
    if (first) return getDomNode(first);
  } else if ((t & 16) !== 0) {
    return getDomNode(vnode.q);
  } else if ((t & 8) !== 0) {
    return vnode.z[0];
  } else {
    return vnode.r[0];
  }
}

function nativeInsert(node, parent, afterNode) {
  if (afterNode) {
    nodeInsertBefore.call(parent, node, afterNode);
  } else {
    nodeAppendChild.call(parent, node);
  }
}

function insertVNode(vnode, parent, afterNode) {
  const { t } = vnode;
  if ((t & 1) !== 0) {
    nativeInsert(vnode.n, parent, afterNode);
  } else if ((t & 2) !== 0) {
    vnode.n.forEach(n => insertVNode(n, parent, afterNode));
  } else if ((t & 16) !== 0) {
    insertVNode(vnode.q, parent, afterNode);
  } else if ((t & 8) !== 0) {
    vnode.z.forEach(n => nativeInsert(n, parent, afterNode));
  } else {
    nativeInsert(vnode.r[0], parent, afterNode);
  }
}

function updateArray(newArray, afterNode, vnode) {
  const nodes = vnode.n;
  const parent = vnode.w;
  const notSingleNode = vnode.g;

  let newNodes = nodes.slice();

  let a1 = 0,
    b1 = 0,
    a2 = nodes.length - 1,
    b2 = newArray.length - 1,
    loop = true,
    a,
    b;

  fixes: while (loop) {
    loop = false;

    // Skip prefix
    a = nodes[a1];
    b = newArray[b1];
    while (a.k === b.k) {
      a = updateValue(b, a, afterNode);
      newNodes[b1] = a;
      a1++;
      b1++;
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a1];
      b = newArray[b1];
    }

    // Skip suffix
    a = nodes[a2];
    b = newArray[b2];
    while (a.k === b.k) {
      a = updateValue(b, a, afterNode);
      newNodes[b2] = a;
      a2--;
      b2--;
      afterNode = getDomNode(a);
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a2];
      b = newArray[b2];
    }

    // Fast path for symmetric swap or reverse
    while (nodes[a1].k === newArray[b2].k && nodes[a2].k === newArray[b1].k) {
      loop = true;
      a = nodes[a2];
      b = newArray[b1];
      let n = updateValue(b, a, afterNode);
      insertVNode(n, parent, getDomNode(nodes[a1]));
      newNodes[b1] = n;
      a = nodes[a1];
      b = newArray[b2];
      n = updateValue(b, a, afterNode);
      insertVNode(n, parent, afterNode);
      newNodes[b2] = n;
      a1++;
      b1++;
      a2--;
      b2--;
      afterNode = getDomNode(n);
      if (a2 < a1 || b2 < b1) break fixes;
    }
  }

  if (a1 > a2) {
    // Grow
    if (b1 <= b2) {
      newNodes.length = newArray.length;
      while (1) {
        newNodes[b1] = renderValue(newArray[b1], parent, afterNode, 2, vnode);
        if (b1 === b2) break;
        b1++;
      }
    }
  } else if (b1 > b2) {
    // Shrink
    newNodes.length = newArray.length;
    while (1) {
      removeVNode(nodes[a2]);
      if (a2 === a1) break;
      a2--;
    }
  } else {
    // Positions newIndex -> oldIndex
    const P = new Array(b2 + 1);
    // Index key -> newIndex
    const I = {};

    for (let i = b1; i <= b2; i++) {
      const item = newArray[i];
      const key = item.k;
      I[key] = i;
      P[i] = -1;
    }

    let reusingNodes = 0,
      toRemove = [];
    for (let i = a1; i <= a2; i++) {
      const n = nodes[i];
      const key = n.k;
      if (I[key] !== undefined) {
        P[I[key]] = i;
        reusingNodes++;
      } else {
        toRemove.push(n);
      }
    }

    if (reusingNodes === 0) {
      // Full replace
      if ((notSingleNode & 2) !== 0) {
        nodes.forEach(removeVNode);
      } else {
        nodes.forEach(unmountWalk);
        nodeSetTextContent.call(parent, "");
      }

      newNodes = newArray.map(function (props) {
        return renderValue(props, parent, afterNode, 2, vnode);
      });
    } else {
      toRemove.forEach(removeVNode);

      const lisIndices = longestPositiveIncreasingSubsequence(P, b1);

      let lisIdx = lisIndices.length - 1;
      for (let i = b2; i >= b1; i--) {
        if (lisIndices[lisIdx] === i) {
          const c1 = P[lisIndices[lisIdx]];
          let n = nodes[c1];
          const b = newArray[i];
          n = updateValue(b, n, afterNode);
          afterNode = getDomNode(n);
          newNodes[i] = n;

          lisIdx--;
        } else {
          let n;
          if (P[i] === -1) {
            n = renderValue(newArray[i], parent, afterNode, 2, vnode);
          } else {
            n = updateValue(newArray[i], nodes[P[i]], afterNode);
            insertVNode(n, parent, afterNode);
          }

          newNodes[i] = n;
          afterNode = getDomNode(n);
        }
      }

      newNodes.length = newArray.length;
    }
  }

  return newNodes;
}

function longestPositiveIncreasingSubsequence(list, startIdx) {
  // Two parallel arrays
  // where Elements contains elements of current subsequence
  //   and Indices has corresponding indices of these elements from list
  const currentSeqElements = [],
    currentSeqIndices = [];

  const len = list.length;

  // Linked indices list
  // It's map of original list
  // where each idx points to prev element in its subsequence
  // Example: [ 7, 8, 3, 4, 5, 6, 1, 2 ]
  //             \     \  \  \      \
  // heads:   [ _, 0, _, 2, 3, 4, _, 6 ]
  const heads = new Array(len);

  let maxIdx = -1,
    tailIdx = -1;

  for (let i = startIdx; i < len; i++) {
    const n = list[i];

    if (n < 0) continue;

    // lastIndexOf(v => v <= n)
    const lastIdx = findLastIndexLEQ(currentSeqElements, n);

    // Is it part of started subsequence?
    if (lastIdx !== -1) {
      // Store idx of prev element in this subsequence
      heads[i] = currentSeqIndices[lastIdx];
    }

    if (lastIdx === maxIdx) {
      // Found new longest sequence
      maxIdx++;
      currentSeqElements[maxIdx] = n;
      currentSeqIndices[maxIdx] = i;
      tailIdx = i;
    } else if (n < currentSeqElements[lastIdx + 1]) {
      // Smaller than maxIdx subsequence
      currentSeqElements[lastIdx + 1] = n;
      currentSeqIndices[lastIdx + 1] = i;
    }
  }

  // Reuse array, since it's already pre-allocated for target size
  const lisIndices = currentSeqElements;
  let elementIdx = tailIdx,
    i = maxIdx;
  while (i >= 0) {
    lisIndices[i] = elementIdx;
    elementIdx = heads[elementIdx];
    i--;
  }

  return lisIndices;
}

// Find last index of v <= n
function findLastIndexLEQ(increasingSeq, n) {
  let lo = -1,
    hi = increasingSeq.length;

  let result;
  // Fast path for simple increasing sequences
  if (hi > 0 && increasingSeq[hi - 1] <= n) {
    result = hi - 1;
  } else {
    // Find LEQ using array division by 2 parts
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (increasingSeq[mid] > n) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    result = lo;
  }

  return result;
}

const createComponentNode = (p, n) => ({
  t: 16,
  p, // props
  n, // init
  k: undefined, // key
});

export function component(init) {
  return props => createComponentNode(props, init);
}

export function key(key, cNode) {
  cNode.k = key;
  return cNode;
}

function addHook(hooks, hook) {
  if (!hooks) {
    return hook;
  }
  if (typeof hooks === "function") {
    return [hooks, hook];
  }
  hooks.push(hook);
  return hooks;
}

export function useUnmount(component, hook) {
  component.u = addHook(component.u, hook);
}

// Scheduling

const box = v => ({ v });

let _flags = 0;
const _resolvedPromise = Promise.resolve();
const _pendingUpdates = box({});

function checkUpdates(vnode) {
  const currentDepth = vnode.d;
  _depth = currentDepth + 1;
  vnode.q = updateValue(
    vnode.v(vnode.c),
    vnode.q,
    // afterNode,
  );
  _depth = currentDepth;

  vnode.f = 0;
}

function flushUpdates() {
  const index = _pendingUpdates.v;
  for (const depth of Object.keys(index)) {
    const vnodes = index[depth];
    for (const vnode of vnodes) {
      if ((vnode.f & 2) !== 0) {
        checkUpdates(vnode);
      }
    }
  }
  _flags = 0;
  _pendingUpdates.v = {};
}

export function invalidate(vnode) {
  vnode.f = 2;

  const index = _pendingUpdates.v;
  const depth = vnode.d;
  let d;
  if ((d = index[depth])) {
    d.push(vnode);
  } else {
    index[depth] = [vnode];
  }

  if ((_flags & 2) === 0) {
    _flags = 2;
    _resolvedPromise.then(flushUpdates);
  }
}
