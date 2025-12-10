import { apiRequest } from './baseApiService';

export const cover15MinuteService = {
  saveCover: async (uploaderLog: string, url: string) => {
    return await apiRequest('/covers-15-minutes', {
      method: 'POST',
      body: JSON.stringify({ uploaderLog, url })
    });
  },

  getAllCovers: async () => {
    return await apiRequest('/covers-15-minutes');
  }
};
