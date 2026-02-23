import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/recordings',
});

export const RecordingsAPI = {
  getRoot: async () => {
    const response = await api.get('/');
    return response.data;
  },

  getLocal: async () => {
    const response = await api.get('/local');
    return response.data;
  },

  deleteLocal: async (recordingId) => {
    const response = await api.delete(`/local/${recordingId}`);
    return response.data;
  },

  getGlasses: async () => {
    const response = await api.get('/glasses');
    return response.data;
  },

  downloadRecording: async (recordingId) => {
    const response = await api.get(`/glasses/${recordingId}/download`);
    return response.data;
  },
};
