import { Component, ElementRef, ViewChild, signal, computed, inject, Output, EventEmitter, OnDestroy, AfterViewInit } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DrawerModule } from 'primeng/drawer';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MarkdownPipe } from '../../../../pipes/markdown.pipe';
import { AuthService } from '../../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

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

interface ConversationItem {
  id: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  unreadCount: number;
  status: string;
  assignedTo: string;
  humanAgentId: string | null;
  secondsProcessed: number;
  escalated: boolean;
  solved: boolean;
  tags: string[];
  rating: string | null;
  feeling: string | null;
  summary: string | null;
}

interface ConversationMessageSender {
  id: string;
  phone: string;
  name: string;
  email: string;
  address: string;
  urlPhotoProfile: string | null;
}

interface ConversationMessageContent {
  text: string;
  type: string;
  timestamp: number;
  metadata: {
    name: string;
    extension: string;
    size: number;
    contentType: string;
    mimeType: string;
    duration: number | null;
    path: string;
  } | null;
}

interface ConversationMessage {
  id: string;
  agentId: string;
  conversationId: string;
  contactId: string;
  channelId: string;
  sender: ConversationMessageSender;
  messageContent: ConversationMessageContent;
}

@Component({
  selector: 'app-production-chat-dialog',
  standalone: true,
  imports: [
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
export class ProductionChatDialogComponent implements OnDestroy, AfterViewInit {
  @ViewChild('scrollPanel') scrollPanel!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;

  ref = inject(DynamicDialogRef, { optional: true }) as DynamicDialogRef | null;
  messageService = inject(MessageService);
  http = inject(HttpClient);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private hostEl = inject(ElementRef);

  // Keeps a reference to the layout scroll container so we can restore it on destroy
  private scrollContainer: HTMLElement | null = null;

  @Output() requestCreated = new EventEmitter<any>();

  // State
  messages = signal<ChatMessage[]>([]);
  isTyping = signal<boolean>(false);
  summary = signal<string>('');
  files = signal<File[]>([]);
  isDragging = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  inputText: string = '';

  // Mobile Sidebar State
  showMobileSidebar = signal<boolean>(false);

  // Attach panel and summary drawer
  attachPanelVisible = signal<boolean>(false);
  showSummaryDrawer = signal<boolean>(false);
  showHistoryDrawer = signal<boolean>(false);

  // Conversations history
  conversations = signal<ConversationItem[]>([]);
  conversationsLoading = signal<boolean>(false);
  conversationMessagesLoading = signal<boolean>(false);
  selectedConversationId = signal<string | null>(null);

  // Search & grouping
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

  // Cancels any in-flight assistant or conversation-load request
  private cancelPending$ = new Subject<void>();
  private destroy$ = new Subject<void>();
  private blobUrls: string[] = [];

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

  downloadDocument(attachment: ChatMessageAttachment, msgIndex: number): void {
    if (attachment.downloading) return;
    this.messages.update(msgs =>
      msgs.map((m, i) => i === msgIndex ? { ...m, attachment: { ...m.attachment!, downloading: true } } : m)
    );
    const headers = new HttpHeaders({ 'x-api-key': environment.chatApiKey });
    const body = { agentId: environment.chatAgentId, channelId: environment.chatChannelId, path: attachment.path };
    this.http.post(environment.chatDownloadFileUrl, body, { headers, responseType: 'blob' })
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
    const headers = new HttpHeaders({ 'x-api-key': environment.chatApiKey });
    const body = {
      agentId: environment.chatAgentId,
      channelId: environment.chatChannelId,
      contactId: email
    };
    this.http.post<ConversationItem[]>(
      environment.chatGetConversationsUrl,
      body,
      { headers }
    ).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        const sorted = list.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.conversations.set(sorted);
        this.conversationsLoading.set(false);
        // Si no hay conversación seleccionada (chat nuevo), seleccionar la más reciente
        if (!this.selectedConversationId() && sorted.length > 0) {
          this.selectedConversationId.set(sorted[0].id);
        }
      },
      error: () => {
        this.conversationsLoading.set(false);
      }
    });
  }

  selectConversation(conv: ConversationItem): void {
    if (this.isTyping()) return;
    const email = this.authService.currentUser()?.email;
    if (!email) return;
    // Cancel any pending request before starting a new one
    this.cancelPending$.next();
    this.selectedConversationId.set(conv.id);
    this.conversationMessagesLoading.set(true);
    this.messages.set([]);
    this.summary.set('');
    const headers = new HttpHeaders({ 'x-api-key': environment.chatApiKey });
    const body = {
      agentId: environment.chatAgentId,
      channelId: environment.chatChannelId,
      contactId: email,
      conversationId: conv.id
    };
    this.http.post<ConversationMessage[]>(
      environment.chatGetMessagesUrl,
      body,
      { headers }
    ).pipe(takeUntil(this.cancelPending$)).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        // Deduplicate by id, then sort ascending by timestamp
        const unique = list.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
        const sorted = unique.sort(
          (a, b) => a.messageContent.timestamp - b.messageContent.timestamp
        );
        const mapped: ChatMessage[] = sorted.map(m => {
          const meta = m.messageContent.metadata;
          let attachment: ChatMessageAttachment | null = null;
          if (meta?.path && meta?.name) {
            const mimeType = meta.mimeType || meta.contentType || '';
            const apiType = m.messageContent.type?.toLowerCase() ?? '';
            let attType: ChatMessageAttachment['type'] = 'document';
            // API type "file" always means document — takes absolute priority
            if (apiType === 'file') {
              attType = 'document';
            } else if (mimeType.startsWith('image/') || apiType === 'image') {
              attType = 'image';
            } else if (mimeType.startsWith('audio/') || apiType === 'audio') {
              attType = 'audio';
            } else if (mimeType.startsWith('video/') || apiType === 'video') {
              attType = 'video';
            }
            // application/, text/, font/, or unknown → document (default)
            const fullPath = meta.path.endsWith('/') ? meta.path + meta.name : meta.path + '/' + meta.name;
            const isMedia = attType !== 'document';
            attachment = { type: attType, name: meta.name, mimeType, path: fullPath, blobUrl: null, loading: isMedia };
          }
          return {
            role: m.sender.id === m.agentId ? 'assistant' : 'user',
            content: m.messageContent.text,
            timestamp: new Date(m.messageContent.timestamp * 1000),
            ppt: (m.messageContent.type === 'File' && meta?.extension?.toLowerCase() === '.pptx')
              ? meta.path
              : null,
            attachment
          };
        });

        this.messages.set(mapped);

        // Download media (images, audio, video) for messages that have attachments
        mapped.forEach((msg, index) => {
          if (!msg.attachment || msg.attachment.type === 'document') return;
          const dlHeaders = new HttpHeaders({ 'x-api-key': environment.chatApiKey });
          const dlBody = { agentId: environment.chatAgentId, channelId: environment.chatChannelId, path: msg.attachment.path };
          this.http.post(environment.chatDownloadFileUrl, dlBody, { headers: dlHeaders, responseType: 'blob' })
            .pipe(takeUntil(this.cancelPending$))
            .subscribe({
              next: (blob) => {
                const b = blob as Blob;
                if (b.size === 0) {
                  // Empty response: file not found — degrade to document widget
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

        this.conversationMessagesLoading.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => {
        this.conversationMessagesLoading.set(false);
      }
    });
  }

  // Unique ID for the conversation session
  private memoryUniqueId: string;

  // Mock computed value to enable the submit button if we have enough info
  // For a real implementation, this would check if the required fields in summary are populated
  isRequestReady = computed(() => {
    return this.messages().length > 2 || this.summary().length > 0;
  });

  constructor() {
    // Generate a unique GUID for this conversation
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

  // --- Modal Logic ---
  closeDialog() {
    if (this.ref) {
      this.ref.close();
    } else {
      this.resetChat();
    }
  }

  // --- Chat Logic ---

  sendMessage() {
    if (!this.inputText.trim() || this.isTyping()) return;

    const text = this.inputText.trim();
    this.inputText = '';

    // Add user message
    this.messages.update(m => [...m, {
      role: 'user',
      content: text,
      timestamp: new Date()
    }]);

    // Reset textarea height
    if (this.chatInput) {
      this.chatInput.nativeElement.style.height = '44px';
    }

    this.scrollToBottom();
    this.askAssistant(text);
  }

  onKeyDown(event: KeyboardEvent, textarea: HTMLTextAreaElement) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = '44px';
    textarea.style.height = textarea.scrollHeight + 'px';
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
    this.cancelPending$.next();
    this.messages.set([]);
    this.summary.set('');
    this.files.set([]);
    this.inputText = '';
    this.selectedConversationId.set(null);
    if (this.chatInput) {
      this.chatInput.nativeElement.style.height = '44px';
    }
  }

  ngAfterViewInit(): void {
    // Walk up the DOM to find the nearest scrollable layout wrapper and disable its
    // scroll so the page never shifts — only this component disables it and restores on destroy.
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
  }

  // Call the AI assistant API
  private askAssistant(userText: string) {
    this.isTyping.set(true);
    const user = this.authService.currentUser();
    const email = user?.email ?? '';

    const conversationId = this.selectedConversationId();
    const payload = {
      async: false,
      data: {
        agentId: environment.chatAgentId,
        conversationId: conversationId,
        contactId: email || null,
        channelId: environment.chatChannelId,
        message: {
          text: userText,
          type: 'text',
          timestamp: String(Math.floor(Date.now() / 1000)),
          metadata: null
        }
      }
    };

    this.http.post<any>(
      environment.chatSendMessageUrl,
      payload,
      { headers: { 'x-api-key': environment.chatApiKey } }
    ).pipe(takeUntil(this.cancelPending$)).subscribe({
      next: (response) => {
        this.isTyping.set(false);

        let responseText = '';
        // Primary: new format { output: { response: "..." }, metadata: {...} }
        if (response?.output?.response) {
          responseText = response.output.response;
        } else if (Array.isArray(response) && response.length > 0 && response[0].output?.response) {
          responseText = response[0].output.response;
        } else if (response?.response) {
          responseText = response.response;
        } else if (typeof response === 'string') {
          responseText = response;
        } else if (response?.message) {
          responseText = response.message;
        } else if (response?.text) {
          responseText = response.text;
        } else if (response?.answer) {
          responseText = response.answer;
        } else {
          try {
            responseText = JSON.stringify(response);
          } catch (e) {
            responseText = 'Respuesta recibida en formato desconocido.';
          }
        }

        const pptUrl: string | null =
          response?.metadata?.connector_ppt ??
          response?.output?.ppt ??
          response?.ppt ??
          null;

        this.messages.update(m => [...m, {
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          ppt: pptUrl
        }]);

        // Si el API devuelve un resumen actualizado, lo usamos
        if (response && response.summary) {
          this.summary.set(response.summary);
        }

        this.scrollToBottom();
        this.loadConversations();
      },
      error: (err) => {
        this.isTyping.set(false);
        console.error('Error asking assistant:', err);

        // Check if the error is due to JSON parsing of a text response
        if (err.error instanceof SyntaxError || err.name === 'HttpErrorResponse' && err.error && typeof err.error.text === 'string') {
          this.messages.update(m => [...m, {
            role: 'assistant',
            content: err.error.text || err.error,
            timestamp: new Date()
          }]);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error de Asistente', detail: 'No se pudo obtener respuesta del asistente en este momento.' });
        }
        this.scrollToBottom();
      }
    });
  }

  // --- File Upload Logic ---

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
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  }

  private handleFiles(fileList: FileList) {
    const validExtensions = ['audio/', 'text/plain', 'application/pdf'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const newFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isValidType = validExtensions.some(ext => file.type.startsWith(ext) || file.type === ext);

      if (!isValidType && !file.name.endsWith('.txt')) {
        this.messageService.add({ severity: 'error', summary: 'Tipo de archivo inválido', detail: `${file.name} no es soportado.` });
        continue;
      }

      if (file.size > maxFileSize) {
        this.messageService.add({ severity: 'error', summary: 'Archivo demasiado grande', detail: `${file.name} excede los 10MB.` });
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      this.files.update(f => [...f, ...newFiles]);

      newFiles.forEach(file => {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const textContent = e.target?.result as string;

            // Mostrar en el chat que el usuario subió el archivo
            this.messages.update(m => [...m, {
              role: 'user',
              content: `[Archivo subido: ${file.name}]`,
              timestamp: new Date()
            }]);
            this.scrollToBottom();

            // Enviar el contenido del texto a la API
            this.askAssistant(`Contenido del documento ${file.name}:\n\n${textContent}`);
          };
          reader.readAsText(file);
        } else {
          // Para otros tipos de archivos (audio, pdf) mostramos un mensaje temporal
          this.messages.update(m => [...m, {
            role: 'assistant',
            content: `He recibido el archivo ${file.name}. Por ahora, la lectura automática y análisis directo está habilitada solo para archivos de texto (.txt).`,
            timestamp: new Date()
          }]);
          this.scrollToBottom();
        }
      });
    }
  }

  removeFile(index: number) {
    this.files.update(f => {
      const updated = [...f];
      updated.splice(index, 1);
      return updated;
    });
  }

  // --- Submission ---

  submitRequest() {
    this.isSubmitting.set(true);

    // Simulate API call to create request
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Solicitud creada correctamente.' });

      const result = {
        name: 'Nueva Solicitud via Chat',
        description: this.summary(),
        // other mapped fields...
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
