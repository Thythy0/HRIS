import api from './axios';

export const employeeApi = {
  list: () => api.get('/employee').then(r => r.data),
  get: (id: number | string) => api.get('/employee/' + id).then(r => r.data),
  create: (data: any) => api.post('/employee', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/employee/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/employee/' + id).then(r => r.data),
};
