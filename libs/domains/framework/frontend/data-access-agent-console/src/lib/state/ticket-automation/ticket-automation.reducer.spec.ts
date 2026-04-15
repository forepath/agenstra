import {
  approveTicketAutomation,
  approveTicketAutomationFailure,
  approveTicketAutomationSuccess,
  cancelTicketAutomationRun,
  cancelTicketAutomationRunFailure,
  cancelTicketAutomationRunSuccess,
  clearTicketAutomation,
  loadTicketAutomation,
  loadTicketAutomationFailure,
  loadTicketAutomationRunDetail,
  loadTicketAutomationRunDetailFailure,
  loadTicketAutomationRunDetailSuccess,
  loadTicketAutomationRuns,
  loadTicketAutomationRunsFailure,
  loadTicketAutomationRunsSuccess,
  loadTicketAutomationSuccess,
  patchTicketAutomation,
  patchTicketAutomationFailure,
  patchTicketAutomationSuccess,
  unapproveTicketAutomation,
  unapproveTicketAutomationFailure,
  unapproveTicketAutomationSuccess,
} from './ticket-automation.actions';
import {
  initialTicketAutomationState,
  ticketAutomationReducer,
  type TicketAutomationState,
} from './ticket-automation.reducer';
import type { TicketAutomationResponseDto, TicketAutomationRunResponseDto } from './ticket-automation.types';

describe('ticketAutomationReducer', () => {
  const mockConfig: TicketAutomationResponseDto = {
    ticketId: 't1',
    eligible: true,
    allowedAgentIds: ['a1'],
    verifierProfile: null,
    requiresApproval: false,
    approvedAt: null,
    approvedByUserId: null,
    approvalBaselineTicketUpdatedAt: null,
    defaultBranchOverride: null,
    nextRetryAt: null,
    consecutiveFailureCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockRun: TicketAutomationRunResponseDto = {
    id: 'r1',
    ticketId: 't1',
    clientId: 'c1',
    agentId: 'a1',
    status: 'running',
    phase: 'agent_loop',
    ticketStatusBefore: 'todo',
    branchName: 'automation/x',
    baseBranch: 'main',
    baseSha: null,
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: null,
    updatedAt: '2024-01-01T00:00:00Z',
    iterationCount: 1,
    completionMarkerSeen: false,
    verificationPassed: null,
    failureCode: null,
    summary: null,
    cancelRequestedAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
  };

  it('returns initial state for unknown action', () => {
    const state = ticketAutomationReducer(undefined, { type: 'UNKNOWN' } as never);
    expect(state).toEqual(initialTicketAutomationState);
  });

  it('clears runs and config when loading a different ticket', () => {
    const prev: TicketAutomationState = {
      ...initialTicketAutomationState,
      activeTicketId: 't1',
      config: mockConfig,
      runs: [mockRun],
    };
    const next = ticketAutomationReducer(prev, loadTicketAutomation({ ticketId: 't2' }));
    expect(next.activeTicketId).toBe('t2');
    expect(next.loadingConfig).toBe(true);
    expect(next.runs).toEqual([]);
    expect(next.config).toBeNull();
    expect(next.runDetail).toBeNull();
  });

  it('merges run into list on detail success and cancel success', () => {
    let state = ticketAutomationReducer(
      initialTicketAutomationState,
      loadTicketAutomationRunsSuccess({ runs: [{ ...mockRun, id: 'r-old' }] }),
    );
    const updated = { ...mockRun, id: 'r-old', status: 'cancelled' as const };
    state = ticketAutomationReducer(state, cancelTicketAutomationRunSuccess({ run: updated }));
    expect(state.runs).toEqual([updated]);
    expect(state.saving).toBe(false);
  });

  it('handles patch, approve and unapprove success', () => {
    let state = ticketAutomationReducer(
      initialTicketAutomationState,
      patchTicketAutomation({ ticketId: 't1', dto: {} }),
    );
    expect(state.saving).toBe(true);
    state = ticketAutomationReducer(state, patchTicketAutomationSuccess({ config: mockConfig }));
    expect(state.saving).toBe(false);
    expect(state.config).toEqual(mockConfig);
    state = ticketAutomationReducer(state, approveTicketAutomation({ ticketId: 't1' }));
    state = ticketAutomationReducer(
      state,
      approveTicketAutomationSuccess({ config: { ...mockConfig, approvedAt: 'x' } }),
    );
    expect(state.config?.approvedAt).toBe('x');
    state = ticketAutomationReducer(state, unapproveTicketAutomation({ ticketId: 't1' }));
    state = ticketAutomationReducer(
      state,
      unapproveTicketAutomationSuccess({ config: { ...mockConfig, approvedAt: null } }),
    );
    expect(state.config?.approvedAt).toBeNull();
  });

  it('clears on clearTicketAutomation', () => {
    const prev: TicketAutomationState = {
      ...initialTicketAutomationState,
      config: mockConfig,
      error: 'x',
    };
    const next = ticketAutomationReducer(prev, clearTicketAutomation());
    expect(next).toEqual(initialTicketAutomationState);
  });

  it('records failures', () => {
    expect(
      ticketAutomationReducer(initialTicketAutomationState, loadTicketAutomationFailure({ error: 'e' })).error,
    ).toBe('e');
    expect(
      ticketAutomationReducer(initialTicketAutomationState, loadTicketAutomationRunsFailure({ error: 'r' })).error,
    ).toBe('r');
    expect(
      ticketAutomationReducer(initialTicketAutomationState, loadTicketAutomationRunDetailFailure({ error: 'd' })).error,
    ).toBe('d');
    expect(
      ticketAutomationReducer(
        { ...initialTicketAutomationState, saving: true },
        patchTicketAutomationFailure({ error: 'p' }),
      ).error,
    ).toBe('p');
    expect(
      ticketAutomationReducer(
        { ...initialTicketAutomationState, saving: true },
        approveTicketAutomationFailure({ error: 'a' }),
      ).error,
    ).toBe('a');
    expect(
      ticketAutomationReducer(
        { ...initialTicketAutomationState, saving: true },
        unapproveTicketAutomationFailure({ error: 'u' }),
      ).error,
    ).toBe('u');
    expect(
      ticketAutomationReducer(
        { ...initialTicketAutomationState, saving: true },
        cancelTicketAutomationRunFailure({ error: 'c' }),
      ).error,
    ).toBe('c');
  });

  it('sets loading flags for run detail', () => {
    let state = ticketAutomationReducer(
      initialTicketAutomationState,
      loadTicketAutomationRunDetail({ ticketId: 't1', runId: 'r1' }),
    );
    expect(state.loadingRunDetail).toBe(true);
    state = ticketAutomationReducer(state, loadTicketAutomationRunDetailSuccess({ run: mockRun }));
    expect(state.loadingRunDetail).toBe(false);
    expect(state.runDetail).toEqual(mockRun);
  });
});
