import api from '../api/axios';

export const reportService = {
  list: () => api.get('/report').then(r => r.data),
  get: (id: number | string) => api.get('/report/' + id).then(r => r.data),
  create: (data: any) => api.post('/report', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/report/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/report/' + id).then(r => r.data),
};
