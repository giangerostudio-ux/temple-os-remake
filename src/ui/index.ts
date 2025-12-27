/**
 * UI Components Index
 * Phase 3: UI Component Extraction
 * 
 * Re-exports all UI components for convenient importing.
 */

// Types
export * from './types';

// Components
export { ContextMenu, getContextMenu } from './ContextMenu';
export type { ContextMenuOptions } from './ContextMenu';

export { Desktop, BUILTIN_ICONS } from './Desktop';

export { Taskbar, createTaskbar } from './Taskbar';
