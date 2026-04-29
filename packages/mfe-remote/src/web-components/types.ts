/**
 * Map of DOM property names → values that will be set directly on the
 * element instance (not as HTML attributes).
 */
export type WebComponentProps = Record<string, unknown>;

/**
 * A component handle resolved from the mounted web component.
 * `getHandle` receives the host element; return whatever makes sense
 * (the inner custom element, an exposed API object, etc.).
 */
export type HandleResolver<THandle> = (hostEl: Element) => THandle | undefined;
