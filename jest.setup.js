// Jest setup: provide minimal browser globals required by react-test-renderer and some components
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

if (typeof window.dispatchEvent !== 'function') {
  window.dispatchEvent = () => true;
}

if (typeof window.addEventListener !== 'function') {
  window.addEventListener = () => {};
}

if (typeof window.removeEventListener !== 'function') {
  window.removeEventListener = () => {};
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = function () {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onchange: null,
      dispatchEvent: () => true
    };
  };
}

if (typeof global.requestAnimationFrame !== 'function') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

// Silence act() warnings by ensuring timers are available
jest.useFakeTimers && jest.useFakeTimers();
