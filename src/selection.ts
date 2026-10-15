export function rangeSelection(
  order: string[],
  anchor: string | null,
  target: string,
  previous: string[],
  shift: boolean,
  toggle: boolean,
) {
  const from = order.indexOf(anchor || ''),
    to = order.indexOf(target);
  if (shift && from >= 0 && to >= 0) return order.slice(Math.min(from, to), Math.max(from, to) + 1);
  if (toggle)
    return previous.includes(target)
      ? previous.filter((id) => id !== target)
      : [...previous, target];
  return [target];
}
