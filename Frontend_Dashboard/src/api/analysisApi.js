import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/analyse",
});

export const AnalysisAPI = {
  runAnalysis: async (recordingId, classIds) => {
    const response = await api.post("/", {
      recording_id: recordingId,
      class_ids: classIds,
    });
    return response.data; 
  },

  getProgress: async (jobId) => {
    const response = await api.get(`/progress/${jobId}`);    
    return response.data; 
  },

  getResult: async (jobId) => {
    const response = await api.get(`/result/${jobId}`);
    return response.data; 
  },
};