/**
 * Utility functions for generating automation IDs consistently across the revamp application
 */

/**
 * Generates a consistent automation ID based on component type and context
 * @param componentType - The type of component (button, input, form, etc.)
 * @param context - The context or page where the component is used
 * @param identifier - Unique identifier for the component
 * @returns A formatted automation ID string
 */
export function generateAutomationId(
  componentType: string,
  context: string,
  identifier?: string,
): string {
  const parts = [componentType, context];
  if (identifier) {
    parts.push(identifier);
  }
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

/**
 * Common automation ID generators for frequently used components
 */
export const AutomationIds = {
  button: (context: string, action: string) => generateAutomationId('btn', context, action),
  input: (context: string, fieldName: string) => generateAutomationId('input', context, fieldName),
  form: (context: string, formType: string) => generateAutomationId('form', context, formType),
  modal: (context: string, modalType: string) => generateAutomationId('modal', context, modalType),
  table: (context: string, tableType: string) => generateAutomationId('table', context, tableType),
  nav: (context: string, navItem: string) => generateAutomationId('nav', context, navItem),
  tab: (context: string, tabName: string) => generateAutomationId('tab', context, tabName),
  card: (context: string, cardType: string) => generateAutomationId('card', context, cardType),
  icon: (context: string, iconType: string) => generateAutomationId('icon', context, iconType),
  link: (context: string, linkType: string) => generateAutomationId('link', context, linkType),
  select: (context: string, selectType: string) =>
    generateAutomationId('select', context, selectType),
  checkbox: (context: string, checkboxType: string) =>
    generateAutomationId('checkbox', context, checkboxType),
  radio: (context: string, radioType: string) => generateAutomationId('radio', context, radioType),
  toggle: (context: string, toggleType: string) =>
    generateAutomationId('toggle', context, toggleType),
  search: (context: string, searchType: string) =>
    generateAutomationId('search', context, searchType),
  filter: (context: string, filterType: string) =>
    generateAutomationId('filter', context, filterType),
  list: (context: string, listType: string) => generateAutomationId('list', context, listType),
  item: (context: string, itemType: string, index?: number) =>
    generateAutomationId('item', context, itemType + (index !== undefined ? `-${index}` : '')),
  container: (context: string, containerType: string) =>
    generateAutomationId('container', context, containerType),
  section: (context: string, sectionType: string) =>
    generateAutomationId('section', context, sectionType),
  header: (context: string, headerType: string) =>
    generateAutomationId('header', context, headerType),
  footer: (context: string, footerType: string) =>
    generateAutomationId('footer', context, footerType),
  sidebar: (context: string, sidebarType: string) =>
    generateAutomationId('sidebar', context, sidebarType),
  panel: (context: string, panelType: string) => generateAutomationId('panel', context, panelType),
  dialog: (context: string, dialogType: string) =>
    generateAutomationId('dialog', context, dialogType),
  tooltip: (context: string, tooltipType: string) =>
    generateAutomationId('tooltip', context, tooltipType),
  badge: (context: string, badgeType: string) => generateAutomationId('badge', context, badgeType),
  status: (context: string, statusType: string) =>
    generateAutomationId('status', context, statusType),
  progress: (context: string, progressType: string) =>
    generateAutomationId('progress', context, progressType),
  loader: (context: string, loaderType: string) =>
    generateAutomationId('loader', context, loaderType),
  error: (context: string, errorType: string) => generateAutomationId('error', context, errorType),
  success: (context: string, successType: string) =>
    generateAutomationId('success', context, successType),
  warning: (context: string, warningType: string) =>
    generateAutomationId('warning', context, warningType),
  info: (context: string, infoType: string) => generateAutomationId('info', context, infoType),
  custom: (context: string, componentType: string, identifier?: string) =>
    generateAutomationId(componentType, context, identifier),
};

/**
 * Helper function to add automation ID to component props
 */
export function withAutomationId<T extends Record<string, unknown>>(
  props: T,
  automationId: string,
): T & { 'data-automation-id': string } {
  return {
    ...props,
    'data-automation-id': automationId,
  };
}

/**
 * Hook for generating automation IDs with consistent context
 */
export function useAutomationId(context: string) {
  return {
    button: (action: string) => AutomationIds.button(context, action),
    input: (fieldName: string) => AutomationIds.input(context, fieldName),
    form: (formType: string) => AutomationIds.form(context, formType),
    modal: (modalType: string) => AutomationIds.modal(context, modalType),
    table: (tableType: string) => AutomationIds.table(context, tableType),
    nav: (navItem: string) => AutomationIds.nav(context, navItem),
    tab: (tabName: string) => AutomationIds.tab(context, tabName),
    card: (cardType: string) => AutomationIds.card(context, cardType),
    icon: (iconType: string) => AutomationIds.icon(context, iconType),
    link: (linkType: string) => AutomationIds.link(context, linkType),
    select: (selectType: string) => AutomationIds.select(context, selectType),
    checkbox: (checkboxType: string) => AutomationIds.checkbox(context, checkboxType),
    radio: (radioType: string) => AutomationIds.radio(context, radioType),
    toggle: (toggleType: string) => AutomationIds.toggle(context, toggleType),
    search: (searchType: string) => AutomationIds.search(context, searchType),
    filter: (filterType: string) => AutomationIds.filter(context, filterType),
    list: (listType: string) => AutomationIds.list(context, listType),
    item: (itemType: string, index?: number) => AutomationIds.item(context, itemType, index),
    container: (containerType: string) => AutomationIds.container(context, containerType),
    section: (sectionType: string) => AutomationIds.section(context, sectionType),
    header: (headerType: string) => AutomationIds.header(context, headerType),
    footer: (footerType: string) => AutomationIds.footer(context, footerType),
    sidebar: (sidebarType: string) => AutomationIds.sidebar(context, sidebarType),
    panel: (panelType: string) => AutomationIds.panel(context, panelType),
    dialog: (dialogType: string) => AutomationIds.dialog(context, dialogType),
    tooltip: (tooltipType: string) => AutomationIds.tooltip(context, tooltipType),
    badge: (badgeType: string) => AutomationIds.badge(context, badgeType),
    status: (statusType: string) => AutomationIds.status(context, statusType),
    progress: (progressType: string) => AutomationIds.progress(context, progressType),
    loader: (loaderType: string) => AutomationIds.loader(context, loaderType),
    error: (errorType: string) => AutomationIds.error(context, errorType),
    success: (successType: string) => AutomationIds.success(context, successType),
    warning: (warningType: string) => AutomationIds.warning(context, warningType),
    info: (infoType: string) => AutomationIds.info(context, infoType),
    custom: (componentType: string, identifier?: string) =>
      AutomationIds.custom(context, componentType, identifier),
  };
}
