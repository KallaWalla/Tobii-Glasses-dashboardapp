import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});  
  

export const GlassesAPI = {
  getGlassesConnection: async () => {
    const response = await api.get('/glasses/connection');
    return response.data; 
  }
}