import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { BaseApiService } from './base-api.service';
import { environment } from '../../environments/environment';

export interface WebMessageFile {
  path: string;
  name: string;
  mimeType: string;
  size: number;
  extension: string;
}

export interface WebMessageContent {
  text?: string | null;
  type: string;
  timestamp?: string | null;
  file?: WebMessageFile | null;
}

export interface WebMessageRequest {
  agentId: string;
  conversationId?: string | null;
  contactId: string;
  channelId: string;
  message: WebMessageContent;
}

export interface ConversationItem {
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

export interface ConversationMessageSender {
  id?: string;
  phone?: string;
  name?: string;
  email?: string;
  address?: string;
  urlPhotoProfile?: string | null;
}

export interface ConversationMessageContent {
  text?: string;
  type?: string;
  timestamp?: number | string;
  metadata?: {
    name?: string;
    extension?: string;
    size?: number;
    contentType?: string;
    mimeType?: string;
    duration?: number | null;
    path?: string;
  } | null;
}

export interface ConversationMessage {
  id?: string;
  agentId?: string;
  conversationId?: string;
  contactId?: string;
  channelId?: string;
  sender?: ConversationMessageSender | string;
  messageContent?: ConversationMessageContent;
  message?: ConversationMessageContent;
  text?: string;
  timestamp?: number | string;
}

@Injectable({
  providedIn: 'root'
})
export class MiaChatService extends BaseApiService {
  private hubConnection: signalR.HubConnection | null = null;
  private currentContactId: string | null = null;
  private currentConversationId: string | null = null;

  private messageReceivedSubject = new Subject<any>();
  private conversationUpdatedSubject = new Subject<any>();
  private connectionStateSubject = new BehaviorSubject<signalR.HubConnectionState>(signalR.HubConnectionState.Disconnected);

  public readonly messageReceived$ = this.messageReceivedSubject.asObservable();
  public readonly conversationUpdated$ = this.conversationUpdatedSubject.asObservable();
  public readonly connectionState$ = this.connectionStateSubject.asObservable();

  public get connectionState(): signalR.HubConnectionState {
    return this.hubConnection ? this.hubConnection.state : signalR.HubConnectionState.Disconnected;
  }

  public async startSignalR(contactId?: string): Promise<void> {
    if (contactId) {
      this.currentContactId = contactId;
    }

    const hubUrl = environment.chatHubUrl || 'https://api.azemblia.ai/hubs/chat';

    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.hubConnection.on('ReceiveMessage', (message: any) => {
        this.messageReceivedSubject.next(message);
      });

      this.hubConnection.on('ConversationUpdated', (conversation: any) => {
        this.conversationUpdatedSubject.next(conversation);
      });

      this.hubConnection.onreconnected(async () => {
        this.connectionStateSubject.next(signalR.HubConnectionState.Connected);
        if (this.currentContactId) {
          await this.joinContact(this.currentContactId);
        }
        if (this.currentConversationId) {
          await this.joinConversation(this.currentConversationId);
        }
      });

      this.hubConnection.onreconnecting(() => {
        this.connectionStateSubject.next(signalR.HubConnectionState.Reconnecting);
      });

      this.hubConnection.onclose(() => {
        this.connectionStateSubject.next(signalR.HubConnectionState.Disconnected);
      });
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.hubConnection.start();
        this.connectionStateSubject.next(signalR.HubConnectionState.Connected);
        if (this.currentContactId) {
          await this.joinContact(this.currentContactId);
        }
        if (this.currentConversationId) {
          await this.joinConversation(this.currentConversationId);
        }
      } catch (err) {
        console.error('[MiaChat] Error connecting to SignalR:', err);
      }
    } else if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      if (this.currentContactId) {
        await this.joinContact(this.currentContactId);
      }
      if (this.currentConversationId) {
        await this.joinConversation(this.currentConversationId);
      }
    }
  }

  public async joinConversation(conversationId: string): Promise<void> {
    if (!conversationId) return;
    this.currentConversationId = conversationId;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('JoinConversation', conversationId);
      } catch (err) {
        console.error(`[MiaChat] Error joining conversation room ${conversationId}:`, err);
      }
    }
  }

  public async leaveConversation(conversationId: string): Promise<void> {
    if (!conversationId) return;
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveConversation', conversationId);
      } catch (err) {
        console.error(`[MiaChat] Error leaving conversation room ${conversationId}:`, err);
      }
    }
  }

  public async joinContact(contactId: string): Promise<void> {
    if (!contactId) return;
    this.currentContactId = contactId;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('JoinContact', contactId);
      } catch (err) {
        console.error(`[MiaChat] Error joining contact room ${contactId}:`, err);
      }
    }
  }

  public async leaveContact(contactId: string): Promise<void> {
    if (!contactId) return;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveContact', contactId);
      } catch (err) {
        console.error(`[MiaChat] Error leaving contact room ${contactId}:`, err);
      }
    }
  }

  public async stopSignalR(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.connectionStateSubject.next(signalR.HubConnectionState.Disconnected);
      } catch (err) {
        console.error('[MiaChat] Error stopping SignalR:', err);
      }
    }
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ 'x-api-key': environment.chatApiKey });
  }

  getConversations(contactId: string): Observable<ConversationItem[]> {
    const body = {
      agentId: environment.chatAgentId,
      channelId: environment.chatChannelId,
      contactId
    };
    return this.http.post<ConversationItem[]>(
      environment.chatGetConversationsUrl,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  getConversationMessages(contactId: string, conversationId: string): Observable<ConversationMessage[]> {
    const body = {
      agentId: environment.chatAgentId,
      channelId: environment.chatChannelId,
      contactId,
      conversationId
    };
    return this.http.post<ConversationMessage[]>(
      environment.chatGetMessagesUrl,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  sendMessage(payload: WebMessageRequest): Observable<any> {
    return this.http.post<any>(
      environment.chatSendMessageUrl,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  downloadFile(cleanPath: string): Observable<Blob> {
    const body = {
      agentId: environment.chatAgentId,
      channelId: environment.chatChannelId,
      path: cleanPath
    };
    return this.http.post(
      environment.chatDownloadFileUrl,
      body,
      { headers: this.getAuthHeaders(), responseType: 'blob' }
    );
  }

  buildMessagePayload(
    contactId: string,
    userText: string,
    conversationId?: string | null,
    webMessageFile?: WebMessageFile | null,
    fileMessageType: string = 'text',
    sendTimeSeconds: number = Math.floor(Date.now() / 1000)
  ): WebMessageRequest {
    return {
      agentId: environment.chatAgentId,
      conversationId: conversationId || null,
      contactId: contactId || '',
      channelId: environment.chatChannelId,
      message: {
        text: userText || null,
        type: webMessageFile ? fileMessageType : 'text',
        timestamp: String(sendTimeSeconds),
        file: webMessageFile || null
      }
    };
  }
}
