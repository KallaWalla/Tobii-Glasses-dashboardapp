import axios from 'axios';

// Base API now points directly to /classes (no simrooms)
const api = axios.create({
  baseURL: 'http://localhost:8000/calibrations',
});

export const CalibrationAPI = {

  addCalibrationRecording: async (recordingId) => {
    const formData = new FormData();
    formData.append('recording_id', recordingId);
    const response = await api.post('/', formData);
    return response.data;
  },

  deleteCalibrationRecording: async (calibrationId) => {
    const response = await api.delete(`/${calibrationId}`);
    return response.data;
  },

  getCalibrationRecordings: async () => {
    const response = await api.get('/');   
    return response.data;
  },
};