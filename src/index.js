let TEMPLATE_COUNTER = 0;
const TEMPLATE_CACHE = new Map();
const COMPILER_TEMPLATE = document.createElement("template");
const GLOBAL_HANDLERS = {};

const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

const nodeProto = Node.prototype;
const elementProto = Element.prototype;
const characterDataProto = CharacterData.prototype;
const arrayProto = Array.prototype;

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

const characterDataSetData = getDescriptor(characterDataProto, "data").set;

const indexOf = arrayProto.indexOf;

let _depth = 0;
function _resetState() {
  _depth = 0;
}

// VNodes
const TEXT_TYPE = 1;
const ARRAY_TYPE = 2;

const createTextNode = () => ({
  t: TEXT_TYPE,
  n: undefined,
});

const createArrayNode = () => ({
  t: ARRAY_TYPE,
  n: undefined,
});

// Getters/setters
function setContent(refs, v) {
  const parent = refs[this.refKey];
  const afterNode = this.afterNodeFn(refs);
  const notSingleNode = this.flag;

  if (typeof v === "object") {
    if (v instanceof Array) {
      const nodes = v.map(function (props) {
        return renderValue(props, parent, afterNode);
      });
      const vnode = createArrayNode();
      vnode.n = nodes;
      refs[this.instKey] = vnode;
    } else {
      refs[this.instKey] = renderValue(v, parent, afterNode);
    }
  } else {
    let node;
    if ((notSingleNode & 2) !== 0) {
      node = document.createTextNode(v);
      nodeInsertBefore.call(parent, node, afterNode);
    } else {
      nodeSetTextContent.call(parent, v);
      node = nodeGetFirstChild.call(parent);
    }
    const vnode = createTextNode();
    vnode.n = node;
    refs[this.instKey] = vnode;
  }
}

function updateContent(refs, v) {
  const parent = refs[this.refKey];
  const inst = refs[this.instKey];
  const afterNode = this.afterNodeFn(refs);
  const notSingleNode = this.flag;

  const prevType = inst.t;

  if ((prevType & 1) !== 0) {
    if (typeof v !== "object") {
      characterDataSetData.call(inst.n, v);
    } else {
      if (inst.n) nodeRemoveChild.call(parent, inst.n);
      this.applyData(refs, v);
    }
  } else if ((prevType & 2) !== 0) {
    const nodes = inst.n;
    if (v instanceof Array) {
      if (v.length === 0) {
        if (nodes.length > 0) {
          if ((notSingleNode & 2) !== 0) {
            nodes.forEach(removeVNode);
          } else {
            nodes.forEach(unmountWalk);
            nodeSetTextContent.call(parent, "");
          }
          inst.n = [];
        }
      } else if (nodes.length === 0) {
        inst.n = v.map(function (props) {
          return renderValue(props, parent, afterNode);
        });
      } else {
        inst.n = updateArray(v, nodes, parent, afterNode, notSingleNode);
      }
    } else {
      if ((notSingleNode & 2) !== 0) {
        nodes.forEach(removeVNode);
      } else {
        nodes.forEach(unmountWalk);
        nodeSetTextContent.call(parent, "");
      }
      this.applyData(refs, v);
    }
  } else {
    if (typeof v === "object" && v.n === inst.n) {
      updateValue(v, inst);
    } else {
      removeVNode(inst);
      this.applyData(refs, v);
    }
  }
}

function setClassname(refs, v) {
  if (v !== null) elementSetClassName.call(refs[this.refKey], v);
}

function updateClassname(refs, v) {
  elementSetClassName.call(refs[this.refKey], v);
}

function refSet(refs, v) {
  refs[this.instKey] = v(refs[this.refKey], undefined);
}

function refUpdate(refs, v) {
  refs[this.instKey] = v(refs[this.refKey], refs[this.instKey]);
}

function createAttributeSetter(attrName) {
  return function (refs, v) {
    refs[this.refKey][attrName] = v;
  };
}

function createAttributeUpdater(attrName) {
  return function (refs, v) {
    refs[this.refKey][attrName] = v;
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
    insertionPoints[idxMap[insertionIdx]] = points.map(point => {
      point.instKey = idxMap[point.instKey];
      return point;
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
      } else if ((next.t & 1) !== 0) {
        result = next.n;
      } else if ((next.t & 2) !== 0) {
        if (next.n.length > 0) {
          result = next.n[0].r[0];
        }
      } else if ((next.t & 4) !== 0) {
        result = next.r[0];
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

  const html = strings
    .map(s => s.replace(/\w+=$/, ""))
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
  });

  let goBack = false,
    nextContentKey = null,
    stackInfo = getStackInfo(null, { lastDataRef: null, eventsPath: "" }),
    nextNode = null;

  strings.forEach((str, idx) => {
    str = str.trim();

    let commands = str.match(/<\/?|\/>/g);
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
            stackInfo.eventsPath += goBack === true ? "0" : "1";
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

      const attr = str.match(/(\S+)=$/);
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

          if (stack.length > 0) {
            const prevStack = stack[0];
            prevStack.lastDataRef = stackInfo.lastDataRef;
            prevStack.eventsPath = stackInfo.eventsPath;
          }
          switch (attrName) {
            case "class":
              nextArgNode.applyData = setClassname;
              nextArgNode.updateData = updateClassname;
              break;
            case "ref":
              nextArgNode.applyData = refSet;
              nextArgNode.updateData = refUpdate;
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
        const hasNextStaticSibling = nextStr.match(/^<\w/g) !== null;
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

        const hasPrevStaticSibling =
          goBack === true || str[str.length - 1] !== ">";
        const hasPrevDynamicSibling = str === "" && idx > 0;
        const hasPrevSibling = hasPrevStaticSibling || hasPrevDynamicSibling;
        if (hasPrevSibling) nextArgNode.flag |= 2;

        activeWayNodes[parentRef] = 1;

        stackInfo.lastDataRef = parentRef;
        stackInfo.eventsPath = "";

        if (stack.length > 0) {
          const prevStack = stack[0];
          prevStack.lastDataRef = stackInfo.lastDataRef;
          prevStack.eventsPath = stackInfo.eventsPath;
        }
      }

      if (!skipArg) argsWays.push(nextArgNode);
    }
  });

  ways = foldStaticTrees(ways.slice(1), activeWayNodes);

  const size = COMPILER_TEMPLATE.content.childNodes.length;
  const refsSize = correctIndices(ways, argsWays, events, insertionPoints);
  const producer = getProducer(refsSize);

  const unmountPoints = insertionPoints.reduce((acc, v) => [...acc, ...v], []);

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
  arguments.p = getTemplate(arguments[0]);
  return arguments;
}

const createVirtualNode = () => ({
  t: 4,
  f: 0, // flags
  d: _depth, // depth
  p: undefined, // props
  r: undefined, // refs
  k: undefined, // key
  v: undefined, // render
  c: undefined, // component props
  n: undefined, // component init
  u: undefined, // unmount,
  z: undefined, // roots (for fragments)
});

function unmountWalk(vnode) {
  const refs = vnode.r;
  const template = vnode.p.p;

  const { unmountPoints } = template;
  for (const point of unmountPoints) {
    const inst = refs[point.instKey];
    if ((inst.t & 4) !== 0) {
      unmountWalk(inst);
    } else if ((inst.t & 2) !== 0) {
      inst.n.forEach(unmountWalk);
    }
  }

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
}

function removeVNode(vnode) {
  unmountWalk(vnode);

  if ((vnode.t & 8) !== 0) {
    vnode.z.forEach(n => elementRemove.call(n));
  } else {
    elementRemove.call(vnode.r[0]);
  }
}

function insertVNode(vnode, parent, afterNode) {
  if ((vnode.t & 8) !== 0) {
    vnode.z.forEach(n => {
      if (afterNode) {
        nodeInsertBefore.call(parent, n, afterNode);
      } else {
        nodeAppendChild.call(parent, n);
      }
    });
  } else {
    if (afterNode) {
      nodeInsertBefore.call(parent, vnode.r[0], afterNode);
    } else {
      nodeAppendChild.call(parent, vnode.r[0]);
    }
  }
}

function renderValue(props, parent, afterNode) {
  const init = props.n;
  const vnode = createVirtualNode();
  vnode.n = init;
  const render = init(vnode);
  vnode.v = render;
  vnode.c = props.p;

  const view = render(props.p);

  const { type, templateNode, ways, argsWays, producer } = view.p;

  const tNode = nodeCloneNode.call(templateNode, true);

  const refs = producer();
  vnode.r = refs;

  if ((type & 16) !== 0) {
    const nodes = Array.from(nodeGetChildNodes.call(tNode));
    vnode.z = nodes;
    refs[0] = nodes[0];
    vnode.t |= 8;
  } else {
    refs[0] = tNode;
  }

  for (let w of ways) refs[w.refKey] = w.getRef.call(refs[w.prevKey]);

  const currentDepth = _depth;
  _depth = currentDepth + 1;
  for (let a of argsWays) a.applyData(refs, view[a.propIdx]);
  _depth = currentDepth;

  vnode.k = props.k;

  if (afterNode) {
    nodeInsertBefore.call(parent, tNode, afterNode);
  } else {
    nodeAppendChild.call(parent, tNode);
  }

  vnode.p = view;

  return vnode;
}

function checkUpdates(vnode) {
  const view = vnode.v(vnode.c);

  const prev = vnode.p;
  const refs = vnode.r;

  const currentDepth = vnode.d;
  _depth = currentDepth + 1;
  for (let a of vnode.p.p.argsWays) {
    if (prev[a.propIdx] !== view[a.propIdx]) {
      a.updateData(refs, view[a.propIdx]);
    }
  }
  _depth = currentDepth;

  vnode.p = view;
  vnode.f = 0;
}

function updateValue(b, vnode) {
  if (b.p === vnode.c) return;
  vnode.c = b.p;
  checkUpdates(vnode);
}

export function render(component, container) {
  _resetState();

  if (container.$INST !== undefined) {
    updateValue(component, container.$INST);
  } else {
    nodeSetTextContent.call(container, "");
    const inst = renderValue(component, container, null);
    container.$INST = inst;
    return inst;
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

  for (let insertionEl of insertions) {
    shift += insertionEl.staticElemsBefore;

    const inst = refs[insertionEl.instKey];
    const { t } = inst;

    if ((t & 2) !== 0) {
      const nodes = inst.n;
      if (nodeIndex <= nodes.length + shift - 1) {
        nodeInstance = nodes[nodeIndex - shift];
        break;
      } else {
        shift += nodes.length;
      }
    } else if ((t & 8) !== 0) {
      const nodes = inst.z;
      if (nodeIndex <= nodes.length + shift - 1) {
        nodeInstance = inst;
        break;
      } else {
        shift += nodes.length;
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

function findEventTarget(nodeInstance, event, targets) {
  const eventName = event.type;

  const { p: props, r: refs } = nodeInstance;
  const { events, insertionPoints } = props.p;

  events.forEach(e => {
    if (refs[e.refKey] === undefined) {
      refs[e.refKey] = tracebackReference(e.path, refs[e.prevRef]);
    }
  });

  const eventsRefs = events.map(({ refKey }) => refs[refKey]);
  const insertionRefs = insertionPoints.map((_, idx) => refs[idx]);

  let idx = 0,
    handled = false;

  for (let target of targets) {
    const i1 = eventsRefs.indexOf(target);
    if (i1 >= 0) {
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

        const inst = findNodeInstance(insertionPoints[i2], nodeIdx, refs);
        if (inst !== null) {
          handled = findEventTarget(inst, event, targets.slice(idx));
        }
      }
    }

    if (handled === true) break;
    idx++;
  }
  return handled;
}

function globalEventHandler(event) {
  let targets = [];
  let node = event.target;
  while (1) {
    const nodeInstance = node.$INST;

    if (nodeInstance !== undefined) {
      findEventTarget(nodeInstance, event, targets.reverse());
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

function updateArray(newArray, nodes, parent, afterNode, notSingleNode) {
  let newNodes = nodes;

  let a1 = 0,
    b1 = 0,
    a2 = nodes.length - 1,
    b2 = newArray.length - 1,
    loop = true,
    a,
    b,
    cloned = false;

  fixes: while (loop) {
    loop = false;

    // Skip prefix
    a = nodes[a1];
    b = newArray[b1];
    while (a.k === b.k) {
      updateValue(b, a);
      a1++;
      b1++;
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a1];
      b = newArray[b1];
    }

    if (!cloned) {
      newNodes = nodes.slice();
      cloned = true;
    }

    // Skip suffix
    a = nodes[a2];
    b = newArray[b2];
    while (a.k === b.k) {
      updateValue(b, a);
      newNodes[b2] = a;
      a2--;
      b2--;
      afterNode = a.r[0];
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a2];
      b = newArray[b2];
    }

    // Fast path to swap backward
    a = nodes[a2];
    b = newArray[b1];
    while (a.k === b.k) {
      loop = true;
      updateValue(b, a);
      insertVNode(a, parent, newNodes[b1].r[0]);
      newNodes[b1] = a;
      a2--;
      b1++;
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a2];
      b = newArray[b1];
    }

    // Fast path to swap forward
    a = nodes[a1];
    b = newArray[b2];
    while (a.k === b.k) {
      loop = true;
      updateValue(b, a);
      insertVNode(a, parent, afterNode);
      newNodes[b2] = a;
      a1++;
      b2--;
      afterNode = a.r[0];
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a1];
      b = newArray[b2];
    }
  }

  if (a1 > a2) {
    // Grow
    if (b1 <= b2) {
      newNodes.length = newArray.length;
      while (1) {
        newNodes[b1] = renderValue(newArray[b1], parent, afterNode);
        if (b1 === b2) break;
        b1++;
      }
    }
  } else if (b1 > b2) {
    // Shrink
    if (!cloned) {
      newNodes = nodes.slice();
      cloned = true;
    }
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
        return renderValue(props, parent, afterNode);
      });
    } else {
      toRemove.forEach(removeVNode);

      const lisIndices = longestPositiveIncreasingSubsequence(P, b1);

      let lisIdx = lisIndices.length - 1;
      for (let i = b2; i >= b1; i--) {
        if (lisIndices[lisIdx] === i) {
          const c1 = P[lisIndices[lisIdx]];
          const n = nodes[c1];
          const b = newArray[i];
          updateValue(b, n);

          newNodes[i] = n;
          afterNode = n.r[0];

          lisIdx--;
        } else {
          const n =
            P[i] === -1
              ? renderValue(newArray[i], parent, afterNode)
              : nodes[P[i]];

          // TODO: Insertion needed only when moving node
          // renderValue will automatically mount it
          insertVNode(n, parent, afterNode);

          newNodes[i] = n;
          afterNode = n.r[0];
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
