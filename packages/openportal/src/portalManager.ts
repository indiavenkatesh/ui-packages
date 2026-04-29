import { ComponentType } from 'preact';

export interface PortalEntry {
  id: string;
  component: ComponentType<any>;
  componentProps?: Record<string, any>;
  updateCallback?: () => void;
  namespace?: string;
}

interface PortalElement {
  element: HTMLElement;
  container: HTMLElement;
}

const portalRegistry: Map<string, PortalEntry> = new Map();
const portalOrder: string[] = [];
export const portalElements: Map<string, PortalElement> = new Map();

// ── Portal registry helpers ────────────────────────────────────────────────

export function getPortalIndex(id: string): number {
  return portalOrder.indexOf(id);
}

export function registerPortal(
  id: string,
  component: ComponentType<any>,
  componentProps?: Record<string, any>,
  updateCallback?: () => void,
  namespace?: string,
): void {
  const existingPortal = portalRegistry.get(id);

  if (existingPortal) {
    existingPortal.component = component;
    if (componentProps !== undefined) existingPortal.componentProps = componentProps;
    if (updateCallback !== undefined) existingPortal.updateCallback = updateCallback;
    if (namespace !== undefined) existingPortal.namespace = namespace;
    if (updateCallback) updateCallback();
    return;
  }

  portalRegistry.set(id, {
    id,
    component,
    ...(componentProps !== undefined && { componentProps }),
    ...(updateCallback !== undefined && { updateCallback }),
    ...(namespace !== undefined && { namespace }),
  });

  portalOrder.push(id);
}

export function unregisterPortal(id: string): void {
  if (!portalRegistry.has(id)) return;
  portalRegistry.delete(id);
  const index = portalOrder.indexOf(id);
  if (index > -1) portalOrder.splice(index, 1);
}

export function getPortal(id: string): PortalEntry | undefined {
  return portalRegistry.get(id);
}

export function cleanupPortalElement(id: string): void {
  const portalElement = portalElements.get(id);
  if (portalElement) {
    const { element, container } = portalElement;
    if (element && element.parentNode) {
      container.removeChild(element);
    }
    portalElements.delete(id);
  }
}

export function closePortal(id: string): void {
  const portal = getPortal(id);
  if (!portal) return;
  unregisterPortal(id);
  cleanupPortalElement(id);
  // updateCallback is intentionally not called here — the portal is closed,
  // there is nothing left to re-render.
}

export function updatePortal(
  id: string,
  component?: ComponentType<any>,
  componentProps?: Record<string, any>,
): void {
  const portal = getPortal(id);
  if (!portal) return;
  if (component) portal.component = component;
  if (componentProps !== undefined) portal.componentProps = componentProps;
  if (portal.updateCallback) portal.updateCallback();
}

export function clearAllPortals(): void {
  [...portalRegistry.keys()].forEach((id) => closePortal(id));
}

export function clearPortalsByNamespace(namespace: string): void {
  [...portalRegistry.entries()]
    .filter(([, entry]) => entry.namespace === namespace)
    .forEach(([id]) => closePortal(id));
}
