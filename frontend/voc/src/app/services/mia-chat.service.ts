import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  id: string;
  phone: string;
  name: string;
  email: string;
  address: string;
  urlPhotoProfile: string | null;
}

export interface ConversationMessageContent {
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

export interface ConversationMessage {
  id: string;
  agentId: string;
  conversationId: string;
  contactId: string;
  channelId: string;
  sender: ConversationMessageSender;
  messageContent: ConversationMessageContent;
}

@Injectable({
  providedIn: 'root'
})
export class MiaChatService extends BaseApiService {
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
