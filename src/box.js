import { invalidate, useUnmount } from "./index";

const createLinkedNode = v => ({
  p: undefined,
  n: undefined,
  v,
});

const createLinkedList = () => ({
  h: undefined,
  t: undefined,
});

const appendLinkedNode = (n, l) => {
  const tail = l.t;
  if (tail === undefined) {
    l.h = n;
  } else {
    tail.n = n;
    n.p = tail;
  }
  l.t = n;
};

const removeLinkedNode = (n, l) => {
  const head = l.h;
  const tail = l.t;
  const prev = n.p;
  const next = n.n;
  if (prev) prev.n = next;
  if (next) next.p = prev;
  if (n === head) l.h = next;
  if (n === tail) l.t = prev;
};

export const box = init => ({
  v: init,
  s: createLinkedList(),
});

export const read = box => box.v;

export const subscribe = (cb, box) => {
  const n = createLinkedNode(cb);
  appendLinkedNode(n, box.s);
  return () => removeLinkedNode(n, box.s);
};

export const write = (nextValue, box) => {
  box.v = nextValue;
  const subs = box.s;
  let next = subs.h;
  while (next !== undefined) {
    next.v(nextValue);
    next = next.n;
  }
};

const MEMO_INIT = {};

const memo = fn => {
  let prev = MEMO_INIT,
    result;
  return next => {
    if (next === prev) return result;
    prev = next;
    return (result = fn(next));
  };
};

export const useSubscription = (c, source, select = v => v) => {
  let _prop, _prev, _value;
  const setup = memo(prop => {
    _prop = prop;
    _value = read(source);
  });

  const unsub = subscribe(value => {
    _value = value;
    const next = select(value, _prop);
    if (next !== _prev) {
      _prev = next;
      invalidate(c);
    }
  }, source);

  useUnmount(c, unsub);

  return prop => {
    setup(prop);
    return (_prev = select(_value, prop));
  };
};

export const usePropSubscription = c => {
  let _prev, unsub;
  const setup = memo(source => {
    if (unsub) unsub();

    _prev = read(source);

    unsub = subscribe(next => {
      if (next !== _prev) {
        _prev = next;
        invalidate(c);
      }
    }, source);
  });

  useUnmount(c, () => {
    if (unsub) unsub();
  });

  return source => {
    setup(source);
    return _prev;
  };
};
