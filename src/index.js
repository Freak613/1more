let TEMPLATE_COUNTER = 0;
const TEMPLATE_CACHE = new Map();
const COMPILER_TEMPLATE = document.createElement("template");

const getDescriptor = (o, p) => Object.getOwnPropertyDescriptor(o, p);

const nodeProto = Node.prototype;
const elementProto = Element.prototype;
const characterDataProto = CharacterData.prototype;
const arrayProto = Array.prototype;
const eventProto = Event.prototype;

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

const eventGetCancelBubble = getDescriptor(eventProto, "cancelBubble").get;
const eventGetBubbles = getDescriptor(eventProto, "bubbles").get;

const htmlElementGetStyle = getDescriptor(HTMLElement.prototype, "style").get;

const characterDataSetData = getDescriptor(characterDataProto, "data").set;

const indexOf = arrayProto.indexOf;

const noOp = () => {};

const box = v => ({ v });

let _depth = 0;
let _arg;
let _getAfterNode;

function _resetState() {
  _depth = 0;
  _arg = null;
  _getAfterNode = () => null;
}

export function _resetTemplateCounter() {
  TEMPLATE_COUNTER = 0;
}

// Getters/setters
function setContent(refs, v, vnode, rootVnode) {
  const nextRoot =
    this.slotArgNode !== null ? refs[this.slotArgNode.instKey] : rootVnode;

  const prevArg = _arg;
  _arg = this;
  refs[this.instKey] = renderValue(
    v,
    refs[this.refKey],
    this.afterNodeFn(refs),
    this.flag,
    vnode,
    nextRoot,
    this.isDelegationRoot,
  );
  _arg = prevArg;
}

function updateContent(refs, v) {
  const _prevState = _getAfterNode;
  _getAfterNode = () => this.afterNodeFn(refs);

  const prevArg = _arg;
  _arg = this;

  const inst = refs[this.instKey];
  refs[this.instKey] = inst.i.u(v, inst);

  _arg = prevArg;
  _getAfterNode = _prevState;
}

// Set native event handler for target phase.
// For usage with web components.
function setTargetEventHandler(refs, _, vnode) {
  const propIdx = this.propIdx;
  const node = refs[this.refKey];
  node.addEventListener(
    this.type,
    event => {
      const handler = vnode.p[propIdx];
      if (handler) handler(event);
    },
    {
      capture: false,
      passive: false,
    },
  );
}

function setClassname(refs, v) {
  if (typeof v === "string") elementSetClassName.call(refs[this.refKey], v);
}

function updateClassname(refs, v) {
  const node = refs[this.refKey];
  if (typeof v === "string") {
    elementSetClassName.call(node, v);
  } else {
    elementRemoveAttribute.call(node, "class");
  }
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
  const node = refs[this.refKey];
  if (!b) {
    elementRemoveAttribute.call(node, "style");
    refs[this.instKey] = b;
    return;
  }

  const style = htmlElementGetStyle.call(node);
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
        : undefined;
    if (aValue !== bValue) {
      // Setting style property to `null` or empty string will result
      // in automatic removal of this property. (Chrome 89)
      // The only required check is for `undefined`
      if (bValue !== undefined) {
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

function setInnerHTML() {}

function updateInnerHTML() {}

function createPropertySetter(key) {
  return function (refs, v) {
    if (v !== null && v !== undefined) {
      refs[this.refKey][key] = v;
    }
  };
}

const PropertyToAttributeExceptions = {
  acceptCharset: "accept-charset",
  htmlFor: "for",
  httpEquiv: "http-equiv",
};

export function propertyToAttribute(name) {
  if (name.startsWith("aria")) {
    return `aria-${name.slice(4).toLowerCase()}`;
  }
  return PropertyToAttributeExceptions[name] || name.toLowerCase();
}

function createPropertyUpdater(key, isCustomElement) {
  return function (refs, v) {
    const node = refs[this.refKey];
    if ((v !== null && v !== undefined) || isCustomElement) {
      node[key] = v;
    } else {
      elementRemoveAttribute.call(node, propertyToAttribute(key));
    }
  };
}

function createAttributeSetter(key) {
  return function (refs, v) {
    if (v !== null && v !== undefined) {
      elementSetAttribute.call(refs[this.refKey], key, v);
    }
  };
}

function createAttributeUpdater(key) {
  return function (refs, v) {
    const node = refs[this.refKey];
    if (v !== null && v !== undefined) {
      elementSetAttribute.call(node, key, v);
    } else {
      elementRemoveAttribute.call(node, key);
    }
  };
}

function setNodeAsRenderingRoot(refs, v, vnode, rootVnode) {
  const node = refs[this.refKey];
  const knownEvents = this.knownEvents;

  const inst = createRootVirtualNode(node);
  inst.z = 1;
  inst.c = vnode;
  inst.r = rootVnode;
  node.$INST = inst;
  refs[this.instKey] = inst;

  knownEvents.forEach(name => {
    inst.e[name] = true;

    node.addEventListener(name, captureEventHandler, {
      capture: true,
      passive: false,
    });

    node.addEventListener(name, bubbleEventHandler, {
      capture: false,
      passive: false,
    });
  });
}

const TAG_KNOWLEDGE_BASE = {};

// Compiler
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
        result = next.i.d(next);
      }
    }
    if (result) break;
  }
  return result;
}

function afterNodeNoop() {
  return null;
}

function createTemplateNode(args, template) {
  args.t = 4;
  args.p = template;
  return args;
}

const buildHTMLString = strings => {
  let insideTag = false;

  return strings
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
};

const wrapTextNodes = strings => {
  // Append <p /> to non DOM nodes,
  // to help compiler detect such content
  const process = str => {
    str = str.trim();

    const terms = str.split(/(<\/?[^>]+\/?>)/g);

    terms.unshift(...terms.shift().split(/^([^>]*\/?>)/g));
    terms.push(...terms.pop().split(/(<\w[^]*)$/g));
    return terms
      .map(v => {
        if (v.match(/<|>/g)) return v;
        if (v.match(/\w+=$/g)) return v;
        return v.trim().length > 0 ? `${v}<p />` : v;
      })
      .join("");
  };

  return strings.map(process);
};

const getTemplateRepresentation = strings => {
  const getStaticNode = tag => ({
    tag,
    type: "static",
    props: [],
    children: [],
    remove: false,
    isCustomElement: tag !== undefined && tag.match(/-/) !== null,
  });

  const getInsertionNode = propIdx => ({
    type: "insertion",
    propIdx,
  });

  const getAttributeNode = (name, propIdx) => ({
    type: "attribute",
    name,
    propIdx,
  });

  const lastIdx = strings.length - 1;
  const stack = [];

  let insideTag = false;
  let parent = getStaticNode();

  wrapTextNodes(strings).forEach((str, idx) => {
    const strLen = str.length;

    const attr = str.match(/(\S+)=$/);

    const commands = str.match(/(<[\w-]+|<\/|<!--|->|\/>)/g);

    let removeScheduled = false;
    if (strLen > 0 && !insideTag && !str.match(/^(<\/?|\/?>)/)) {
      removeScheduled = true;
    }

    if (commands !== null) {
      for (let cmd of commands) {
        if (cmd[1] === ">" || cmd[1] === "/") {
          // Close tag
          parent = stack.shift();
        } else {
          // Open tag
          const node = getStaticNode(cmd.slice(1));
          parent.children.push(node);
          stack.unshift(parent);
          parent = node;

          if (removeScheduled) {
            node.remove = true;
            removeScheduled = false;
          }
        }
      }
    }

    if (idx !== lastIdx) {
      if (attr !== null) {
        const attrName = attr[1];
        parent.props.push(getAttributeNode(attrName, idx + 1));
      } else {
        const node = getInsertionNode(idx + 1);
        parent.children.push(node);
      }
    }

    const openTags = str.match(/</g);
    const closedTags = str.match(/>/g);
    const flip =
      (openTags ? openTags.length : 0) !== (closedTags ? closedTags.length : 0);
    if (flip) insideTag = !insideTag;
  });

  return stack[stack.length - 1] || parent;
};

const compileRoot = (vdom, domNode) => {
  const getWalkNode = () => ({
    t: "walkNode",
    getRef: null,
    refKey: null,
    prevKey: null,
  });

  const getArgNode = () => ({
    t: "argNode",
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
    knownEvents: null,
    slotArgNode: null,
    isPreviousInsertion: false,
    isDelegationRoot: false,
  });

  let ways = [];
  const argsWays = [];
  const events = [];
  const activeWayNodes = {};
  const insertionPoints = [];
  const knownEvents = {};
  let instanceIdx = 0;

  const compileNode = (
    vdom,
    idx,
    parentRefIdx,
    lastChildRefIdx,
    fullPath,
    staticsBefore,
    parent,
    lastDataRefIdx,
    eventsPath,
    domPath,
    knownEvents,
    parentSlotArgNode,
    isPreviousInsertion,
  ) => {
    if (vdom.type === "insertion") {
      const nextArgNode = getArgNode();
      nextArgNode.propIdx = vdom.propIdx;
      nextArgNode.refKey = parentRefIdx;
      nextArgNode.instKey = instanceIdx++;
      nextArgNode.applyData = setContent;
      nextArgNode.updateData = updateContent;
      nextArgNode.slotArgNode = parentSlotArgNode;

      if (parent && parent.isCustomElement) {
        nextArgNode.isDelegationRoot = true;
      }

      const nextSibling = parent.children[idx + 1];
      if (nextSibling) {
        const hasNextStaticSibling = nextSibling.type === "static";

        nextArgNode.flag |= 2;
        nextArgNode.afterKey = instanceIdx;
        nextArgNode.afterNodeFn = hasNextStaticSibling
          ? afterNodeDefault
          : afterNodeInstance;
      } else {
        nextArgNode.afterNodeFn = afterNodeNoop;
      }

      const prevSibling = parent.children[idx - 1];
      if (prevSibling) nextArgNode.flag |= 2;

      insertionPoints[parentRefIdx] = insertionPoints[parentRefIdx] || [];

      insertionPoints[parentRefIdx].push({
        staticElemsBefore: staticsBefore,
        instKey: nextArgNode.instKey,
        propIdx: nextArgNode.propIdx,
        isSingleNode: nextArgNode.flag === 0,
      });

      activeWayNodes[parentRefIdx] = 1;

      argsWays.push(nextArgNode);

      return [lastChildRefIdx, true, nextArgNode];
    }

    if (vdom.remove) {
      let commentNode;
      if (domPath.length === 0) {
        commentNode = domNode;
        domNode = commentNode.nextSibling;
      } else {
        commentNode = tracebackReference(domPath, domNode);
      }
      const parent = commentNode.parentNode;
      parent.removeChild(commentNode);
    }

    const nextNode = getWalkNode();
    nextNode.refKey = instanceIdx++;

    if (lastChildRefIdx) {
      nextNode.getRef = nodeGetNextSibling;
      nextNode.prevKey = lastChildRefIdx;
    } else {
      nextNode.getRef = nodeGetFirstChild;
      nextNode.prevKey = parentRefIdx;
    }

    ways.push(nextNode);

    const { tag, isCustomElement } = vdom;

    let slotArgNode;
    if (parent && parent.isCustomElement) {
      const nextArgNode = getArgNode();
      slotArgNode = nextArgNode;

      nextArgNode.refKey = nextNode.refKey;
      nextArgNode.propIdx = 0;

      activeWayNodes[nextNode.refKey] = 1;

      nextArgNode.applyData = setNodeAsRenderingRoot;
      nextArgNode.updateData = noOp;

      knownEvents = {};

      argsWays.push(nextArgNode);
    }

    vdom.props.forEach(prop => {
      const attrName = prop.name;
      if (attrName[0] === "o" && attrName[1] === "n") {
        const nextArgNode = getArgNode();
        nextArgNode.propIdx = prop.propIdx;
        nextArgNode.refKey = nextNode.refKey;
        nextArgNode.type = attrName.slice(2);
        nextArgNode.isPreviousInsertion = isPreviousInsertion;

        nextArgNode.prevRef = lastDataRefIdx;
        nextArgNode.path = eventsPath;

        if (isCustomElement) {
          activeWayNodes[nextNode.refKey] = 1;

          nextArgNode.applyData = setTargetEventHandler;
          nextArgNode.updateData = noOp;

          argsWays.push(nextArgNode);
        } else {
          events.push(nextArgNode);
          knownEvents[nextArgNode.type] = true;
        }
      } else {
        const nextArgNode = getArgNode();
        nextArgNode.propIdx = prop.propIdx;
        nextArgNode.refKey = nextNode.refKey;

        activeWayNodes[nextNode.refKey] = 1;

        switch (attrName) {
          case "class":
          case "className":
            nextArgNode.applyData = setClassname;
            nextArgNode.updateData = updateClassname;
            break;
          case "style":
            nextArgNode.applyData = setStyle;
            nextArgNode.updateData = updateStyle;
            break;
          case "innerHTML":
            nextArgNode.applyData = setInnerHTML;
            nextArgNode.updateData = updateInnerHTML;
            break;
          case "defaultChecked":
            nextArgNode.applyData = createPropertySetter("checked");
            nextArgNode.updateData = noOp;
            break;
          case "defaultValue":
            nextArgNode.applyData = createPropertySetter("value");
            nextArgNode.updateData = noOp;
            break;
          default: {
            TAG_KNOWLEDGE_BASE[tag] = TAG_KNOWLEDGE_BASE[tag] || {};

            const knownTag = TAG_KNOWLEDGE_BASE[tag];
            const known = knownTag[attrName];

            let isProperty;
            if (known) {
              isProperty = known.type === "property";
            } else {
              const node = tracebackReference(domPath, domNode);
              isProperty = attrName in node;
              knownTag[attrName] = {
                type: isProperty ? "property" : "attribute",
              };
            }

            if (isProperty) {
              nextArgNode.applyData = createPropertySetter(attrName);
              nextArgNode.updateData = createPropertyUpdater(
                attrName,
                isCustomElement,
              );
            } else {
              nextArgNode.applyData = createAttributeSetter(attrName);
              nextArgNode.updateData = createAttributeUpdater(attrName);
            }

            break;
          }
        }

        argsWays.push(nextArgNode);
      }
    });

    lastChildRefIdx = null;
    staticsBefore = 0;

    let hasNestedData = false;

    vdom.children.forEach((child, idx) => {
      fullPath = [...fullPath, idx === 0 ? 1 : 0];
      eventsPath = [...eventsPath, idx === 0 ? 1 : 0];
      domPath = [...domPath, lastChildRefIdx ? 0 : 1];

      const [nextChildRefIdx, childHasNestedData, resultChild] = compileNode(
        child,
        idx,
        nextNode.refKey,
        lastChildRefIdx,
        fullPath,
        staticsBefore,
        vdom,
        lastDataRefIdx,
        eventsPath,
        domPath,
        knownEvents,
        slotArgNode || parentSlotArgNode,
        isPreviousInsertion,
      );

      if (childHasNestedData) {
        lastDataRefIdx =
          resultChild.t === "argNode" ? resultChild.instKey : nextChildRefIdx;
        eventsPath = [];
        if (resultChild.t === "argNode") {
          isPreviousInsertion = true;
        } else {
          isPreviousInsertion = false;
        }
      }

      if (nextChildRefIdx === lastChildRefIdx) {
        staticsBefore = 0;
        hasNestedData = true;
        domPath = domPath.slice(0, -1);
      } else {
        staticsBefore++;
        lastChildRefIdx = nextChildRefIdx;
      }
    });

    if (slotArgNode) {
      slotArgNode.knownEvents = Object.keys(knownEvents);
    }

    if (parent) {
      const prevSibling = parent.children[idx - 1];
      if (prevSibling && prevSibling.type === "insertion") {
        activeWayNodes[nextNode.refKey] = 1;
        hasNestedData = true;
      }
    }

    return [nextNode.refKey, hasNestedData, nextNode];
  };

  compileNode(
    vdom,
    0,
    null,
    null,
    [],
    0,
    null,
    0,
    [],
    [],
    knownEvents,
    null,
    false,
  );

  const foldedWays = foldStaticTrees(ways.slice(1), activeWayNodes);

  const refsSize = correctIndices(
    foldedWays,
    argsWays,
    events,
    insertionPoints,
  );
  const producer = getProducer(refsSize);

  const unmountPoints = insertionPoints.reduce(
    (acc, v) => [...acc, ...v.points],
    [],
  );

  // Used in type detection to differ templates from each other
  let type = 8 | (TEMPLATE_COUNTER++ << 6);

  return {
    type,
    ways: foldedWays,
    argsWays,
    events,
    insertionPoints,
    producer,
    unmountPoints,
    templateNode: domNode,
    knownEvents: Object.keys(knownEvents),
  };
};

function cloneArguments() {
  return arguments;
}

function createFragmentNode(args, template) {
  return createTemplateNode(cloneArguments(...args), template);
}

function createRootInsertion(args, template) {
  return args[template.propIdx];
}

function createFragmentArray(args, template) {
  return template.roots.map(template => {
    return template.gen(args, template);
  });
}

function compileTemplate(strings) {
  COMPILER_TEMPLATE.innerHTML = buildHTMLString(strings);

  const vdom = getTemplateRepresentation(strings);

  const childNodes = COMPILER_TEMPLATE.content.childNodes;

  const gen =
    vdom.children.length > 1 ? createFragmentNode : createTemplateNode;

  let idx = 0;
  const roots = vdom.children.map(child => {
    if (child.type === "insertion") {
      return {
        propIdx: child.propIdx,
        gen: createRootInsertion,
      };
    }

    return {
      ...compileRoot(child, childNodes[idx++]),
      gen,
    };
  });

  if (roots.length === 1) {
    return roots[0];
  }

  return {
    roots,
    gen: createFragmentArray,
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
  const template = getTemplate(arguments[0]);
  return template.gen(arguments, template);
}

// Virtual Nodes

function updateTextNode(b, vnode) {
  if (typeof b !== "object" && typeof b !== "boolean" && b !== undefined) {
    characterDataSetData.call(vnode.n, b);
  } else {
    const parent = vnode.w;
    const notSingleNode = vnode.g;

    if (vnode.n) nodeRemoveChild.call(parent, vnode.n);
    vnode = renderValue(
      b,
      parent,
      _getAfterNode(),
      notSingleNode,
      vnode.x,
      vnode.j,
      vnode.z,
    );
  }

  return vnode;
}

function unmountTextNode(vnode) {}

function removeTextNode(vnode) {
  if (vnode.n) nodeRemoveChild.call(vnode.w, vnode.n);
}

function textNodeSize(vnode) {
  return 1;
}

function getTextHeadDomNode(vnode) {
  return vnode.n;
}

function getTextTailDomNode(vnode) {
  return vnode.n;
}

function insertTextNode(vnode, parent, afterNode) {
  nativeInsert(vnode.n, parent, afterNode);
}

function textNodeEventHandler() {}

const textNodeImpl = {
  u: updateTextNode,
  z: unmountTextNode,
  r: removeTextNode,
  s: textNodeSize,
  d: getTextHeadDomNode,
  i: insertTextNode,
  e: textNodeEventHandler,
  a: getTextTailDomNode,
};

const createTextVirtualNode = () => ({
  n: undefined, // text node
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
  a: _arg, // closest template arg
  i: textNodeImpl,
  j: undefined, // root vnode
  z: false, // isDelegationRoot
});

function updateArrayNode(b, vnode) {
  const parent = vnode.w;
  const notSingleNode = vnode.g;
  const rootVnode = vnode.j;
  const isDelegationRoot = vnode.z;

  const nodes = vnode.n;
  if (b instanceof Array) {
    b = b.map(normalizeArrayItem);

    if (b.length === 0) {
      if (nodes.length > 0) {
        if ((notSingleNode & 2) !== 0) {
          nodes.forEach(removeVNode);
        } else {
          nodes.forEach(n => n.i.z(n));
          nodeSetTextContent.call(parent, "");
        }
        vnode.n = [];
      }
    } else if (nodes.length === 0) {
      const afterNode = _getAfterNode();

      vnode.n = b.map(function (props) {
        return renderValue(
          props.v,
          parent,
          afterNode,
          2,
          vnode,
          rootVnode,
          isDelegationRoot,
        );
      });
    } else {
      const prevState = _getAfterNode;

      vnode.n = updateArray(
        b,
        _getAfterNode(),
        vnode,
        rootVnode,
        isDelegationRoot,
      );

      _getAfterNode = prevState;
    }
    vnode.v = b;
  } else {
    if ((notSingleNode & 2) !== 0) {
      nodes.forEach(removeVNode);
    } else {
      nodes.forEach(n => n.i.z(n));
      nodeSetTextContent.call(parent, "");
    }
    vnode = renderValue(
      b,
      parent,
      _getAfterNode(),
      notSingleNode,
      vnode.x,
      vnode.j,
      vnode.z,
    );
  }

  return vnode;
}

function unmountArrayNode(vnode) {
  vnode.n.forEach(n => n.i.z(n));
}

function removeArrayNode(vnode) {
  vnode.n.forEach(n => n.i.r(n));
}

function arrayNodeSize(vnode) {
  const nodes = vnode.n;
  let size = 0;
  let node;
  for (node of nodes) {
    size += node.i.s(node);
  }
  return size;
}

function getArrayHeadDomNode(vnode) {
  const nodes = vnode.n;

  let node;
  let maybeDomNode;
  for (node of nodes) {
    maybeDomNode = node.i.d(node);
    if (maybeDomNode) break;
  }

  return maybeDomNode;
}

function getArrayTailDomNode(vnode) {
  const nodes = vnode.n;

  let maybeDomNode;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    maybeDomNode = node.i.a(node);
    if (maybeDomNode) break;
  }

  return maybeDomNode;
}

function insertArrayNode(vnode, parent, afterNode) {
  vnode.n.forEach(n => n.i.i(n, parent, afterNode));
}

function arrayNodeEventHandler(vnode, event, targets, parent, outerShift) {
  const nodeIdx = indexOf.call(nodeGetChildNodes.call(parent), targets[0]);
  const nodes = vnode.n;
  let shift = outerShift;
  let nodeInstance;
  for (let node of nodes) {
    const size = node.i.s(node);
    if (nodeIdx <= size - 1 + shift) {
      nodeInstance = node;
      break;
    } else {
      shift += size;
    }
  }
  nodeInstance.i.e(nodeInstance, event, targets, parent, shift);
}

function getNextSiblingInArray(vnode, target) {
  const nodes = vnode.n;
  let idx = nodes.indexOf(target);
  let node = nodes[idx + 1];
  let result;
  while (node) {
    const dom = node.i.d(node);
    if (dom) {
      result = dom;
      break;
    }
    idx++;
    node = nodes[idx];
  }
  if (result) return result;

  const parent = vnode.x;
  if (parent) return parent.i.w(parent, vnode);
  return null;
}

function lookupContextInArray(vnode, token) {
  const parent = vnode.x;
  if (parent) return parent.i.b(parent, token);
  return null;
}

const arrayNodeImpl = {
  u: updateArrayNode,
  z: unmountArrayNode,
  r: removeArrayNode,
  s: arrayNodeSize,
  d: getArrayHeadDomNode,
  i: insertArrayNode,
  e: arrayNodeEventHandler,
  a: getArrayTailDomNode,
  w: getNextSiblingInArray,
  b: lookupContextInArray,
};

const createArrayVirtualNode = () => ({
  v: undefined, // props
  n: undefined, // nodes
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
  a: _arg, // closest template arg
  i: arrayNodeImpl,
  j: undefined, // root vnode
  z: false, // isDelegationRoot
});

function updateTemplateNode(b, vnode) {
  if (
    typeof b === "object" &&
    b !== null &&
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
    const parent = vnode.w;
    const notSingleNode = vnode.g;

    removeVNode(vnode);
    vnode = renderValue(
      b,
      parent,
      _getAfterNode(),
      notSingleNode,
      vnode.x,
      vnode.j,
      vnode.z,
    );
  }

  return vnode;
}

function unmountTemplateNode(vnode) {
  const refs = vnode.r;
  const template = vnode.p.p;

  const { unmountPoints } = template;
  for (const point of unmountPoints) {
    const n = refs[point.instKey];
    n.i.z(n);
  }
}

function removeTemplateNode(vnode) {
  elementRemove.call(vnode.r[0]);
}

function templateNodeSize(vnode) {
  return 1;
}

function getTemplateHeadDomNode(vnode) {
  return vnode.r[0];
}

function getTemplateTailDomNode(vnode) {
  return vnode.r[0];
}

function insertTemplateNode(vnode, parent, afterNode) {
  nativeInsert(vnode.r[0], parent, afterNode);
}

function templateNodeEventHandler(vnode, event, targets, parent, outerShift) {
  const { p: props, r: refs } = vnode;
  const { events, insertionPoints } = props.p;

  const insertionParents = insertionPoints.map(({ refIdx }) => refs[refIdx]);

  events.forEach(e => {
    if (refs[e.refKey] === undefined) {
      const prev = refs[e.prevRef];
      const start = e.isPreviousInsertion ? prev.i.a(prev) : prev;
      refs[e.refKey] = tracebackReference(e.path, start);
    }
  });

  const eventsRefs = events.map(({ refKey }) => refs[refKey]);

  let idx = 0;
  let isTarget = true;

  // Capture phase
  for (; idx < targets.length - 1; idx++) {
    const target = targets[idx];

    const i2 = insertionParents.indexOf(target);

    if (i2 >= 0) {
      isTarget = false;

      const parent = insertionParents[i2];

      const currentInsertionPoint = insertionPoints[i2];

      let nodeInstance;
      let shift = 0;
      if (
        currentInsertionPoint.points.length === 1 &&
        currentInsertionPoint.points[0].isSingleNode
      ) {
        const insertionEl = currentInsertionPoint.points[0];
        nodeInstance = refs[insertionEl.instKey];
      } else {
        const nodeIndex = indexOf.call(
          nodeGetChildNodes.call(parent),
          targets[idx + 1],
        );

        for (let insertionEl of currentInsertionPoint.points) {
          shift += insertionEl.staticElemsBefore;

          const inst = refs[insertionEl.instKey];
          const size = inst.i.s(inst);
          if (nodeIndex <= size - 1 + shift) {
            if (nodeIndex >= shift) {
              nodeInstance = inst;
            }
            break;
          } else {
            shift += size;
          }
        }
      }

      if (nodeInstance) {
        nodeInstance.i.e(
          nodeInstance,
          event,
          targets.slice(idx + 1),
          parent,
          shift,
        );
        break;
      } else {
        isTarget = true;
      }
    }
  }

  if (isTarget) {
    // Target phase
    const target = targets[idx];

    const i1 = eventsRefs.indexOf(target);
    if (i1 >= 0) {
      const eventName = event.type;

      let eventIdx = 0;
      for (let eventRef of eventsRefs) {
        if (eventRef === target) {
          const ev = events[eventIdx];
          if (ev.type === eventName) {
            const handlerProp = props[ev.propIdx];
            if (handlerProp) {
              handlerProp(event);
            }
            break;
          }
        }
        eventIdx++;
      }

      const stopped =
        eventGetCancelBubble.call(event) || !eventGetBubbles.call(event);
      if (stopped) return;
    } else {
      const stopped = !eventGetBubbles.call(event);
      if (stopped) return;
    }

    idx--;
  } else {
    const stopped =
      eventGetCancelBubble.call(event) || !eventGetBubbles.call(event);
    if (stopped) return;
  }

  // Bubble phase
  for (; idx >= 0; idx--) {
    const target = targets[idx];

    const i1 = eventsRefs.indexOf(target);
    if (i1 >= 0) {
      const eventName = event.type;

      let eventIdx = 0;
      for (let eventRef of eventsRefs) {
        if (eventRef === target) {
          const ev = events[eventIdx];
          if (ev.type === eventName) {
            const handlerProp = props[ev.propIdx];
            if (handlerProp) {
              handlerProp(event);
            }
            break;
          }
        }
        eventIdx++;
      }
      const stopped = eventGetCancelBubble.call(event);
      if (stopped) break;
    }
  }
}

function getNextSiblingInTemplate(vnode, target) {
  const arg = target.a;
  const refs = vnode.r;
  return arg.afterNodeFn(refs);
}

function lookupContextInTemplate(vnode, token) {
  const parent = vnode.x;
  if (parent) return parent.i.b(parent, token);
  return null;
}

const templateNodeImpl = {
  u: updateTemplateNode,
  z: unmountTemplateNode,
  r: removeTemplateNode,
  s: templateNodeSize,
  d: getTemplateHeadDomNode,
  i: insertTemplateNode,
  e: templateNodeEventHandler,
  a: getTemplateTailDomNode,
  w: getNextSiblingInTemplate,
  b: lookupContextInTemplate,
};

const createTemplateVirtualNode = () => ({
  p: undefined, // props
  r: undefined, // refs
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
  a: _arg, // closest template arg
  i: templateNodeImpl,
  j: undefined, // root vnode
  z: false, // isDelegationRoot
});

function updateComponentNode(b, vnode) {
  if (
    typeof b === "object" &&
    b !== null &&
    (b.t & 16) !== 0 &&
    b.n === vnode.n
  ) {
    if (b.p !== vnode.c) {
      vnode.c = b.p;
      vnode.f = 0;

      const currentDepth = vnode.d;
      _depth = currentDepth + 1;

      const child = vnode.q;
      vnode.q = child.i.u(vnode.v(b.p), child);

      _depth = currentDepth;
    }
  } else {
    const parent = vnode.w;
    const notSingleNode = vnode.g;

    removeVNode(vnode);
    vnode = renderValue(
      b,
      parent,
      _getAfterNode(),
      notSingleNode,
      vnode.x,
      vnode.j,
      vnode.z,
    );
  }

  return vnode;
}

function unmountComponentNode(vnode) {
  const child = vnode.q;
  child.i.z(child);

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

function removeComponentNode(vnode) {
  const child = vnode.q;
  child.i.r(child);
}

function componentNodeSize(vnode) {
  const child = vnode.q;
  return child.i.s(child);
}

function getComponentHeadDomNode(vnode) {
  const child = vnode.q;
  return child.i.d(child);
}

function getComponentTailDomNode(vnode) {
  const child = vnode.q;
  return child.i.a(child);
}

function insertComponentNode(vnode, parent, afterNode) {
  const child = vnode.q;
  child.i.i(child, parent, afterNode);
}

function componentNodeEventHandler(vnode, event, targets, parent, outerShift) {
  const child = vnode.q;
  child.i.e(child, event, targets, parent, outerShift);
}

function getNextSiblingInComponent(vnode, target) {
  const parent = vnode.x;
  if (parent) return parent.i.w(parent, vnode);
  return null;
}

function lookupContextInComponent(vnode, token) {
  if (vnode.b !== undefined) {
    const contexts = vnode.b;
    if (contexts instanceof Array) {
      const targetContext = contexts.find(c => c.t === token);
      if (targetContext) return targetContext;
    } else {
      if (contexts.t === token) return contexts;
    }
  }

  const parent = vnode.x;
  if (parent) return parent.i.b(parent, token);
  return null;
}

const componentNodeImpl = {
  u: updateComponentNode,
  z: unmountComponentNode,
  r: removeComponentNode,
  s: componentNodeSize,
  d: getComponentHeadDomNode,
  i: insertComponentNode,
  e: componentNodeEventHandler,
  a: getComponentTailDomNode,
  w: getNextSiblingInComponent,
  b: lookupContextInComponent,
};

const createComponentVirtualNode = () => ({
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
  a: _arg, // closest template arg
  i: componentNodeImpl,
  j: undefined, // root vnode
  z: false, // isDelegationRoot
  b: undefined, // contexts
});

function updateVoidNode(b, vnode) {
  const parent = vnode.w;
  const notSingleNode = vnode.g;

  if (b !== null && b !== undefined && typeof b !== "boolean") {
    vnode = renderValue(
      b,
      parent,
      _getAfterNode(),
      notSingleNode,
      vnode.x,
      vnode.j,
      vnode.z,
    );
  }

  return vnode;
}

function unmountVoidNode(vnode) {}

function removeVoidNode(vnode) {}

function voidNodeSize(vnode) {
  return 0;
}

function getVoidHeadDomNode(vnode) {}

function getVoidTailDomNode(vnode) {}

function insertVoidNode(vnode, parent, afterNode) {}

function voidNodeEventHandler() {}

const voidNodeImpl = {
  u: updateVoidNode,
  z: unmountVoidNode,
  r: removeVoidNode,
  s: voidNodeSize,
  d: getVoidHeadDomNode,
  i: insertVoidNode,
  e: voidNodeEventHandler,
  a: getVoidTailDomNode,
};

const createVoidVirtualNode = () => ({
  x: undefined, // parent vdom node
  w: undefined, // parent dom node
  g: undefined, // notSingleNode flag
  a: _arg, // closest template arg
  i: voidNodeImpl,
  j: undefined, // root vnode
  z: false, // isDelegationRoot
});

function renderValue(
  props,
  parent,
  afterNode,
  notSingleNode,
  parentVnode,
  rootVnode,
  isDelegationRoot,
) {
  let vnode;

  const t = typeof props;

  if (props !== null && props !== undefined && t !== "boolean") {
    if (t === "object") {
      if (props instanceof Array) {
        vnode = createArrayVirtualNode();
        vnode.x = parentVnode;
        vnode.w = parent;
        vnode.g = notSingleNode;
        vnode.j = rootVnode;
        vnode.z = isDelegationRoot;

        props = props.map(normalizeArrayItem);
        vnode.v = props;

        vnode.n = props.map(function (props) {
          return renderValue(
            props.v,
            parent,
            afterNode,
            2,
            vnode,
            rootVnode,
            isDelegationRoot,
          );
        });
      } else if ((props.t & 16) !== 0) {
        vnode = createComponentVirtualNode();
        vnode.x = parentVnode;
        vnode.w = parent;
        vnode.g = notSingleNode;
        vnode.j = rootVnode;
        vnode.z = isDelegationRoot;

        vnode.c = props.p;

        const init = props.n;
        vnode.n = init;

        const render = init(vnode);
        vnode.v = render;

        const view = render(props.p);

        const currentDepth = _depth;
        _depth = currentDepth + 1;
        vnode.q = renderValue(
          view,
          parent,
          afterNode,
          notSingleNode,
          vnode,
          rootVnode,
          isDelegationRoot,
        );
        _depth = currentDepth;
      } else {
        vnode = createTemplateVirtualNode();
        vnode.x = parentVnode;
        vnode.w = parent;
        vnode.g = notSingleNode;
        vnode.p = props;
        vnode.j = rootVnode;
        vnode.z = isDelegationRoot;

        const { type, templateNode, ways, argsWays, producer } = props.p;

        const tNode = nodeCloneNode.call(templateNode, true);

        if (isDelegationRoot) {
          const inst = createRootVirtualNode(tNode);
          inst.z = 1;
          inst.c = vnode;
          inst.r = rootVnode;
          tNode.$INST = inst;
          rootVnode = inst;
        }

        if (!rootVnode.s[type]) {
          setupTemplateEventHandlers(props.p.knownEvents, rootVnode);
          rootVnode.s[type] = true;
        }

        const refs = producer();
        refs[0] = tNode;
        vnode.r = refs;

        for (let w of ways) refs[w.refKey] = w.getRef.call(refs[w.prevKey]);
        for (let a of argsWays)
          a.applyData(refs, props[a.propIdx], vnode, rootVnode);

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
      vnode.j = rootVnode;
      vnode.z = isDelegationRoot;

      if ((notSingleNode & 2) !== 0) {
        const node = document.createTextNode(props);
        vnode.n = node;
        nodeInsertBefore.call(parent, node, afterNode);
      } else {
        nodeSetTextContent.call(parent, props);
        vnode.n = nodeGetFirstChild.call(parent);
      }
    }
  } else {
    vnode = createVoidVirtualNode();
    vnode.x = parentVnode;
    vnode.w = parent;
    vnode.g = notSingleNode;
    vnode.j = rootVnode;
    vnode.z = isDelegationRoot;
  }
  return vnode;
}

function removeVNode(vnode) {
  vnode.i.z(vnode);
  vnode.i.r(vnode);
}

const createRootVirtualNode = o => ({
  o, // container
  c: undefined, // root element
  s: {}, // known templates
  e: {}, // known event types
  r: undefined, // root vnode
  z: 0, // is slot flag
});

export function render(component, container) {
  _resetState();

  let inst = container.$INST;
  if (inst !== undefined) {
    _getAfterNode = () => null;

    const vnode = inst.c;
    inst.c = vnode.i.u(component, vnode);
  } else {
    nodeSetTextContent.call(container, "");

    inst = createRootVirtualNode(container);

    const tagName = container.tagName;
    const isCustomElement = tagName ? tagName.match(/-/) !== null : false;

    const vnode = renderValue(
      component,
      container,
      null,
      0,
      null,
      inst,
      isCustomElement,
    );
    inst.c = vnode;

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

function bubbleEventHandler(event) {
  let prevTargets = event.$TARGETS;
  if (prevTargets) {
    const eventTargets = event.composedPath();

    for (const prevTarget of prevTargets) {
      const targetIdx = eventTargets.indexOf(prevTarget);
      if (targetIdx >= 0) {
        const nodeInstance = this.$INST;

        const idx = eventTargets.indexOf(this);

        const startIdx =
          prevTarget.$INST.r === nodeInstance ? targetIdx + 1 : targetIdx;

        const inst = nodeInstance.c;
        inst.i.e(
          inst,
          event,
          eventTargets.slice(startIdx, idx).reverse(),
          this,
          0,
        );

        prevTargets.push(this);
        return;
      }
    }

    const target = event.target;
    const targetIdx = eventTargets.indexOf(target);
    let idx = targetIdx + 1;

    let node;
    for (; idx < eventTargets.length; idx++) {
      node = eventTargets[idx];

      const nodeInstance = node.$INST;

      if (nodeInstance !== undefined) {
        const inst = nodeInstance.c;
        inst.i.e(
          inst,
          event,
          eventTargets.slice(targetIdx, idx).reverse(),
          node,
          0,
        );
        break;
      }
    }

    prevTargets.push(node);
    return;
  }

  const targets = [];
  let node = event.target;
  while (1) {
    const nodeInstance = node.$INST;

    if (nodeInstance !== undefined) {
      if (targets.length === 0) {
        targets.push(node);
      } else if ((nodeInstance.z & 1) !== 0) {
        targets.push(node);
      }

      const inst = nodeInstance.c;
      inst.i.e(inst, event, targets.reverse(), node, 0);
      break;
    }
    targets.push(node);
    node = node.parentNode;
  }
  event.$TARGETS = [node];
}

function captureEventHandler(event) {
  if (event.bubbles) return;

  const target = event.target;
  const tagName = target.tagName;
  if (tagName && tagName.match(/-/)) {
    return;
  }

  const handlerInstance = this.$INST;

  let targets = [];
  let node = target;
  while (1) {
    const nodeInstance = node.$INST;

    if (nodeInstance !== undefined) {
      if (nodeInstance === handlerInstance && node === this) {
        const inst = nodeInstance.c;
        inst.i.e(inst, event, targets.reverse(), node, 0);
      }
      break;
    }
    targets.push(node);
    node = node.parentNode;
  }
}

function setupTemplateEventHandlers(events, root) {
  const { e: knownEvents, o: container } = root;

  events.forEach(name => {
    if (!knownEvents[name]) {
      container.addEventListener(name, captureEventHandler, {
        capture: true,
        passive: false,
      });

      container.addEventListener(name, bubbleEventHandler, {
        capture: false,
        passive: false,
      });

      knownEvents[name] = true;
    }
  });
}

function nativeInsert(node, parent, afterNode) {
  if (afterNode) {
    nodeInsertBefore.call(parent, node, afterNode);
  } else {
    nodeAppendChild.call(parent, node);
  }
}

function normalizeArrayItem(value, idx) {
  if (value && (value.t & 2) !== 0) {
    return value;
  } else {
    return key(`$$${idx}`, value);
  }
}

function updateArray(newArray, _afterNode, vnode, rootVnode, isDelegationRoot) {
  const nodes = vnode.n;
  const parent = vnode.w;
  const notSingleNode = vnode.g;
  const prevArray = vnode.v;

  let newNodes = nodes.slice();

  let a1 = 0,
    b1 = 0,
    a2 = nodes.length - 1,
    b2 = newArray.length - 1,
    bEnd = b2,
    loop = true,
    a,
    b;

  const lookupOldAfterNode = () => {
    if (a1 >= bEnd) return _afterNode;

    let idx = a1 + 1;
    let maybeAfterVNode = newNodes[idx];
    let maybeAfterNode;
    while (maybeAfterVNode) {
      maybeAfterNode = maybeAfterVNode.i.d(maybeAfterVNode);
      if (maybeAfterNode) break;
      if (idx === bEnd) break;
      idx++;
      maybeAfterVNode = newNodes[idx];
    }
    return maybeAfterNode || _afterNode;
  };

  const lookupNewAfterNode = () => {
    if (b2 >= bEnd) return _afterNode;

    let idx = b2 + 1;
    let maybeAfterVNode = newNodes[idx];
    let maybeAfterNode;
    while (maybeAfterVNode) {
      maybeAfterNode = maybeAfterVNode.i.d(maybeAfterVNode);
      if (maybeAfterNode) break;
      if (idx === bEnd) break;
      idx++;
      maybeAfterVNode = newNodes[idx];
    }
    return maybeAfterNode || _afterNode;
  };

  fixes: while (loop) {
    loop = false;

    // Skip prefix
    a = nodes[a1];
    b = newArray[b1];

    _getAfterNode = lookupOldAfterNode;

    while (prevArray[a1].k === b.k) {
      a = a.i.u(b.v, a);

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

    _getAfterNode = lookupNewAfterNode;

    while (prevArray[a2].k === b.k) {
      a = a.i.u(b.v, a);

      newNodes[b2] = a;
      a2--;
      b2--;
      if (a2 < a1 || b2 < b1) break fixes;
      a = nodes[a2];
      b = newArray[b2];
    }

    // Fast path for symmetric swap or reverse
    while (
      prevArray[a1].k === newArray[b2].k &&
      prevArray[a2].k === newArray[b1].k
    ) {
      loop = true;

      a = nodes[a2];
      b = newArray[b1];

      _getAfterNode = lookupNewAfterNode;

      let n = a.i.u(b.v, a);

      newNodes[b1] = n;

      if (a1 !== a2) {
        let moveNode = true;

        const firstPrevNode = nodes[a1];
        let maybeAfterNode = firstPrevNode.i.d(firstPrevNode);

        if (!maybeAfterNode) {
          let idx = a1 + 1;
          let maybeAfterVNode = newNodes[idx];
          while (maybeAfterVNode) {
            maybeAfterNode = maybeAfterVNode.i.d(maybeAfterVNode);
            if (maybeAfterNode) break;
            if (idx === bEnd) break;
            idx++;
            if (idx === a2) {
              moveNode = false;
              break;
            }
            maybeAfterVNode = newNodes[idx];
          }
        }

        if (moveNode) {
          n.i.i(n, parent, maybeAfterNode);
        }

        a = nodes[a1];
        b = newArray[b2];

        const afterNode = lookupNewAfterNode();

        _getAfterNode = () => afterNode;

        n = a.i.u(b.v, a);

        n.i.i(n, parent, afterNode);
        newNodes[b2] = n;
      }

      a1++;
      b1++;
      a2--;
      b2--;

      if (a2 < a1 || b2 < b1) break fixes;
    }
  }

  if (a1 > a2) {
    // Grow
    if (b1 <= b2) {
      newNodes.length = newArray.length;
      const afterNode = lookupNewAfterNode();
      while (1) {
        newNodes[b1] = renderValue(
          newArray[b1].v,
          parent,
          afterNode,
          2,
          vnode,
          rootVnode,
          isDelegationRoot,
        );
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
      const key = prevArray[i].k;
      if (I[key] !== undefined) {
        P[I[key]] = i;
        reusingNodes++;
      } else {
        toRemove.push(n);
      }
    }

    if (
      reusingNodes === 0 &&
      a1 === 0 &&
      b1 === 0 &&
      b2 === bEnd &&
      a2 === nodes.length - 1
    ) {
      // Full replace
      if ((notSingleNode & 2) !== 0) {
        nodes.forEach(removeVNode);
      } else {
        nodes.forEach(n => n.i.z(n));
        nodeSetTextContent.call(parent, "");
      }

      const afterNode = lookupNewAfterNode();

      newNodes = newArray.map(function (props) {
        return renderValue(
          props.v,
          parent,
          afterNode,
          2,
          vnode,
          rootVnode,
          isDelegationRoot,
        );
      });
    } else {
      toRemove.forEach(removeVNode);

      const lisIndices = longestPositiveIncreasingSubsequence(P, b1);

      let lisIdx = lisIndices.length - 1;
      while (b2 >= b1) {
        if (lisIndices[lisIdx] === b2) {
          const c1 = P[lisIndices[lisIdx]];
          let n = nodes[c1];
          const b = newArray[b2];

          _getAfterNode = lookupNewAfterNode;

          n = n.i.u(b.v, n);

          newNodes[b2] = n;

          lisIdx--;
        } else {
          let n;
          const afterNode = lookupNewAfterNode();
          if (P[b2] === -1) {
            n = renderValue(
              newArray[b2].v,
              parent,
              afterNode,
              2,
              vnode,
              rootVnode,
              isDelegationRoot,
            );
          } else {
            _getAfterNode = () => afterNode;

            n = nodes[P[b2]];
            n = n.i.u(newArray[b2].v, n);

            n.i.i(n, parent, afterNode);
          }

          newNodes[b2] = n;
        }

        b2--;
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
});

export function component(init) {
  return props => createComponentNode(props, init);
}

export const key = (k, v) => ({
  t: 2,
  k,
  v,
});

function addHook(hooks, hook) {
  if (!hooks) {
    return hook;
  }
  if (hooks instanceof Array) {
    hooks.push(hook);
    return hooks;
  }
  return [hooks, hook];
}

export function useUnmount(component, hook) {
  component.u = addHook(component.u, hook);
}

// Scheduling

let _flags = 0;
const _resolvedPromise = Promise.resolve();
const _pendingUpdates = box({});

function checkUpdates(vnode) {
  vnode.f = 0;

  const currentDepth = vnode.d;
  _depth = currentDepth + 1;

  _getAfterNode = () => {
    const parent = vnode.x;
    if (parent) return parent.i.w(parent, vnode);
    return null;
  };

  const child = vnode.q;
  vnode.q = child.i.u(vnode.v(vnode.c), child);

  _depth = currentDepth;
}

function flushUpdates() {
  const index = _pendingUpdates.v;

  _flags = 0;
  _pendingUpdates.v = {};

  for (const depth of Object.keys(index)) {
    const vnodes = index[depth];
    for (const vnode of vnodes) {
      if ((vnode.f & 2) !== 0) {
        checkUpdates(vnode);
      }
    }
  }
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

// Contexts

export const createContext = d => ({
  t: {}, // token
  d, // default value
});

const createContextProvider = (context, v) => ({
  t: context.t, // token
  v, // value
});

export function addContext(component, context, v) {
  component.b = addHook(component.b, createContextProvider(context, v));
}

export function useContext(component, context) {
  const p = component.i.b(component, context.t);
  return p ? p.v : context.d;
}
