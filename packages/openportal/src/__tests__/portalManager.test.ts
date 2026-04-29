import { h } from 'preact';
import {
  registerPortal,
  unregisterPortal,
  getPortal,
  getPortalIndex,
  closePortal,
  updatePortal,
  clearAllPortals,
  clearPortalsByNamespace,
  cleanupPortalElement,
  portalElements,
} from '../portalManager';

// Minimal stub component
const Stub = () => h('div', null, 'stub');

// Reset all state between tests
afterEach(() => {
  clearAllPortals();
});

// ── registerPortal ────────────────────────────────────────────────────────────

describe('registerPortal', () => {
  it('adds a new portal to the registry', () => {
    registerPortal('a', Stub);
    expect(getPortal('a')).toBeDefined();
  });

  it('stores component and props', () => {
    registerPortal('a', Stub, { x: 1 });
    const entry = getPortal('a')!;
    expect(entry.component).toBe(Stub);
    expect(entry.componentProps).toEqual({ x: 1 });
  });

  it('stores namespace when provided', () => {
    registerPortal('a', Stub, undefined, undefined, 'ns');
    expect(getPortal('a')!.namespace).toBe('ns');
  });

  it('assigns an incrementing index', () => {
    registerPortal('a', Stub);
    registerPortal('b', Stub);
    expect(getPortalIndex('a')).toBe(0);
    expect(getPortalIndex('b')).toBe(1);
  });

  it('updates an existing portal in place and calls updateCallback', () => {
    const cb = jest.fn();
    registerPortal('a', Stub, { x: 1 }, cb);
    // Reset mock so we only observe the update call
    cb.mockClear();

    const Stub2 = () => h('span', null);
    registerPortal('a', Stub2, { x: 2 }, cb);

    const entry = getPortal('a')!;
    expect(entry.component).toBe(Stub2);
    expect(entry.componentProps).toEqual({ x: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not add a duplicate index entry on update', () => {
    registerPortal('a', Stub);
    registerPortal('a', Stub); // update
    expect(getPortalIndex('a')).toBe(0);
    // There should still be only one entry at index 0
    registerPortal('b', Stub);
    expect(getPortalIndex('b')).toBe(1);
  });
});

// ── unregisterPortal ──────────────────────────────────────────────────────────

describe('unregisterPortal', () => {
  it('removes the portal from the registry', () => {
    registerPortal('a', Stub);
    unregisterPortal('a');
    expect(getPortal('a')).toBeUndefined();
  });

  it('removes the portal from the order array', () => {
    registerPortal('a', Stub);
    registerPortal('b', Stub);
    unregisterPortal('a');
    expect(getPortalIndex('a')).toBe(-1);
    expect(getPortalIndex('b')).toBe(0);
  });

  it('is a no-op for an unknown id', () => {
    expect(() => unregisterPortal('unknown')).not.toThrow();
  });
});

// ── getPortalIndex ────────────────────────────────────────────────────────────

describe('getPortalIndex', () => {
  it('returns -1 for an unregistered portal', () => {
    expect(getPortalIndex('nope')).toBe(-1);
  });
});

// ── closePortal ───────────────────────────────────────────────────────────────

describe('closePortal', () => {
  it('removes the portal from the registry', () => {
    registerPortal('a', Stub);
    closePortal('a');
    expect(getPortal('a')).toBeUndefined();
  });

  it('removes the DOM element if one is tracked', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const element = document.createElement('div');
    container.appendChild(element);
    portalElements.set('a', { element, container });
    registerPortal('a', Stub);

    closePortal('a');

    expect(container.contains(element)).toBe(false);
    expect(portalElements.has('a')).toBe(false);

    document.body.removeChild(container);
  });

  it('is a no-op for an unknown id', () => {
    expect(() => closePortal('unknown')).not.toThrow();
  });
});

// ── updatePortal ──────────────────────────────────────────────────────────────

describe('updatePortal', () => {
  it('updates component props and triggers updateCallback', () => {
    const cb = jest.fn();
    registerPortal('a', Stub, { x: 1 }, cb);
    cb.mockClear();

    updatePortal('a', undefined, { x: 99 });

    expect(getPortal('a')!.componentProps).toEqual({ x: 99 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('swaps the component and triggers updateCallback', () => {
    const cb = jest.fn();
    registerPortal('a', Stub, {}, cb);
    cb.mockClear();

    const Stub2 = () => h('span', null);
    updatePortal('a', Stub2);

    expect(getPortal('a')!.component).toBe(Stub2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for an unknown id', () => {
    expect(() => updatePortal('unknown', Stub)).not.toThrow();
  });
});

// ── clearAllPortals ───────────────────────────────────────────────────────────

describe('clearAllPortals', () => {
  it('removes all registered portals', () => {
    registerPortal('a', Stub);
    registerPortal('b', Stub);
    clearAllPortals();
    expect(getPortal('a')).toBeUndefined();
    expect(getPortal('b')).toBeUndefined();
  });

  it('is a no-op when registry is already empty', () => {
    expect(() => clearAllPortals()).not.toThrow();
  });
});

// ── clearPortalsByNamespace ───────────────────────────────────────────────────

describe('clearPortalsByNamespace', () => {
  it('closes only portals in the given namespace', () => {
    registerPortal('a', Stub, undefined, undefined, 'ns');
    registerPortal('b', Stub, undefined, undefined, 'ns');
    registerPortal('c', Stub, undefined, undefined, 'other');

    clearPortalsByNamespace('ns');

    expect(getPortal('a')).toBeUndefined();
    expect(getPortal('b')).toBeUndefined();
    expect(getPortal('c')).toBeDefined();
  });

  it('is a no-op when no portals match the namespace', () => {
    registerPortal('a', Stub);
    clearPortalsByNamespace('nope');
    expect(getPortal('a')).toBeDefined();
  });
});

// ── cleanupPortalElement ──────────────────────────────────────────────────────

describe('cleanupPortalElement', () => {
  it('removes the element from the container and the elements map', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const element = document.createElement('div');
    container.appendChild(element);
    portalElements.set('a', { element, container });

    cleanupPortalElement('a');

    expect(container.contains(element)).toBe(false);
    expect(portalElements.has('a')).toBe(false);

    document.body.removeChild(container);
  });

  it('is a no-op for an unknown id', () => {
    expect(() => cleanupPortalElement('unknown')).not.toThrow();
  });
});
