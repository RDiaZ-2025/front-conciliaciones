import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { CachedImagePipe } from '../../../pipes/cached-image.pipe';
import { Component, ElementRef, ViewChild, signal, computed, inject, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DrawerModule } from 'primeng/drawer';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MarkdownPipe } from '../../../pipes/markdown.pipe';
import { AuthService } from '../../../services/auth.service';
import { AzureStorageService } from '../../../services/azure-storage.service';
import { environment } from '../../../../environments/environment';
import {
  MiaChatService,
  WebMessageFile,
  WebMessageRequest,
  ConversationItem,
  ConversationMessage
} from '../../../services/mia-chat.service';

export type { WebMessageFile, WebMessageRequest, ConversationItem, ConversationMessage };

interface ChatMessageAttachment {
  type: 'image' | 'audio' | 'video' | 'document';
  name: string;
  mimeType: string;
  path: string;
  blobUrl: string | null;
  loading: boolean;
  downloading?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ppt?: string | null;
  attachment?: ChatMessageAttachment | null;
}

interface FileAttachment {
  name: string;
  mimeType: string;
  extension: string;
  dataBase64: string;
  size: number;
  messageType: 'document' | 'audio';
}

interface MessageFile {
  name: string;
  extension: string;
  size: number;
  mimeType: string;
  contentType: string;
  dataBase64: string;
}

@Component({
  selector: 'app-production-chat-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CachedImagePipe,
    CommonModule,
    FormsModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    DrawerModule,
    MarkdownPipe
  ],
  templateUrl: './production-chat-dialog.component.html',
  styleUrls: ['./production-chat-dialog.component.scss']
})
export class ProductionChatDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('scrollPanel') scrollPanel!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;

  ref = inject(DynamicDialogRef, { optional: true }) as DynamicDialogRef | null;
  messageService = inject(MessageService);
  private miaChatService = inject(MiaChatService);
  private authService = inject(AuthService);
  private azureService = inject(AzureStorageService);
  private sanitizer = inject(DomSanitizer);
  private hostEl = inject(ElementRef);

  private scrollContainer: HTMLElement | null = null;

  @Output() requestCreated = new EventEmitter<any>();

  private readonly typingMessages = [
    'MIA está pensando',
    'MIA está procesando tu solicitud',
    'MIA está reuniendo la información necesaria',
    'MIA está analizando los datos',
    'MIA está consultando las bases de datos',
    'MIA está revisando la información disponible',
    'MIA está buscando en los registros',
    'MIA está organizando los resultados',
    'MIA está verificando los detalles',
    'MIA está generando la respuesta',
    'MIA está consultando fuentes de información',
    'MIA está elaborando una solución',
    'MIA está sintetizando la información',
    'MIA está validando los datos',
    'MIA está preparando todo para ti'
  ];

  typingStatusText = signal<string>('MIA está pensando');
  private typingMessageInterval: ReturnType<typeof setInterval> | null = null;

  messages = signal<ChatMessage[]>([]);
  isTyping = signal<boolean>(false);
  summary = signal<string>('');
  files = signal<File[]>([]);
  isDragging = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  inputText: string = '';

  showMobileSidebar = signal<boolean>(false);

  attachPanelVisible = signal<boolean>(false);
  showSummaryDrawer = signal<boolean>(false);
  showHistoryDrawer = signal<boolean>(false);

  conversations = signal<ConversationItem[]>([]);
  conversationsLoading = signal<boolean>(false);
  conversationMessagesLoading = signal<boolean>(false);
  selectedConversationId = signal<string | null>(null);

  searchQuery = signal<string>('');

  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.conversations();
    return this.conversations().filter(c =>
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  groupedConversations = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekAgoStart = new Date(todayStart);
    weekAgoStart.setDate(weekAgoStart.getDate() - 7);

    const groups: { label: string; items: ConversationItem[] }[] = [
      { label: 'HOY', items: [] },
      { label: 'AYER', items: [] },
      { label: 'ESTA SEMANA', items: [] },
      { label: 'MÁS ANTIGUO', items: [] }
    ];

    for (const conv of this.filteredConversations()) {
      const d = new Date(conv.updatedAt);
      const convDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (convDay >= todayStart) {
        groups[0].items.push(conv);
      } else if (convDay >= yesterdayStart) {
        groups[1].items.push(conv);
      } else if (d >= weekAgoStart) {
        groups[2].items.push(conv);
      } else {
        groups[3].items.push(conv);
      }
    }

    return groups.filter(g => g.items.length > 0);
  });

  private readonly AGENT_ID = 'drWvQYWbVmoG8rRTxseV';

  private cancelPending$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private blobUrls: string[] = [];
  private safetyTimeoutSubscription: Subscription | null = null;

  private stopSafetyTimeout(): void {
    if (this.safetyTimeoutSubscription) {
      this.safetyTimeoutSubscription.unsubscribe();
      this.safetyTimeoutSubscription = null;
    }
  }

  private stopPolling(): void {
    this.stopSafetyTimeout();
  }

  getConvTitle(conv: ConversationItem): string {
    const words = (conv.lastMessage ?? '').split(' ');
    const title = words.slice(0, 5).join(' ');
    return title + (words.length > 5 ? '...' : '');
  }

  getConvRelativeTime(conv: ConversationItem): string {
    const d = new Date(conv.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  private extractCleanPath(rawPath: string, name?: string): string {
    if (!rawPath) return name || '';
    let clean = rawPath.trim();

    if (clean.includes('/o/')) {
      const afterO = clean.split('/o/')[1];
      if (afterO) {
        const encodedPath = afterO.split('?')[0].split('#')[0];
        return decodeURIComponent(encodedPath);
      }
    }

    if (/^https?:\/\//i.test(clean)) {
      try {
        const url = new URL(clean);
        clean = decodeURIComponent(url.pathname);
        if (clean.startsWith('/')) {
          clean = clean.substring(1);
        }
        return clean;
      } catch (e) {

      }
    }

    if (name && clean.endsWith(name)) {
      return clean;
    }

    if (name && !clean.toLowerCase().endsWith(name.toLowerCase())) {
      return clean.endsWith('/') ? clean + name : clean + '/' + name;
    }

    return clean;
  }

  downloadDocument(attachment: ChatMessageAttachment, msgIndex: number): void {
    if (attachment.downloading) return;

    if (!attachment.path) {
      if (attachment.blobUrl) {
        const a = document.createElement('a');
        a.href = attachment.blobUrl;
        a.download = attachment.name;
        a.click();
      }
      return;
    }

    this.messages.update(msgs =>
      msgs.map((m, i) => i === msgIndex ? { ...m, attachment: { ...m.attachment!, downloading: true } } : m)
    );
    const cleanPath = this.extractCleanPath(attachment.path, attachment.name);
    this.miaChatService.downloadFile(cleanPath)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob as Blob);
          this.blobUrls.push(url);
          const a = document.createElement('a');
          a.href = url;
          a.download = attachment.name;
          a.click();
          this.messages.update(msgs =>
            msgs.map((m, i) => i === msgIndex ? { ...m, attachment: { ...m.attachment!, downloading: false } } : m)
          );
        },
        error: () => {
          this.messages.update(msgs =>
            msgs.map((m, i) => i === msgIndex ? { ...m, attachment: { ...m.attachment!, downloading: false } } : m)
          );
        }
      });
  }

  getPptViewerUrl(pptUrl: string): SafeResourceUrl {
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pptUrl)}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }

  toggleAttachPanel(): void {
    this.attachPanelVisible.update(v => !v);
  }

  loadConversations(): void {
    const email = this.authService.currentUser()?.email;
    if (!email) return;
    this.conversationsLoading.set(true);
    this.miaChatService.getConversations(email).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        const sorted = list.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.conversations.set(sorted);
        this.conversationsLoading.set(false);

        if (!this.selectedConversationId() && sorted.length > 0) {
          this.selectConversation(sorted[0]);
        }
      },
      error: (err) => {
        this.conversationsLoading.set(false);
        console.error('Error loading conversations:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al cargar conversaciones',
          detail: 'No se pudieron recuperar las conversaciones previas.'
        });
      }
    });
  }

  private extractMessageTimestampSeconds(m: any): number {
    if (!m) return 0;
    const raw =
      m.messageContent?.timestamp ??
      m.messageContent?.Timestamp ??
      m.message?.timestamp ??
      m.message?.Timestamp ??
      m.MessageContent?.Timestamp ??
      m.MessageContent?.timestamp ??
      m.Message?.Timestamp ??
      m.Message?.timestamp ??
      m.timestamp ??
      m.Timestamp ??
      m.createdAt ??
      m.created_at ??
      m.createTime ??
      m._createTime ??
      m.date;

    if (raw === null || raw === undefined) return 0;

    if (typeof raw === 'number') {
      if (isNaN(raw) || !isFinite(raw)) return 0;
      return raw > 1e11 ? Math.floor(raw / 1000) : Math.floor(raw);
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return 0;
      const num = Number(trimmed);
      if (!isNaN(num) && isFinite(num) && num > 0) {
        return num > 1e11 ? Math.floor(num / 1000) : Math.floor(num);
      }
      const parsedDate = new Date(trimmed).getTime();
      if (!isNaN(parsedDate) && parsedDate > 0) {
        return Math.floor(parsedDate / 1000);
      }
    }

    if (raw instanceof Date) {
      const t = raw.getTime();
      return isNaN(t) ? 0 : Math.floor(t / 1000);
    }

    return 0;
  }

  private extractMessageDate(m: any): Date {
    const sec = this.extractMessageTimestampSeconds(m);
    return sec > 0 ? new Date(sec * 1000) : new Date();
  }

  private extractMessageContent(m: any): { text: string; type: string; metadata: any } {
    if (!m) {
      return { text: '', type: 'text', metadata: null };
    }

    const mc = m.messageContent ?? m.MessageContent ?? m.message ?? m.Message;

    let text = '';
    let type = 'text';
    let metadata: any = null;

    if (typeof mc === 'string') {
      text = mc;
    } else if (mc && typeof mc === 'object') {
      text = mc.text ?? mc.Text ?? mc.content ?? mc.Content ?? '';
      type = (mc.type ?? mc.Type ?? 'text').toString();
      metadata = mc.metadata ?? mc.Metadata ?? mc.file ?? mc.File ?? null;
    }

    if (!text) {
      text = m.text ?? m.Text ?? m.content ?? m.Content ?? '';
    }
    if (type === 'text' && (m.type || m.Type)) {
      type = (m.type ?? m.Type).toString();
    }
    if (!metadata) {
      metadata = m.metadata ?? m.Metadata ?? m.file ?? m.File ?? null;
    }

    return { text, type, metadata };
  }

  private isAssistantMessage(m: any): boolean {
    if (!m) return false;

    if (m.role === 'assistant' || m.role === 'agent') return true;
    if (m.role === 'user') return false;

    const agentId = (m.agentId ?? this.AGENT_ID ?? environment.chatAgentId ?? '').toString().toLowerCase();

    const sender = m.sender ?? m.Sender;
    let senderId = '';
    if (typeof sender === 'string') {
      senderId = sender;
    } else if (sender && typeof sender === 'object') {
      senderId = (sender.id ?? sender.Id ?? sender.email ?? sender.Email ?? '').toString();
    }
    if (!senderId && (m.senderId || m.SenderId)) {
      senderId = (m.senderId ?? m.SenderId).toString();
    }

    if (sender === 'ai' || senderId.toLowerCase() === 'ai' || (m.senderId && m.senderId.toString().toLowerCase() === 'ai')) {
      return true;
    }

    const currentEmail = (this.authService.currentUser()?.email ?? '').toLowerCase();
    const contactId = (m.contactId ?? m.ContactId ?? '').toString().toLowerCase();

    if (currentEmail && senderId.toLowerCase() === currentEmail) return false;
    if (contactId && senderId.toLowerCase() === contactId) return false;

    if (agentId && (senderId.toLowerCase() === agentId || (m.senderId && m.senderId.toString().toLowerCase() === agentId))) {
      return true;
    }

    if (sender && typeof sender === 'object' && sender.name && /mia/i.test(sender.name)) {
      return true;
    }

    return agentId ? senderId.toLowerCase() === agentId : false;
  }

  private mapApiMessagesToChatMessages(data: ConversationMessage[]): ChatMessage[] {
    const list = Array.isArray(data) ? data.filter(Boolean) : [];
    const unique = list.filter((m, i, arr) => {
      const id = m?.id ?? (m as any)?._id ?? (m as any)?._Id;
      return id ? arr.findIndex(x => (x?.id ?? (x as any)?._id ?? (x as any)?._Id) === id) === i : true;
    });
    const sorted = unique.sort(
      (a, b) => this.extractMessageTimestampSeconds(a) - this.extractMessageTimestampSeconds(b)
    );
    return sorted.map(m => {
      const { text, type: msgType, metadata: meta } = this.extractMessageContent(m);
      let attachment: ChatMessageAttachment | null = null;
      if (meta?.path && meta?.name) {
        const mimeType = meta.mimeType || meta.contentType || '';
        const apiType = msgType.toLowerCase();
        let attType: ChatMessageAttachment['type'] = 'document';
        if (apiType === 'file') {
          attType = 'document';
        } else if (mimeType.startsWith('image/') || apiType === 'image') {
          attType = 'image';
        } else if (mimeType.startsWith('audio/') || apiType === 'audio') {
          attType = 'audio';
        } else if (mimeType.startsWith('video/') || apiType === 'video') {
          attType = 'video';
        }
        const cleanPath = this.extractCleanPath(meta.path, meta.name);
        const isMedia = attType !== 'document';
        attachment = { type: attType, name: meta.name, mimeType, path: cleanPath, blobUrl: null, loading: isMedia };
      }

      const isPptx = (msgType.toLowerCase() === 'file' || msgType === '') &&
        (meta?.extension?.toLowerCase() === '.pptx' ||
          meta?.name?.toLowerCase()?.endsWith('.pptx') ||
          meta?.path?.toLowerCase()?.endsWith('.pptx'));

      return {
        role: this.isAssistantMessage(m) ? 'assistant' : 'user',
        content: text,
        timestamp: this.extractMessageDate(m),
        ppt: isPptx ? (meta?.path ?? null) : null,
        attachment
      };
    });
  }

  private loadAttachmentsForMessages(mapped: ChatMessage[]): void {
    mapped.forEach((msg, index) => {
      if (!msg.attachment || msg.attachment.type === 'document') return;
      const cleanPath = this.extractCleanPath(msg.attachment.path, msg.attachment.name);
      this.miaChatService.downloadFile(cleanPath)
        .pipe(takeUntil(this.cancelPending$))
        .subscribe({
          next: (blob) => {
            const b = blob as Blob;
            if (b.size === 0) {
              this.messages.update(msgs =>
                msgs.map((m, i) => i === index ? { ...m, attachment: { ...m.attachment!, type: 'document', loading: false } } : m)
              );
              return;
            }
            const blobUrl = URL.createObjectURL(b);
            this.blobUrls.push(blobUrl);
            this.messages.update(msgs =>
              msgs.map((m, i) => i === index ? { ...m, attachment: { ...m.attachment!, blobUrl, loading: false } } : m)
            );
          },
          error: () => {
            this.messages.update(msgs =>
              msgs.map((m, i) => i === index ? { ...m, attachment: { ...m.attachment!, loading: false } } : m)
            );
          }
        });
    });
  }

  selectConversation(conv: ConversationItem): void {
    if (this.isTyping()) return;
    const email = this.authService.currentUser()?.email;
    if (!email) return;

    const previousId = this.selectedConversationId();
    if (previousId && previousId !== conv.id) {
      this.miaChatService.leaveConversation(previousId);
    }

    this.stopSafetyTimeout();
    this.cancelPending$.next();
    this.selectedConversationId.set(conv.id);
    this.miaChatService.joinConversation(conv.id);

    this.conversationMessagesLoading.set(true);
    this.messages.set([]);
    this.summary.set('');
    this.miaChatService.getConversationMessages(email, conv.id)
      .pipe(takeUntil(this.cancelPending$)).subscribe({
      next: (data) => {
        const mapped = this.mapApiMessagesToChatMessages(data);
        this.messages.set(mapped);
        this.loadAttachmentsForMessages(mapped);
        this.conversationMessagesLoading.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        this.conversationMessagesLoading.set(false);
        console.error('Error loading conversation messages:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al cargar mensajes',
          detail: 'No se pudieron recuperar los mensajes de la conversación.'
        });
      }
    });
  }

  private startSafetyTimeout(targetConvId: string | null, sendTimeSeconds: number): void {
    this.stopSafetyTimeout();
    if (!targetConvId) return;

    const email = this.authService.currentUser()?.email;
    if (!email) {
      this.stopTypingMessageRotation();
      this.isTyping.set(false);
      return;
    }

    this.safetyTimeoutSubscription = timer(35000).pipe(
      takeUntil(this.cancelPending$),
      switchMap(() => this.miaChatService.getConversationMessages(email, targetConvId))
    ).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data.filter(Boolean) : [];
        if (list.length === 0) return;

        const unique = list.filter((m, i, arr) => {
          const id = m?.id ?? (m as any)?._id ?? (m as any)?._Id;
          return id ? arr.findIndex(x => (x?.id ?? (x as any)?._id ?? (x as any)?._Id) === id) === i : true;
        });
        const sorted = unique.sort(
          (a, b) => this.extractMessageTimestampSeconds(a) - this.extractMessageTimestampSeconds(b)
        );

        const hasAssistantResponse = sorted.some(m =>
          this.isAssistantMessage(m) && this.extractMessageTimestampSeconds(m) >= (sendTimeSeconds - 2)
        );

        if (hasAssistantResponse) {
          this.stopSafetyTimeout();
          this.stopTypingMessageRotation();
          this.isTyping.set(false);

          const mapped = this.mapApiMessagesToChatMessages(sorted);
          this.messages.set(mapped);
          this.loadAttachmentsForMessages(mapped);

          this.scrollToBottom();
          this.loadConversations();
        } else {
          this.stopTypingMessageRotation();
          this.isTyping.set(false);
        }
      },
      error: (err) => {
        console.error('Safety timeout error recovering messages:', err);
        this.stopSafetyTimeout();
        this.stopTypingMessageRotation();
        this.isTyping.set(false);
      }
    });
  }

  private handleIncomingSignalRMessage(msg: any): void {
    if (!msg) return;

    const incomingConvId = msg.conversationId ?? msg.ConversationId;
    const currentConvId = this.selectedConversationId();

    if (currentConvId && incomingConvId && incomingConvId !== currentConvId) {
      this.loadConversations();
      return;
    }

    if (!currentConvId && incomingConvId) {
      this.selectedConversationId.set(incomingConvId);
      this.miaChatService.joinConversation(incomingConvId);
    }

    const isAssistant = this.isAssistantMessage(msg);

    if (isAssistant) {
      this.isTyping.set(false);
      this.stopTypingMessageRotation();
      this.stopSafetyTimeout();

      const mapped = this.mapApiMessagesToChatMessages([msg]);
      if (mapped.length > 0) {
        const newMsg = mapped[0];
        const isDuplicate = this.messages().some(existing =>
          existing.role === 'assistant' && existing.content.trim() === newMsg.content.trim()
        );

        if (!isDuplicate) {
          this.messages.update(msgs => [...msgs, newMsg]);
          this.loadAttachmentsForMessages(mapped);
          this.scrollToBottom();
        }
      }

      this.loadConversations();
    } else {
      const mapped = this.mapApiMessagesToChatMessages([msg]);
      if (mapped.length > 0) {
        const userMsg = mapped[0];
        const hasUserMessage = this.messages().some(m =>
          m.role === 'user' && m.content.trim() === userMsg.content.trim()
        );
        if (!hasUserMessage) {
          this.messages.update(msgs => [...msgs, userMsg]);
          this.loadAttachmentsForMessages(mapped);
          this.scrollToBottom();
        }
      }
    }
  }

  private initSignalR(): void {
    const email = this.authService.currentUser()?.email;
    this.miaChatService.startSignalR(email);

    this.miaChatService.messageReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg: any) => {
        this.handleIncomingSignalRMessage(msg);
      });

    this.miaChatService.conversationUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadConversations();
      });
  }

  ngOnInit(): void {
    this.initSignalR();
  }

  private memoryUniqueId: string;

  isRequestReady = computed(() => {
    return this.messages().length > 2 || this.summary().length > 0;
  });

  constructor() {

    this.memoryUniqueId = this.generateGuid();
    this.loadConversations();
  }

  private generateGuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  toggleMobileSidebar() {
    this.showMobileSidebar.update(v => !v);
  }

  closeDialog() {
    if (this.ref) {
      this.ref.close();
    } else {
      this.resetChat();
    }
  }

  sendMessage() {
    if (!this.inputText.trim() && this.files().length === 0) return;

    const text = this.inputText.trim();
    this.inputText = '';

    this.messages.update(m => [...m, {
      role: 'user',
      content: text || (this.files().length > 0 ? `[${this.files().length} archivo(s) adjunto(s)]` : ''),
      timestamp: new Date()
    }]);

    if (this.chatInput) {
      this.chatInput.nativeElement.style.height = '36px';
      this.chatInput.nativeElement.style.overflowY = 'hidden';
    }

    this.scrollToBottom();

    const pendingFiles = [...this.files()];
    this.files.set([]);

    if (pendingFiles.length > 0) {
      this.sendFilesWithText(text, pendingFiles);
    } else {
      this.askAssistant(text);
    }
  }

  private async sendFilesWithText(text: string, files: File[]): Promise<void> {
    const file = files[0];
    const extension = file.name.includes('.') ? '.' + file.name.split('.').pop()! : '';
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const messageType: string = isAudio ? 'audio' : (isImage ? 'image' : (isVideo ? 'video' : 'document'));
    const blobUrl = URL.createObjectURL(file);
    this.blobUrls.push(blobUrl);

    this.messages.update(msgs => {
      const updated = [...msgs];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'user') {
        updated[lastIdx] = {
          ...updated[lastIdx],
          attachment: {
            type: (isAudio ? 'audio' : (isImage ? 'image' : (isVideo ? 'video' : 'document'))),
            name: file.name,
            mimeType: file.type,
            path: '',
            blobUrl,
            loading: false
          }
        };
      }
      return updated;
    });

    const user = this.authService.currentUser();
    const email = user?.email ?? 'anonymous';
    const folderPath = `webchat/${email}`;

    let uploadedPath = `${folderPath}/${file.name}`;
    try {
      const uploadResult = await this.azureService.uploadFile(file, { folderPath, containerName: 'private' });
      if (uploadResult.success) {
        uploadedPath = `${folderPath}/${uploadResult.fileName}`;
      }
    } catch (err) {
      console.error('Error uploading file to storage:', err);
    }

    const webFile: WebMessageFile = {
      path: uploadedPath,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      extension: extension
    };

    this.askAssistant(text || `[Archivo adjunto: ${file.name}]`, webFile, messageType);
  }

  onKeyDown(event: KeyboardEvent, textarea: HTMLTextAreaElement) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = '36px';
    if (textarea.scrollHeight > 36) {
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      textarea.style.overflowY = textarea.scrollHeight > 120 ? 'auto' : 'hidden';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.scrollPanel) {
        const el = this.scrollPanel.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  resetChat() {
    this.stopSafetyTimeout();
    this.cancelPending$.next();
    this.stopTypingMessageRotation();
    const prevId = this.selectedConversationId();
    if (prevId) {
      this.miaChatService.leaveConversation(prevId);
    }
    this.messages.set([]);
    this.summary.set('');
    this.files.set([]);
    this.inputText = '';
    this.selectedConversationId.set(null);
    if (this.chatInput) {
      this.chatInput.nativeElement.style.height = '36px';
      this.chatInput.nativeElement.style.overflowY = 'hidden';
    }
  }

  ngAfterViewInit(): void {

    let p: HTMLElement | null = (this.hostEl.nativeElement as HTMLElement).parentElement;
    while (p) {
      const ov = getComputedStyle(p).overflowY;
      if (ov === 'auto' || ov === 'scroll') {
        this.scrollContainer = p;
        p.style.overflowY = 'hidden';
        break;
      }
      p = p.parentElement;
    }
  }

  ngOnDestroy(): void {
    this.stopSafetyTimeout();
    const prevId = this.selectedConversationId();
    if (prevId) {
      this.miaChatService.leaveConversation(prevId);
    }
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls = [];
    if (this.scrollContainer) {
      this.scrollContainer.style.overflowY = '';
      this.scrollContainer = null;
    }
    this.cancelPending$.next();
    this.cancelPending$.complete();
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTypingMessageRotation();
  }

  private startTypingMessageRotation(): void {
    let index = 0;
    this.typingStatusText.set(this.typingMessages[0]);
    this.typingMessageInterval = setInterval(() => {
      index = (index + 1) % this.typingMessages.length;
      this.typingStatusText.set(this.typingMessages[index]);
    }, 15000);
  }

  private stopTypingMessageRotation(): void {
    if (this.typingMessageInterval) {
      clearInterval(this.typingMessageInterval);
      this.typingMessageInterval = null;
    }
    this.typingStatusText.set('MIA está pensando');
  }

  private askAssistant(userText: string, webMessageFile?: WebMessageFile | null, fileMessageType: string = 'text') {
    this.isTyping.set(true);
    this.startTypingMessageRotation();
    const user = this.authService.currentUser();
    const email = user?.email ?? '';

    const conversationId = this.selectedConversationId();
    const sendTimeSeconds = Math.floor(Date.now() / 1000);

    const payload = this.miaChatService.buildMessagePayload(
      email,
      userText,
      conversationId,
      webMessageFile,
      fileMessageType,
      sendTimeSeconds
    );

    this.miaChatService.sendMessage(payload)
      .pipe(takeUntil(this.cancelPending$)).subscribe({
      next: (response) => {
        const convId = (typeof response === 'string' ? response : (response?.conversationId || response?.id)) || conversationId || this.selectedConversationId();
        if (convId) {
          if (convId !== this.selectedConversationId()) {
            this.selectedConversationId.set(convId);
          }
          this.miaChatService.joinConversation(convId);
          this.startSafetyTimeout(convId, sendTimeSeconds);
        } else {
          this.stopSafetyTimeout();
          this.stopTypingMessageRotation();
          this.isTyping.set(false);
        }
      },
      error: (err) => {
        this.stopSafetyTimeout();
        this.stopTypingMessageRotation();
        this.isTyping.set(false);
        console.error('Error asking assistant:', err);

        this.messageService.add({ severity: 'error', summary: 'Error de Asistente', detail: 'No se pudo enviar el mensaje al asistente.' });
        this.scrollToBottom();
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileSelected(event: any) {
    if (event.target.files) {
      this.handleFiles(event.target.files);
    }

    event.target.value = '';
  }

  private handleFiles(fileList: FileList) {
    const validExtensions = [
      'audio/',
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxFileSize = 5 * 1024 * 1024;
    const newFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isValidType = validExtensions.some(ext => file.type.startsWith(ext) || file.type === ext);
      const validExtension = file.name.endsWith('.txt') || file.name.endsWith('.docx');

      if (!isValidType && !validExtension) {
        this.messageService.add({ severity: 'error', summary: 'Tipo de archivo inválido', detail: `${file.name} no es soportado.` });
        continue;
      }

      if (file.size > maxFileSize) {
        this.messageService.add({ severity: 'error', summary: 'Archivo demasiado grande', detail: `${file.name} excede los 5MB.` });
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {

      this.files.set([newFiles[0]]);
    }
  }

  removeFile(index: number) {
    this.files.update(f => {
      const updated = [...f];
      updated.splice(index, 1);
      return updated;
    });
  }

  submitRequest() {
    this.isSubmitting.set(true);

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud creada correctamente.' });

      const result = {
        name: 'Nueva Solicitud via Chat',
        description: this.summary(),

      };

      if (this.ref) {
        this.ref.close(result);
      } else {
        this.requestCreated.emit(result);
        this.resetChat();
      }
    }, 1500);
  }
}

