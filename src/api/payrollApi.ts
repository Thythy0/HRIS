import api from './axios';

export const payrollApi = {
  list: () => api.get('/payroll').then(r => r.data),
  get: (id: number | string) => api.get('/payroll/' + id).then(r => r.data),
  create: (data: any) => api.post('/payroll', data).then(r => r.data),
  update: (id: number | string, data: any) => api.put('/payroll/' + id, data).then(r => r.data),
  remove: (id: number | string) => api.delete('/payroll/' + id).then(r => r.data),
};
