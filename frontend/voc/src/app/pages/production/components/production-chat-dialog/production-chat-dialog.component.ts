import { Component, ElementRef, ViewChild, signal, computed, inject } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DrawerModule } from 'primeng/drawer';
import { HttpClient } from '@angular/common/http';
import { MarkdownPipe } from '../../../../pipes/markdown.pipe';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
export class ProductionChatDialogComponent {
  @ViewChild('scrollPanel') scrollPanel!: ElementRef;
  @ViewChild('chatInput') chatInput!: ElementRef;

  ref = inject(DynamicDialogRef);
  messageService = inject(MessageService);
  http = inject(HttpClient);

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
    // Add initial greeting (optional, currently handled by empty state in HTML)
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
    this.ref.close();
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
    this.messages.set([]);
    this.summary.set('');
    this.files.set([]);
    this.inputText = '';
    if (this.chatInput) {
      this.chatInput.nativeElement.style.height = '44px';
    }
  }

  // Call the AI assistant API
  private askAssistant(userText: string) {
    this.isTyping.set(true);

    const payload = {
      data: {
        agentId: 'drWvQYWbVmoG8rRTxseV',
        memoryUniqueId: this.memoryUniqueId,
        messagesData: {
          finalMessage: userText
        }
      }
    };

    this.http.post<any>('https://api.azemblia.ai/Ai/ask-assistant', payload).subscribe({
      next: (response) => {
        this.isTyping.set(false);

        let responseText = '';
        if (Array.isArray(response) && response.length > 0 && response[0].output && response[0].output.response) {
          responseText = response[0].output.response;
        } else if (typeof response === 'string') {
          responseText = response;
        } else if (response && response.message) {
          responseText = response.message;
        } else if (response && response.response) {
          responseText = response.response;
        } else if (response && response.text) {
          responseText = response.text;
        } else if (response && response.answer) {
          responseText = response.answer;
        } else {
          try {
            responseText = JSON.stringify(response);
          } catch (e) {
            responseText = 'Respuesta recibida en formato desconocido.';
          }
        }

        this.messages.update(m => [...m, {
          role: 'assistant',
          content: responseText,
          timestamp: new Date()
        }]);

        // Si el API devuelve un resumen actualizado, lo usamos
        if (response && response.summary) {
          this.summary.set(response.summary);
        }

        this.scrollToBottom();
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

      // Return a mock result to the parent component
      this.ref.close({
        name: 'Nueva Solicitud via Chat',
        description: this.summary(),
        // other mapped fields...
      });
    }, 1500);
  }
}