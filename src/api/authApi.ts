import api from './axios';

export const authApi = {
  list: () => api.get('/auth').then(r => r.data),
  get: (id: number | string) => api.get('/auth/' + id).then(r => r.data),
  create: (data: any) => api.post('/auth', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/auth/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/auth/' + id).then(r => r.data),
};
