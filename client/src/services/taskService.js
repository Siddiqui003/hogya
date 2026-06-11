import api from './api';

export const taskService = {
  completeTask: (roomId) => api.post(`/tasks/${roomId}/complete`),
  reopenTask: (roomId) => api.post(`/tasks/${roomId}/reopen`),
  getMyStatus: (roomId) => api.get(`/tasks/${roomId}/status`),
  getAllStatuses: (roomId) => api.get(`/tasks/${roomId}/all-statuses`),
  resetAll: (roomId) => api.post(`/tasks/${roomId}/reset`),
};
