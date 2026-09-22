import type { AutomationEvent, AutomationRun, BrowserState } from './types';

export function createRun(): AutomationRun {
  return { state: 'OPEN_APPLICATION', events: [] };
}

export function record(
  run: AutomationRun,
  state: BrowserState,
  message: string,
  url?: string,
  metadata?: Record<string, unknown>,
): AutomationEvent {
  run.state = state;
  const event = {
    state,
    message,
    timestamp: new Date().toISOString(),
    url,
    metadata,
  };
  run.events.push(event);
  return event;
}
