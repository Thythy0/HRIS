import api from '../api/axios';

export const notificationService = {
  list: () => api.get('/notification').then(r => r.data),
  get: (id: number | string) => api.get('/notification/' + id).then(r => r.data),
  create: (data: any) => api.post('/notification', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/notification/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/notification/' + id).then(r => r.data),
};
