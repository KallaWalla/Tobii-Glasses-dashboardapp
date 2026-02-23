import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/labeling',
});

export const LabelingAPI = {
  startLabeling: async (calibrationId) => {
    await api.post('/', null, {
      params: { calibration_id: calibrationId },
    });
  },

  getPointLabels: async () => {
    const response = await api.get('/point_labels');
    return response.data;
  },

  getCurrentFrame: async () => {
    const response = await api.get('/current_frame');
    return response.data.image;
  },

  getTimeline: async (frameIdx) => {
    const response = await api.get('/timeline', {
      params: { frame_idx: frameIdx },
    });
    return response.data;
  },

  getClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  getAnnotations: async () => {
    const response = await api.get('/annotations');
    return response.data;
  },

  postAnnotation: async (point, label, deletePoint = false) => {
    const response = await api.post('/annotations', {
      point,
      label,
      delete_point: deletePoint,
    });
    return response.data.image;
  },

  deleteAnnotation: async (annotationId) => {
    const response = await api.delete(`/annotations/${annotationId}`);
    return response.data;
  },

  startTracking: async () => {
    const response = await api.post('/tracking');
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (showInactiveClasses) => {
    const formData = new FormData();
    formData.append('show_inactive_classes', showInactiveClasses);
    const response = await api.post('/settings', formData);
    return response.data;
  },
};