// Global date range store — all API calls inject these as ?from=&to= params
const _range = { from: '2026-06-06', to: '2026-06-29' };
const _listeners = new Set();

export function getDateRange() {
  return { ..._range };
}

export function setDateRange(from, to) {
  _range.from = from;
  _range.to   = to;
  _listeners.forEach(fn => fn({ ..._range }));
}

export function onDateRangeChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
