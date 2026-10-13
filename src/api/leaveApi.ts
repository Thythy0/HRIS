import api from './axios';

export const leaveApi = {
  list: () => api.get('/leave').then(r => r.data),
  get: (id: number | string) => api.get('/leave/' + id).then(r => r.data),
  create: (data: any) => api.post('/leave', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/leave/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/leave/' + id).then(r => r.data),
};
