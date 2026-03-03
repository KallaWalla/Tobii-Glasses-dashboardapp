import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/classes',
});

export const ClassesAPI = {

  getClasses: async () => {
    const response = await api.get('/');
    return response.data;
  },

  addClass: async (name) => {
    const formData = new FormData();
    formData.append('name', name);
    const response = await api.post('/', formData);
    return response.data;
  },

  deleteClass: async (classId) => {
    const response = await api.delete(`/${classId}`);
    return response.data;
  },
};