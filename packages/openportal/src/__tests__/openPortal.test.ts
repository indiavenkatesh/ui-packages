import { h } from 'preact';
import { openPortal } from '../openPortal';
import { clearAllPortals, getPortal, getPortalIndex, portalElements } from '../portalManager';

const Stub = ({ label }: { label?: string }) => h('div', null, label ?? 'stub');

afterEach(() => {
  clearAllPortals();
});

// ── DOM creation ──────────────────────────────────────────────────────────────

describe('openPortal — DOM creation', () => {
  it('appends a new element to document.body by default', () => {
    const before = document.body.children.length;
    openPortal('a', Stub);
    expect(document.body.children.length).toBe(before + 1);
  });

  it('appends to a custom container when provided', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    openPortal('a', Stub, {}, container);

    expect(container.children.length).toBe(1);
    expect(portalElements.get('a')!.container).toBe(container);

    document.body.removeChild(container);
  });

  it('tracks the element in portalElements', () => {
    openPortal('a', Stub);
    expect(portalElements.has('a')).toBe(true);
    expect(portalElements.get('a')!.element).toBeInstanceOf(HTMLElement);
  });

  it('does not create a second DOM node on repeat calls with the same id', () => {
    openPortal('a', Stub, { label: 'first' });
    const elementBefore = portalElements.get('a')!.element;

    openPortal('a', Stub, { label: 'second' });
    const elementAfter = portalElements.get('a')!.element;

    expect(elementAfter).toBe(elementBefore);
  });
});

// ── Registry ──────────────────────────────────────────────────────────────────

describe('openPortal — registry', () => {
  it('registers the portal in the registry', () => {
    openPortal('a', Stub, { label: 'hi' });
    const entry = getPortal('a');
    expect(entry).toBeDefined();
    expect(entry!.component).toBe(Stub);
    expect(entry!.componentProps).toMatchObject({ label: 'hi' });
  });

  it('injects portalIndex into componentProps', () => {
    openPortal('a', Stub);
    openPortal('b', Stub);
    expect(getPortalIndex('a')).toBe(0);
    expect(getPortalIndex('b')).toBe(1);
  });

  it('stores namespace on the entry', () => {
    openPortal('a', Stub, {}, undefined, 'ns');
    expect(getPortal('a')!.namespace).toBe('ns');
  });
});

// ── SSR guard ─────────────────────────────────────────────────────────────────

describe('openPortal — SSR guard', () => {
  it('does nothing when window is undefined', () => {
    const original = globalThis.window;
    // @ts-expect-error intentional
    delete globalThis.window;

    expect(() => openPortal('ssr', Stub)).not.toThrow();
    expect(getPortal('ssr')).toBeUndefined();

    globalThis.window = original;
  });
});
