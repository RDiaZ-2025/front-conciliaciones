const resolveApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:22741/api';
    }
    if (host.includes('wonderful-coast') || host.includes('brave-bay') || host.includes('test')) {
      return 'https://voc-backend-test.azurewebsites.net/api';
    }
  }
  return 'http://localhost:22741/api';
};

export const environment = {
  production: false,
  apiUrl: resolveApiUrl(),
  festivosApiKey: 'fs_3mNHbhSyjhJyTtdhiKhQjtAC6LWj1MAc',
  festivosApiUrl: 'https://festivos.com.co/api/v1/festivos',
  uploadNotifyUrl: 'https://renediaz2025.app.n8n.cloud/webhook/a4784977-134a-4f09-9ea3-04c85c5ba3b7',
  chatAccessToken: 'SgJhjtMN78E3EmJWrczj-qhCHY9wOovZfquv2g8e8',
  chatAgentId: 'drWvQYWbVmoG8rRTxseV',
  chatChannelId: 'qhCHY9wOovZfquv2g8e8',
  chatApiKey: 'qhCHY9wOovZfquv2g8e8',
  chatGetConversationsUrl: 'https://api.azemblia.ai/Agents/contact-conversations',
  chatGetMessagesUrl: 'https://api.azemblia.ai/Agents/conversation-messages',
  chatDownloadFileUrl: 'https://api.azemblia.ai/Files/download',
  chatSendMessageUrl: 'https://api.azemblia.ai/WebChat/message'
};
