// Public API — @indiavenkatesh/floating-container

export { FloatingContainer } from './FloatingContainer';

export type {
  // Config
  IFloatingContainerConfig,
  DisplayMode,
  AnchorPosition,
  IPositionOptions,
  IDimensionOptions,
  // Adapter
  IMountAdapter,
  // State
  IContainerState,
  LifecycleState,
  // Events
  ContainerEvent,
  EventPayload,
  Unsubscribe,
} from './types';
