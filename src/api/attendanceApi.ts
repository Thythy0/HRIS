import api from './axios';

export const attendanceApi = {
  list: () => api.get('/attendance').then(r => r.data),
  get: (id: number | string) => api.get('/attendance/' + id).then(r => r.data),
  create: (data: any) => api.post('/attendance', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/attendance/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/attendance/' + id).then(r => r.data),
};
