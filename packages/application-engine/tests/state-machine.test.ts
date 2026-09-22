import { describe, expect, it } from 'vitest';
import {
  assertApplicationHistoryConsistent,
  createTrackedApplication,
  transitionApplication,
} from '../src';

describe('application state machine', () => {
  it('records every state transition with timestamps', () => {
    let application = createTrackedApplication(
      'app-1',
      'job-1',
      '2026-08-28T10:00:00.000Z',
    );
    application = transitionApplication(application, 'QUALIFIED', {
      at: '2026-08-28T10:01:00.000Z',
      reason: 'Eligibility passed',
    });
    application = transitionApplication(application, 'TAILORING', {
      at: '2026-08-28T10:02:00.000Z',
    });
    application = transitionApplication(application, 'READY_FOR_REVIEW', {
      at: '2026-08-28T10:03:00.000Z',
    });
    expect(application.history).toHaveLength(4);
    expect(application.status).toBe('READY_FOR_REVIEW');
    expect(application.updatedAt).toBe('2026-08-28T10:03:00.000Z');
    expect(() => assertApplicationHistoryConsistent(application)).not.toThrow();
  });

  it('rejects invalid lifecycle jumps', () => {
    const application = createTrackedApplication('app-1', 'job-1');
    expect(() => transitionApplication(application, 'SUBMITTED')).toThrow(
      'DISCOVERED -> SUBMITTED',
    );
  });

  it('permits a blocked run to return through manual review', () => {
    let application = createTrackedApplication('app-1', 'job-1');
    application = transitionApplication(application, 'MANUAL_REQUIRED');
    application = transitionApplication(application, 'READY_FOR_REVIEW');
    expect(application.status).toBe('READY_FOR_REVIEW');
  });

  it('detects tampered history', () => {
    const application = createTrackedApplication('app-1', 'job-1');
    const tampered = { ...application, status: 'SUBMITTED' as const };
    expect(() => assertApplicationHistoryConsistent(tampered)).toThrow(
      'does not match',
    );
  });
});
