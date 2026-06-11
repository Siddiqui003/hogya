import api from './api';

export const roomService = {
  // User
  getMyRooms: () => api.get('/rooms'),
  getRoomById: (id) => api.get(`/rooms/${id}`),
  getRoomByCode: (code) => api.get(`/rooms/code/${code}`),
  getRoomMembers: (id) => api.get(`/rooms/${id}/members`),
  getRoomActivity: (id, limit = 30) => api.get(`/rooms/${id}/activity?limit=${limit}`),

  // Admin
  adminListRooms: (params = {}) => api.get('/admin/rooms', { params }),
  adminGetRoom: (id) => api.get(`/admin/rooms/${id}`),
  adminCreateRoom: (data) => api.post('/admin/rooms', data),
  adminUpdateRoom: (id, data) => api.patch(`/admin/rooms/${id}`, data),
  adminDeleteRoom: (id) => api.delete(`/admin/rooms/${id}`),
  adminAddMember: (roomId, userId) => api.post(`/admin/rooms/${roomId}/members`, { userId }),
  adminRemoveMember: (roomId, userId) => api.delete(`/admin/rooms/${roomId}/members/${userId}`),
  adminListUsers: (search = '') => api.get(`/admin/users${search ? `?search=${search}` : ''}`),
  adminGetActivity: (roomId) => api.get(`/admin/rooms/${roomId}/activity`),
};
