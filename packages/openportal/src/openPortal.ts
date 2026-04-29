import { render, ComponentType, h } from 'preact';

import {
  registerPortal,
  getPortalIndex,
  getPortal,
  portalElements,
  cleanupPortalElement,
} from './portalManager';

function renderPortal(id: string): void {
  const portalElement = portalElements.get(id);
  if (!portalElement) return;

  const portal = getPortal(id);
  if (!portal) {
    cleanupPortalElement(id);
    return;
  }

  const index = getPortalIndex(id);
  if (index === -1) return;

  render(
    h(portal.component, { ...(portal.componentProps ?? {}), portalIndex: index }),
    portalElement.element,
  );
}

export function openPortal(
  id: string,
  component: ComponentType<any>,
  componentProps?: Record<string, any>,
  container?: HTMLElement,
  namespace?: string,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const isNew = !portalElements.has(id);

  if (isNew) {
    const targetContainer = container ?? document.body;
    const element = document.createElement('div');
    targetContainer.appendChild(element);
    portalElements.set(id, { element, container: targetContainer });
  }

  // For existing portals registerPortal fires updateCallback (= renderPortal) internally.
  // For new portals it does not, so we call renderPortal explicitly below.
  registerPortal(id, component, componentProps, () => renderPortal(id), namespace);

  if (isNew) renderPortal(id);
}
