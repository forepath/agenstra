import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AgentsFacade,
  BOARD_LANE_STATUSES,
  ClientsFacade,
  deleteTicketSuccess,
  filterTicketsForGlobalSearch,
  SocketsFacade,
  TicketsFacade,
  TicketsService,
  type AgentResponseDto,
  type BoardLaneStatus,
  type ClientResponseDto,
  type TicketBoardRow,
  type TicketGlobalSearchHit,
  type TicketPriority,
  type TicketResponseDto,
  type TicketStatus,
} from '@forepath/framework/frontend/data-access-agent-console';
import { Actions, ofType } from '@ngrx/effects';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  race,
  switchMap,
  take,
  tap,
  timer,
} from 'rxjs';
import { storeAgentConsoleChatDraft } from './chat-draft-storage';
import { buildTicketBodyHierarchyContext } from './ticket-body-hierarchy-context';

const ALL_TICKET_STATUSES: TicketStatus[] = ['draft', 'todo', 'in_progress', 'prototype', 'done', 'closed'];

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}

interface TicketDetailSubtaskRow {
  ticket: TicketResponseDto;
  depth: number;
}

@Component({
  selector: 'framework-tickets-board',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './tickets-board.component.html',
  styleUrls: ['./tickets-board.component.scss'],
})
export class TicketsBoardComponent implements OnInit, AfterViewInit {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly agentsFacade = inject(AgentsFacade);
  private readonly ticketsFacade = inject(TicketsFacade);
  private readonly ticketsService = inject(TicketsService);
  private readonly socketsFacade = inject(SocketsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actions$ = inject(Actions);

  @ViewChild('ticketDetailModal', { static: false })
  private ticketDetailModal?: ElementRef<HTMLDivElement>;

  @ViewChild('createTicketModal', { static: false })
  private createTicketModal?: ElementRef<HTMLDivElement>;

  @ViewChild('deleteTicketConfirmModal', { static: false })
  private deleteTicketConfirmModal?: ElementRef<HTMLDivElement>;

  @ViewChild('workspaceSwitchModal', { static: false })
  private workspaceSwitchModal?: ElementRef<HTMLDivElement>;

  @ViewChild('globalSearchModal', { static: false })
  private globalSearchModal?: ElementRef<HTMLDivElement>;

  @ViewChild('globalSearchInput', { static: false })
  private globalSearchInput?: ElementRef<HTMLInputElement>;

  readonly lanes = BOARD_LANE_STATUSES;
  readonly statusOptions: TicketStatus[] = [...ALL_TICKET_STATUSES];
  readonly priorityOptions: TicketPriority[] = ['low', 'medium', 'high', 'critical'];
  readonly ticketsBoardRowsByStatus$ = this.ticketsFacade.ticketsBoardRowsByStatus$;
  readonly detailBreadcrumb$ = this.ticketsFacade.detailBreadcrumb$;
  readonly loadingList$ = this.ticketsFacade.loadingList$;
  readonly listError$ = this.ticketsFacade.error$;
  /** Workspace for this board: URL `:clientId` wins so deep links load before store catches up. */
  readonly effectiveClientId$ = combineLatest([this.route.paramMap, this.clientsFacade.activeClientId$]).pipe(
    map(([params, active]) => {
      const fromRoute = params.get('clientId')?.trim();
      return (fromRoute || active || null) as string | null;
    }),
    distinctUntilChanged(),
  );
  readonly effectiveClientId = toSignal(this.effectiveClientId$, { initialValue: null });

  readonly clients$ = this.clientsFacade.clients$;
  readonly clientsLoading$ = this.clientsFacade.loading$;

  /** Workspace shown for the current board URL / active client (name when list is loaded). */
  readonly effectiveWorkspace$ = combineLatest([this.effectiveClientId$, this.clientsFacade.clients$]).pipe(
    map(([id, clients]) => {
      if (!id) {
        return null;
      }
      return { id, client: clients.find((c) => c.id === id) ?? null };
    }),
    distinctUntilChanged(
      (a, b) =>
        a?.id === b?.id &&
        (a?.client?.id ?? '') === (b?.client?.id ?? '') &&
        (a?.client?.name ?? '') === (b?.client?.name ?? ''),
    ),
  );
  readonly effectiveWorkspace = toSignal(this.effectiveWorkspace$, { initialValue: null });

  /** Filter text for the workspace switcher modal (same idea as the workspace list on /clients). */
  workspaceSwitchSearch = signal('');

  readonly detailLoading$ = this.ticketsFacade.loadingDetail$;
  readonly comments$ = this.ticketsFacade.comments$.pipe(map((comments) => [...comments].reverse()));
  readonly activity$ = this.ticketsFacade.activity$;
  readonly saving$ = this.ticketsFacade.saving$;

  readonly detail = toSignal(this.ticketsFacade.detail$, { initialValue: null });
  readonly detailBreadcrumb = toSignal(this.ticketsFacade.detailBreadcrumb$, { initialValue: [] });
  readonly ticketsList = toSignal(this.ticketsFacade.tickets$, { initialValue: [] });

  globalSearchQuery = signal('');
  readonly globalSearchHits = computed(() =>
    filterTicketsForGlobalSearch(this.ticketsList(), this.globalSearchQuery(), this.effectiveClientId()),
  );

  /** Direct subtasks only (same depth rule as swimlanes; deeper work stays on the subtask’s own detail). */
  readonly detailSubtaskRows = computed((): TicketDetailSubtaskRow[] => {
    const children = this.detail()?.children ?? [];
    const sorted = [...children].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted.map((ticket) => ({ ticket, depth: 1 }));
  });

  readonly agents$: Observable<AgentResponseDto[]> = this.effectiveClientId$.pipe(
    switchMap((clientId) => (clientId ? this.agentsFacade.getClientAgents$(clientId) : of([]))),
  );

  readonly chatCapableAgents$: Observable<AgentResponseDto[]> = this.agents$.pipe(
    map((agents) => agents.filter((a) => a.agentType !== 'openclaw')),
  );

  selectedLane = signal<BoardLaneStatus>('draft');
  selectedAgentForAi = signal<string | null>(null);
  newCommentText = signal('');
  prototypeError = signal<string | null>(null);
  bodyGenError = signal<string | null>(null);
  bodyGenInProgress = signal(false);
  pendingBodyCorrelation = signal<string | null>(null);
  private activeGenerationId: string | null = null;

  /** HTML5 DnD (same pattern as file-tree). */
  draggedTicket = signal<TicketResponseDto | null>(null);
  dragOverLane = signal<BoardLaneStatus | null>(null);
  /** Skip opening detail right after a drag ended (browser may emit click). */
  private suppressCardClickUntil = 0;

  /** Per-swimlane list filter (same substring behavior as the workspace list on /clients). */
  readonly laneSearchQueries = signal({
    draft: '',
    todo: '',
    in_progress: '',
    prototype: '',
  } satisfies Record<BoardLaneStatus, string>);

  createTicketTitle = signal('');
  createTicketContent = signal('');
  createTicketStatus = signal<TicketStatus>('draft');
  createTicketPriority = signal<TicketPriority>('medium');
  /** When set, new ticket is created as a subtask of this ticket (clientId inferred by API). */
  createTicketParentId = signal<string | null>(null);
  createTicketError = signal<string | null>(null);

  /** Set when opening the delete confirmation modal (stacked over detail modal). */
  ticketPendingDelete = signal<{ id: string; title: string } | null>(null);

  /** Local description text; synced from `detail` when the open ticket id changes. */
  readonly descriptionDraft = signal('');
  private descriptionDraftSyncTicketId: string | null = null;

  constructor() {
    effect(() => {
      const d = this.detail();
      if (!d) {
        this.descriptionDraftSyncTicketId = null;
        this.descriptionDraft.set('');
        return;
      }
      if (this.descriptionDraftSyncTicketId !== d.id) {
        this.descriptionDraftSyncTicketId = d.id;
        this.descriptionDraft.set(d.content ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.clientsFacade.loadClients();

    this.effectiveClientId$
      .pipe(
        distinctUntilChanged(),
        filter((id): id is string => !!id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((clientId) => {
        this.agentsFacade.loadClientAgents(clientId);
        this.ticketsFacade.loadTickets({ clientId });
      });

    this.socketsFacade.ticketBodyLastResult$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(
          (r) => !!r && this.pendingBodyCorrelation() !== null && r.correlationId === this.pendingBodyCorrelation(),
        ),
      )
      .subscribe((r) => {
        if (!r) {
          return;
        }
        this.pendingBodyCorrelation.set(null);
        this.bodyGenInProgress.set(false);
        const generationId = this.activeGenerationId;
        const ticketId = this.detail()?.id;
        const clientId = this.effectiveClientId();
        if (!ticketId || !generationId || !clientId) {
          this.bodyGenError.set(
            $localize`:@@featureTicketsBoard-bodyGenMissingContext:Could not apply generated text (missing session).`,
          );
          return;
        }
        if (!r.success) {
          this.bodyGenError.set(r.errorMessage ?? $localize`:@@featureTicketsBoard-bodyGenFailed:Generation failed`);
          this.activeGenerationId = null;
          return;
        }
        const text = r.enhancedText ?? '';
        this.ticketsService.applyGeneratedBody(ticketId, generationId, text).subscribe({
          next: () => {
            this.activeGenerationId = null;
            this.bodyGenError.set(null);
            this.ticketsFacade.loadTickets({ clientId });
            this.ticketsFacade.openDetail(ticketId);
          },
          error: (err: unknown) => {
            this.activeGenerationId = null;
            this.bodyGenError.set(this.httpErrorMessage(err));
          },
        });
      });
  }

  ngAfterViewInit(): void {
    this.effectiveClientId$
      .pipe(
        distinctUntilChanged(),
        filter((id) => !id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        setTimeout(() => this.openWorkspaceSwitchModal(), 0);
      });
  }

  setLaneSearchQuery(lane: BoardLaneStatus, value: string): void {
    this.laneSearchQueries.update((queries) => ({ ...queries, [lane]: value }));
  }

  filteredLaneRows(lane: BoardLaneStatus, rows: TicketBoardRow[] | undefined): TicketBoardRow[] {
    const list = rows ?? [];
    const query = (this.laneSearchQueries()[lane] ?? '').trim();
    if (!query) {
      return list;
    }
    const needle = query.toLowerCase();
    return list.filter((row) => JSON.stringify(row.ticket).toLowerCase().includes(needle));
  }

  laneLabel(status: TicketStatus): string {
    switch (status) {
      case 'draft':
        return $localize`:@@featureTicketsBoard-laneDraft:Draft`;
      case 'todo':
        return $localize`:@@featureTicketsBoard-laneTodo:To do`;
      case 'in_progress':
        return $localize`:@@featureTicketsBoard-laneInProgress:In progress`;
      case 'prototype':
        return $localize`:@@featureTicketsBoard-lanePrototype:Prototype`;
      case 'done':
        return $localize`:@@featureTicketsBoard-laneDone:Done`;
      case 'closed':
        return $localize`:@@featureTicketsBoard-laneClosed:Closed`;
      default:
        return status;
    }
  }

  priorityLabel(priority: TicketPriority): string {
    switch (priority) {
      case 'low':
        return $localize`:@@featureTicketsBoard-priorityLow:Low`;
      case 'medium':
        return $localize`:@@featureTicketsBoard-priorityMedium:Medium`;
      case 'high':
        return $localize`:@@featureTicketsBoard-priorityHigh:High`;
      case 'critical':
        return $localize`:@@featureTicketsBoard-priorityCritical:Critical`;
      default:
        return priority;
    }
  }

  /** Same style as deployment run lists: short date + time (Angular `DatePipe`). */
  readonly activityOccurredAtFormat = 'MMM d, y · h:mm a';

  activityActionLabel(actionType: string): string {
    switch (actionType) {
      case 'CREATED':
        return $localize`:@@featureTicketsBoard-activityActionCreated:Created`;
      case 'DELETED':
        return $localize`:@@featureTicketsBoard-activityActionDeleted:Deleted`;
      case 'COMMENT_ADDED':
        return $localize`:@@featureTicketsBoard-activityActionCommentAdded:Comment added`;
      case 'STATUS_CHANGED':
        return $localize`:@@featureTicketsBoard-activityActionStatusChanged:Status changed`;
      case 'PRIORITY_CHANGED':
        return $localize`:@@featureTicketsBoard-activityActionPriorityChanged:Priority changed`;
      case 'WORKSPACE_MOVED':
        return $localize`:@@featureTicketsBoard-activityActionWorkspaceMoved:Workspace changed`;
      case 'PARENT_CHANGED':
        return $localize`:@@featureTicketsBoard-activityActionParentChanged:Parent changed`;
      case 'FIELD_UPDATED':
        return $localize`:@@featureTicketsBoard-activityActionFieldUpdated:Details updated`;
      case 'CONTENT_APPLIED_FROM_AI':
        return $localize`:@@featureTicketsBoard-activityActionContentAppliedFromAi:Description applied (AI)`;
      case 'BODY_GENERATION_STARTED':
        return $localize`:@@featureTicketsBoard-activityActionBodyGenerationStarted:AI description generation started`;
      case 'PROTOTYPE_PROMPT_GENERATED':
        return $localize`:@@featureTicketsBoard-activityActionPrototypePromptGenerated:Prototype prompt generated`;
      default:
        return $localize`:@@featureTicketsBoard-activityActionUnknown:Unknown activity`;
    }
  }

  /**
   * Semantic tint modifier for `.info-badge` chips (chat / deployments style:
   * `info-badge text-muted bg-body-tertiary py-1 px-2 rounded`).
   */
  activityActionBadgeClass(actionType: string): string {
    switch (actionType) {
      case 'CREATED':
        return 'tickets-board__chip--activity-created';
      case 'DELETED':
        return 'tickets-board__chip--activity-deleted';
      case 'COMMENT_ADDED':
        return 'tickets-board__chip--activity-comment';
      case 'STATUS_CHANGED':
        return 'tickets-board__chip--activity-status';
      case 'PRIORITY_CHANGED':
        return 'tickets-board__chip--activity-priority';
      case 'WORKSPACE_MOVED':
      case 'PARENT_CHANGED':
      case 'FIELD_UPDATED':
        return 'tickets-board__chip--activity-muted';
      case 'CONTENT_APPLIED_FROM_AI':
        return 'tickets-board__chip--activity-ai-content';
      case 'BODY_GENERATION_STARTED':
      case 'PROTOTYPE_PROMPT_GENERATED':
        return 'tickets-board__chip--activity-ai';
      default:
        return 'tickets-board__chip--neutral';
    }
  }

  /** Priority chip modifier (paired with global `.info-badge` base classes). */
  ticketPriorityBadgeClass(priority: TicketPriority): string {
    switch (priority) {
      case 'low':
        return 'tickets-board__chip--priority-low';
      case 'medium':
        return 'tickets-board__chip--priority-medium';
      case 'high':
        return 'tickets-board__chip--priority-high';
      case 'critical':
        return 'tickets-board__chip--priority-critical';
      default:
        return 'tickets-board__chip--neutral';
    }
  }

  /** Status / swimlane chip modifier. */
  ticketStatusBadgeClass(status: TicketStatus): string {
    switch (status) {
      case 'draft':
        return 'tickets-board__chip--status-draft';
      case 'todo':
        return 'tickets-board__chip--status-todo';
      case 'in_progress':
        return 'tickets-board__chip--status-in-progress';
      case 'prototype':
        return 'tickets-board__chip--status-prototype';
      case 'done':
        return 'tickets-board__chip--status-done';
      case 'closed':
        return 'tickets-board__chip--status-closed';
      default:
        return 'tickets-board__chip--neutral';
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydownForGlobalSearch(event: KeyboardEvent): void {
    if (!event.ctrlKey || (event.key !== 'f' && event.key !== 'F')) {
      return;
    }
    if (this.effectiveClientId() === null) {
      return;
    }
    const target = event.target;
    const modalEl = this.globalSearchModal?.nativeElement;
    if (isEditableDomTarget(target)) {
      if (modalEl && target instanceof Node && modalEl.contains(target)) {
        event.preventDefault();
        this.globalSearchInput?.nativeElement?.focus();
      }
      return;
    }
    event.preventDefault();
    this.openGlobalSearchModal();
  }

  openGlobalSearchModal(): void {
    this.globalSearchQuery.set('');
    setTimeout(() => {
      const shell = this.globalSearchModal?.nativeElement;
      if (shell?.classList.contains('show')) {
        this.globalSearchInput?.nativeElement?.focus({ preventScroll: true });
        return;
      }
      this.showGlobalSearchModalEl();
    }, 0);
  }

  onCloseGlobalSearchModal(): void {
    this.hideGlobalSearchModalEl();
    this.globalSearchQuery.set('');
  }

  onGlobalSearchResultClick(hit: TicketGlobalSearchHit): void {
    this.hideGlobalSearchModalEl();
    this.globalSearchQuery.set('');
    this.openTicketDetailFlow(hit.ticket.id);
  }

  globalSearchPathDisplay(hit: TicketGlobalSearchHit): string {
    const titles = hit.pathTitles;
    if (titles.length <= 1) {
      return '';
    }
    return titles.slice(0, -1).join(' › ');
  }

  onTicketCardClick(ticket: TicketResponseDto): void {
    if (typeof performance !== 'undefined' && performance.now() < this.suppressCardClickUntil) {
      return;
    }
    this.openTicketDetailFlow(ticket.id);
  }

  /** Open detail modal for a ticket (board card, breadcrumb, or nested row). */
  openTicketDetailFlow(ticketId: string): void {
    this.prototypeError.set(null);
    this.bodyGenError.set(null);
    this.newCommentText.set('');
    this.ticketsFacade.openDetail(ticketId);

    const clientId = this.effectiveClientId();
    if (clientId) {
      this.agentsFacade.loadClientAgents(clientId);
    }

    combineLatest([
      this.effectiveClientId$.pipe(take(1)),
      race(
        this.chatCapableAgents$.pipe(
          filter((agents) => agents.length > 0),
          take(1),
        ),
        timer(4000).pipe(switchMap(() => this.chatCapableAgents$.pipe(take(1)))),
      ),
      this.socketsFacade.selectedAgentId$.pipe(take(1)),
    ])
      .pipe(take(1))
      .subscribe(([cid, chatAgents, socketAgentId]) => {
        const pick =
          (socketAgentId && chatAgents.some((a) => a.id === socketAgentId) ? socketAgentId : null) ??
          chatAgents[0]?.id ??
          null;
        this.selectedAgentForAi.set(pick);
      });
    setTimeout(() => this.showModal(), 0);
  }

  onBreadcrumbNavigate(ticketId: string): void {
    this.openTicketDetailFlow(ticketId);
  }

  showCreateSubtaskModal(): void {
    const parentId = this.detail()?.id;
    if (!parentId) {
      return;
    }
    this.createTicketError.set(null);
    this.createTicketTitle.set('');
    this.createTicketContent.set('');
    this.createTicketStatus.set('draft');
    this.createTicketPriority.set('medium');
    this.createTicketParentId.set(parentId);
    setTimeout(() => this.showCreateModalEl(), 0);
  }

  onCloseModal(): void {
    this.hideModal();
    this.ticketsFacade.closeDetail();
    this.prototypeError.set(null);
    this.bodyGenError.set(null);
    this.pendingBodyCorrelation.set(null);
    this.bodyGenInProgress.set(false);
    this.activeGenerationId = null;
  }

  effectiveWorkspaceTitle(ew: { id: string; client: ClientResponseDto | null }): string {
    const name = ew.client?.name?.trim();
    return name && name.length > 0 ? name : ew.id;
  }

  openWorkspaceSwitchModal(): void {
    this.workspaceSwitchSearch.set('');
    this.clientsFacade.loadClients();
    setTimeout(() => this.showWorkspaceSwitchModal(), 0);
  }

  onCloseWorkspaceSwitchModal(): void {
    this.hideWorkspaceSwitchModal();
  }

  filteredClientsForWorkspaceSwitch(clients: ClientResponseDto[]): ClientResponseDto[] {
    const q = this.workspaceSwitchSearch().trim().toLowerCase();
    if (!q) {
      return clients;
    }
    return clients.filter((client) => JSON.stringify(client).toLowerCase().includes(q));
  }

  onSelectWorkspaceForTickets(client: ClientResponseDto): void {
    if (client.id === this.effectiveClientId()) {
      this.hideWorkspaceSwitchModal();
      return;
    }
    this.hideWorkspaceSwitchModal();
    this.hideModal();
    this.hideCreateModalEl();
    this.hideDeleteTicketConfirmModal();
    this.hideGlobalSearchModalEl();
    this.ticketPendingDelete.set(null);
    this.ticketsFacade.closeDetail();
    this.clientsFacade.setActiveClient(client.id);
    const parent = this.route.parent;
    if (parent) {
      void this.router.navigate(['tickets', client.id], { relativeTo: parent });
    } else {
      void this.router.navigate(['/tickets', client.id]);
    }
  }

  onRequestDeleteTicket(ticket: TicketResponseDto): void {
    this.ticketPendingDelete.set({ id: ticket.id, title: ticket.title });
    setTimeout(() => this.showDeleteTicketConfirmModal(), 0);
  }

  onCancelDeleteTicketConfirm(): void {
    this.hideDeleteTicketConfirmModal();
    this.ticketPendingDelete.set(null);
  }

  onConfirmDeleteTicket(): void {
    const pending = this.ticketPendingDelete();
    if (!pending) {
      return;
    }
    const { id } = pending;
    this.hideDeleteTicketConfirmModal();
    this.ticketPendingDelete.set(null);
    this.ticketsFacade.remove(id);
    this.actions$
      .pipe(
        ofType(deleteTicketSuccess),
        filter((a) => a.id === id),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.onCloseModal());
  }

  onUpdateTicketField(id: string, field: 'status' | 'priority', value: TicketStatus | TicketPriority): void {
    if (field === 'status') {
      this.ticketsFacade.update(id, { status: value as TicketStatus });
    } else {
      this.ticketsFacade.update(id, { priority: value as TicketPriority });
    }
  }

  /** Persists description when the editor loses focus (if it changed). */
  onDescriptionDraftCommit(): void {
    const d = this.detail();
    if (!d) {
      return;
    }
    const draft = this.descriptionDraft();
    const current = d.content ?? '';
    if (draft === current) {
      return;
    }
    this.ticketsFacade.update(d.id, { content: draft });
  }

  isLaneDragHighlight(status: BoardLaneStatus): boolean {
    const dragged = this.draggedTicket();
    return this.dragOverLane() === status && dragged !== null && dragged.status !== status;
  }

  onTicketDragStart(event: DragEvent, ticket: TicketResponseDto): void {
    if (!event.dataTransfer) {
      return;
    }
    this.draggedTicket.set(ticket);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', ticket.id);
    if (event.currentTarget instanceof HTMLElement) {
      const card = event.currentTarget.querySelector('.tickets-board__card-content');
      if (card) {
        const dragImage = card.cloneNode(true) as HTMLElement;
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.opacity = '0.8';
        dragImage.style.backgroundColor = 'var(--bs-body-bg)';
        dragImage.style.padding = '4px 8px';
        dragImage.style.border = '1px solid var(--bs-border-color)';
        dragImage.style.borderRadius = '4px';
        dragImage.style.maxWidth = '240px';
        document.body.appendChild(dragImage);
        event.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 0);
      }
    }
  }

  onTicketDragEnd(): void {
    this.draggedTicket.set(null);
    this.dragOverLane.set(null);
    this.suppressCardClickUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 200;
  }

  onLaneDragOver(event: DragEvent, laneStatus: BoardLaneStatus): void {
    event.preventDefault();
    event.stopPropagation();
    const dragged = this.draggedTicket();
    if (!dragged || dragged.status === laneStatus) {
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverLane.set(laneStatus);
  }

  onLaneDragEnter(event: DragEvent, laneStatus: BoardLaneStatus): void {
    event.preventDefault();
    event.stopPropagation();
    const dragged = this.draggedTicket();
    if (!dragged || dragged.status === laneStatus) {
      return;
    }
    this.dragOverLane.set(laneStatus);
  }

  onLaneDragLeave(event: DragEvent, laneStatus: BoardLaneStatus): void {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as HTMLElement | null;
    if (related && event.currentTarget instanceof HTMLElement && event.currentTarget.contains(related)) {
      return;
    }
    if (this.dragOverLane() === laneStatus) {
      this.dragOverLane.set(null);
    }
  }

  onLaneDrop(event: DragEvent, laneStatus: BoardLaneStatus): void {
    event.preventDefault();
    event.stopPropagation();
    const dragged = this.draggedTicket();
    this.dragOverLane.set(null);
    if (!dragged) {
      return;
    }
    if (!(BOARD_LANE_STATUSES as readonly string[]).includes(laneStatus)) {
      this.draggedTicket.set(null);
      return;
    }
    if (dragged.status === laneStatus) {
      this.draggedTicket.set(null);
      return;
    }
    this.ticketsFacade.update(dragged.id, { status: laneStatus });
    this.draggedTicket.set(null);
  }

  showCreateTicketModal(): void {
    this.createTicketError.set(null);
    this.createTicketTitle.set('');
    this.createTicketContent.set('');
    this.createTicketStatus.set('draft');
    this.createTicketPriority.set('medium');
    this.createTicketParentId.set(null);
    setTimeout(() => this.showCreateModalEl(), 0);
  }

  onCloseCreateTicketModal(): void {
    this.hideCreateModalEl();
    this.createTicketError.set(null);
    this.createTicketParentId.set(null);
  }

  onSubmitCreateTicket(): void {
    const clientId = this.effectiveClientId();
    const title = this.createTicketTitle().trim();
    this.createTicketError.set(null);
    if (!clientId) {
      this.createTicketError.set(
        $localize`:@@featureTicketsBoard-createNeedClient:Select a space before creating a ticket.`,
      );
      return;
    }
    if (!title) {
      this.createTicketError.set($localize`:@@featureTicketsBoard-createNeedTitle:Title is required.`);
      return;
    }
    const content = this.createTicketContent().trim();
    const parentId = this.createTicketParentId();
    if (parentId) {
      this.ticketsFacade.create({
        parentId,
        title,
        ...(content ? { content } : {}),
        status: this.createTicketStatus(),
        priority: this.createTicketPriority(),
      });
    } else {
      this.ticketsFacade.create({
        clientId,
        title,
        ...(content ? { content } : {}),
        status: this.createTicketStatus(),
        priority: this.createTicketPriority(),
      });
    }
    this.hideCreateModalEl();
    this.createTicketParentId.set(null);
  }

  onSubmitComment(): void {
    const ticketId = this.detail()?.id;
    const body = this.newCommentText().trim();
    if (!ticketId || !body) {
      return;
    }
    this.ticketsFacade.addComment(ticketId, body);
    this.newCommentText.set('');
  }

  onPrototypeInChat(): void {
    const ticketId = this.detail()?.id;
    const agentId = this.selectedAgentForAi();
    const clientId = this.effectiveClientId();
    this.prototypeError.set(null);
    if (!ticketId || !agentId || !clientId) {
      this.prototypeError.set(
        $localize`:@@featureTicketsBoard-prototypeNeedAgent:Select an environment and agent for chat.`,
      );
      return;
    }
    this.ticketsService.getPrototypePrompt(ticketId).subscribe({
      next: ({ prompt }) => {
        storeAgentConsoleChatDraft(prompt);
        this.hideModal();
        this.ticketsFacade.closeDetail();
        void this.router.navigate(['/clients', clientId, 'agents', agentId]);
      },
      error: (err: unknown) => {
        this.prototypeError.set(this.httpErrorMessage(err));
      },
    });
  }

  onGenerateBody(): void {
    const d = this.detail();
    const agentId = this.selectedAgentForAi();
    const clientId = this.effectiveClientId();
    this.bodyGenError.set(null);
    if (!d || !agentId || !clientId) {
      this.bodyGenError.set(
        $localize`:@@featureTicketsBoard-bodyGenNeedAgent:Select an agent and ensure a ticket is open.`,
      );
      return;
    }
    if (this.bodyGenInProgress()) {
      return;
    }
    this.bodyGenInProgress.set(true);
    this.ticketsService.startBodyGenerationSession(d.id, agentId).subscribe({
      next: ({ generationId, activity }) => {
        this.ticketsFacade.prependDetailActivity(activity);
        this.activeGenerationId = generationId;
        const correlationId =
          typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        this.pendingBodyCorrelation.set(correlationId);
        this.ensureSocketAndClient(clientId)
          .pipe(
            tap(() => {
              const hierarchyContext = buildTicketBodyHierarchyContext(d, this.detailBreadcrumb());
              this.socketsFacade.forwardGenerateTicketBody(
                d.title,
                agentId,
                correlationId,
                undefined,
                hierarchyContext || undefined,
              );
            }),
            catchError((err: unknown) => {
              this.bodyGenInProgress.set(false);
              this.pendingBodyCorrelation.set(null);
              this.activeGenerationId = null;
              this.bodyGenError.set(this.httpErrorMessage(err));
              return of(undefined);
            }),
          )
          .subscribe();
      },
      error: (err: unknown) => {
        this.bodyGenInProgress.set(false);
        this.bodyGenError.set(this.httpErrorMessage(err));
      },
    });
  }

  private ensureSocketAndClient(clientId: string): Observable<void> {
    return this.socketsFacade.connected$.pipe(
      take(1),
      switchMap((connected) => {
        if (connected) {
          this.socketsFacade.setClient(clientId);
          return this.socketsFacade.selectedClientId$.pipe(
            filter((id) => id === clientId),
            take(1),
            map(() => undefined),
          );
        }
        this.socketsFacade.connect();
        return this.socketsFacade.connected$.pipe(
          filter(Boolean),
          take(1),
          tap(() => this.socketsFacade.setClient(clientId)),
          switchMap(() =>
            this.socketsFacade.selectedClientId$.pipe(
              filter((id) => id === clientId),
              take(1),
            ),
          ),
          map(() => undefined),
        );
      }),
    );
  }

  private httpErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return (err.error as { message?: string })?.message ?? err.message ?? String(err.status);
    }
    if (err instanceof Error) {
      return err.message;
    }
    return $localize`:@@featureTicketsBoard-requestFailed:Request failed`;
  }

  private showModal(): void {
    const el = this.ticketDetailModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: {
        Modal?: { getOrCreateInstance: (e: Element) => { show(): void }; new (e: Element): { show(): void } };
      };
    };
    const Modal = win.bootstrap?.Modal;
    if (Modal) {
      const inst = Modal.getOrCreateInstance ? Modal.getOrCreateInstance(el) : new Modal(el);
      inst.show();
    }
  }

  private hideModal(): void {
    const el = this.ticketDetailModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: { Modal?: { getInstance: (e: Element) => { hide(): void } | null } };
    };
    win.bootstrap?.Modal?.getInstance(el)?.hide();
  }

  private showCreateModalEl(): void {
    const el = this.createTicketModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: {
        Modal?: { getOrCreateInstance: (e: Element) => { show(): void }; new (e: Element): { show(): void } };
      };
    };
    const Modal = win.bootstrap?.Modal;
    if (Modal) {
      const inst = Modal.getOrCreateInstance ? Modal.getOrCreateInstance(el) : new Modal(el);
      inst.show();
    }
  }

  private hideCreateModalEl(): void {
    const el = this.createTicketModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: { Modal?: { getInstance: (e: Element) => { hide(): void } | null } };
    };
    win.bootstrap?.Modal?.getInstance(el)?.hide();
  }

  private showDeleteTicketConfirmModal(): void {
    const el = this.deleteTicketConfirmModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: {
        Modal?: { getOrCreateInstance: (e: Element) => { show(): void }; new (e: Element): { show(): void } };
      };
    };
    const Modal = win.bootstrap?.Modal;
    if (Modal) {
      const inst = Modal.getOrCreateInstance ? Modal.getOrCreateInstance(el) : new Modal(el);
      inst.show();
    }
  }

  private hideDeleteTicketConfirmModal(): void {
    const el = this.deleteTicketConfirmModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: { Modal?: { getInstance: (e: Element) => { hide(): void } | null } };
    };
    win.bootstrap?.Modal?.getInstance(el)?.hide();
  }

  private showWorkspaceSwitchModal(): void {
    const el = this.workspaceSwitchModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: {
        Modal?: { getOrCreateInstance: (e: Element) => { show(): void }; new (e: Element): { show(): void } };
      };
    };
    const Modal = win.bootstrap?.Modal;
    if (Modal) {
      const inst = Modal.getOrCreateInstance ? Modal.getOrCreateInstance(el) : new Modal(el);
      inst.show();
    }
  }

  private hideWorkspaceSwitchModal(): void {
    const el = this.workspaceSwitchModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: { Modal?: { getInstance: (e: Element) => { hide(): void } | null } };
    };
    win.bootstrap?.Modal?.getInstance(el)?.hide();
  }

  private showGlobalSearchModalEl(): void {
    const el = this.globalSearchModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: {
        Modal?: { getOrCreateInstance: (e: Element) => { show(): void }; new (e: Element): { show(): void } };
      };
    };
    const Modal = win.bootstrap?.Modal;
    if (!Modal) {
      return;
    }
    const focusSearchInput = (): void => {
      this.globalSearchInput?.nativeElement?.focus({ preventScroll: true });
    };
    el.addEventListener('shown.bs.modal', focusSearchInput, { once: true });
    const inst = Modal.getOrCreateInstance ? Modal.getOrCreateInstance(el) : new Modal(el);
    inst.show();
  }

  private hideGlobalSearchModalEl(): void {
    const el = this.globalSearchModal?.nativeElement;
    if (!el) {
      return;
    }
    const win = window as unknown as {
      bootstrap?: { Modal?: { getInstance: (e: Element) => { hide(): void } | null } };
    };
    win.bootstrap?.Modal?.getInstance(el)?.hide();
  }
}
