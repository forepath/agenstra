import * as KnowledgeActions from './knowledge.actions';
import { initialKnowledgeState, knowledgeReducer, type KnowledgeState } from './knowledge.reducer';
import { type KnowledgeNodeDto } from './knowledge.types';

describe('knowledgeReducer', () => {
  const mockNode: KnowledgeNodeDto = {
    id: 'node-1',
    shas: { short: 'abc1234', long: 'abc1234567890' },
    clientId: 'client-1',
    nodeType: 'page',
    parentId: null,
    title: 'Page',
    content: 'content',
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('returns initial state for unknown action', () => {
    const state = knowledgeReducer(undefined, { type: 'UNKNOWN' } as never);

    expect(state).toEqual(initialKnowledgeState);
  });

  it('handles loadKnowledgeTree', () => {
    const prev: KnowledgeState = { ...initialKnowledgeState, error: 'x' };
    const next = knowledgeReducer(prev, KnowledgeActions.loadKnowledgeTree({ clientId: 'client-1' }));

    expect(next.activeClientId).toBe('client-1');
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('handles loadKnowledgeTreeSuccess', () => {
    const prev: KnowledgeState = { ...initialKnowledgeState, loading: true };
    const next = knowledgeReducer(
      prev,
      KnowledgeActions.loadKnowledgeTreeSuccess({ clientId: 'client-1', tree: [mockNode] }),
    );

    expect(next.loading).toBe(false);
    expect(next.tree).toEqual([mockNode]);
  });

  it('handles selectKnowledgeNode', () => {
    const next = knowledgeReducer(initialKnowledgeState, KnowledgeActions.selectKnowledgeNode({ nodeId: 'node-1' }));

    expect(next.selectedNodeId).toBe('node-1');
  });

  it('handles deleteKnowledgeNodeSuccess and clears selected id', () => {
    const prev: KnowledgeState = { ...initialKnowledgeState, selectedNodeId: 'node-1', loading: true };
    const next = knowledgeReducer(prev, KnowledgeActions.deleteKnowledgeNodeSuccess({ id: 'node-1' }));

    expect(next.selectedNodeId).toBeNull();
    expect(next.loading).toBe(false);
    expect(next.error).toBeNull();
  });

  it('keeps selection/activity when deleting a different node', () => {
    const activity = [
      {
        id: 'a1',
        pageId: 'node-1',
        occurredAt: '2024-01-01T00:00:00Z',
        actorType: 'human' as const,
        actorUserId: 'u1',
        actorEmail: 'user@example.com',
        actionType: 'CREATED' as const,
        payload: {},
      },
    ];
    const prev: KnowledgeState = {
      ...initialKnowledgeState,
      selectedNodeId: 'node-1',
      activity,
      loading: true,
    };
    const next = knowledgeReducer(prev, KnowledgeActions.deleteKnowledgeNodeSuccess({ id: 'other-node' }));

    expect(next.selectedNodeId).toBe('node-1');
    expect(next.activity).toEqual(activity);
    expect(next.loading).toBe(false);
  });

  it('handles loadKnowledgeRelationsSuccess', () => {
    const relation = {
      id: 'relation-1',
      clientId: 'client-1',
      sourceType: 'page' as const,
      sourceId: 'node-1',
      targetType: 'page' as const,
      targetNodeId: 'node-2',
      targetTicketLongSha: null,
      createdAt: '2024-01-01T00:00:00Z',
    };
    const prev: KnowledgeState = { ...initialKnowledgeState, relationsLoading: true };
    const next = knowledgeReducer(prev, KnowledgeActions.loadKnowledgeRelationsSuccess({ relations: [relation] }));

    expect(next.relationsLoading).toBe(false);
    expect(next.relations).toEqual([relation]);
  });

  it('clears activity when selecting null node', () => {
    const prev: KnowledgeState = {
      ...initialKnowledgeState,
      selectedNodeId: 'node-1',
      activity: [
        {
          id: 'a1',
          pageId: 'node-1',
          occurredAt: '2024-01-01T00:00:00Z',
          actorType: 'human',
          actorUserId: null,
          actorEmail: null,
          actionType: 'CREATED',
          payload: {},
        },
      ],
    };
    const next = knowledgeReducer(prev, KnowledgeActions.selectKnowledgeNode({ nodeId: null }));

    expect(next.selectedNodeId).toBeNull();
    expect(next.activity).toEqual([]);
  });
});
