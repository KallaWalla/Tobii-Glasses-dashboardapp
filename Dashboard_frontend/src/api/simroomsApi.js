import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/simrooms', 
});

export const SimroomsAPI = {
  getSimrooms: async (simroomId) => {
    const response = await api.get('/', {
      params: simroomId ? { simroom_id: simroomId } : {},
    });
    return response.data;
  },

  addSimroom: async (name) => {
    const formData = new FormData();
    formData.append('name', name);
    const response = await api.post('/add', formData);
    return response.data;
  },

  deleteSimroom: async (simroomId) => {
    const response = await api.delete(`/${simroomId}`);
    return response.data;
  },

  getSimroomClasses: async (simroomId) => {
    const response = await api.get(`/${simroomId}/classes`);
    return response.data;
  },

  addSimroomClass: async (simroomId, className) => {
    const formData = new FormData();
    formData.append('class_name', className);
    const response = await api.post(`/${simroomId}/classes/add`, formData);
    return response.data;
  },

  deleteSimroomClass: async (simroomId, classId) => {
    const response = await api.delete(`/${simroomId}/classes/${classId}`);
    return response.data;
  },

  addCalibrationRecording: async (simroomId, recordingId) => {
    const formData = new FormData();
    formData.append('recording_id', recordingId);
    const response = await api.post(`/${simroomId}/calibration_recordings`, formData);
    return response.data;
  },

  deleteCalibrationRecording: async (simroomId, calibrationId) => {
    const response = await api.delete(`/${simroomId}/calibration_recordings/${calibrationId}`);
    return response.data;
  },
};
