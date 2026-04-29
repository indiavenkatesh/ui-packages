import type { ContainerEvent, EventPayload, Unsubscribe } from './types';

type AnyHandler = (payload: unknown) => void;

/**
 * Minimal typed event bus used internally by FloatingContainer.
 * All event names are constrained to ContainerEvent.
 */
export class EventEmitter {
  private readonly handlers = new Map<string, Set<AnyHandler>>();

  on<E extends ContainerEvent>(
    event: E,
    handler: (payload: EventPayload<E>) => void,
  ): Unsubscribe {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    const set = this.handlers.get(event)!;
    set.add(handler as AnyHandler);
    return () => set.delete(handler as AnyHandler);
  }

  emit<E extends ContainerEvent>(event: E, payload: EventPayload<E>): void {
    this.handlers.get(event)?.forEach(fn => fn(payload));
  }

  destroy(): void {
    this.handlers.clear();
  }
}
