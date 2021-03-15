/**
 * Memoize with cache size = 1
 */
export const memo = fn => {
  let prev, result;
  return next => {
    if (next === prev) return result;
    prev = next;
    return (result = fn(next));
  };
};

/**
 * Mutable array element deletion
 */
export const removeOne = (value, array) => {
  const idx = array.findIndex(item => item === value);
  array.splice(idx, 1);
};
