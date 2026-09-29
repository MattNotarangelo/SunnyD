// Node 22+ ships its own `localStorage` global, which is undefined unless
// Node is started with --localstorage-file, and it shadows jsdom's Storage.
// Point the globals back at jsdom's implementation.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: dom.window[key],
    });
  }
}
