import { invalidate } from "./index";
import { removeOne } from "./utils";

export const box = init => ({
  v: init,
  s: [],
});

export const read = box => box.v;

export const write = (nextValue, box) => {
  box.v = nextValue;
  box.s.forEach(cb => cb(nextValue));
};

export const subscribe = (cb, box) => {
  box.s.push(cb);
  return () => removeOne(cb, box.s);
};

export const keyedSelector = (signal, getKeys, selector, refs) => {
  const cache = new WeakMap();

  let signalData = read(signal);
  subscribe(data => {
    signalData = data;
    const items = getKeys();

    let i = 0,
      len = items.length;
    while (i < len) {
      const item = items[i];
      const prev = cache.get(item);
      const next = selector(item, signalData);
      cache.set(item, next);

      const shouldUpdate = next !== prev;
      if (shouldUpdate) {
        const ref = refs.get(item);
        if (ref) invalidate(ref);
      }

      i++;
    }
  }, signal);

  const get = item => {
    const next = selector(item, signalData);
    cache.set(item, next);
    return next;
  };

  return get;
};

export const createSelector = (signal, getRef, selector = v => v) => {
  let prev = selector(read(signal));
  subscribe(data => {
    const next = selector(data);
    const shouldUpdate = next !== prev;
    prev = next;

    if (shouldUpdate) {
      const ref = getRef();
      if (ref) invalidate(ref);
    }
  }, signal);
  return () => prev;
};

export const unchanged = input => {
  const output = box(read(input));
  let prev;
  subscribe(next => {
    if (next !== prev) {
      prev = next;
      return;
    }
    prev = next;
    write(next, output);
  }, input);
  return output;
};
