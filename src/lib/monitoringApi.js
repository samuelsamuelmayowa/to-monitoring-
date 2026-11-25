import { authRequest } from './authApi.js'

const API_ROOT = (import.meta.env?.VITE_MONITORING_API_BASE_URL || '/api/monitoring').replace(/\/$/, '')
export const monitoringRequest = (path, options = {}) => authRequest(path, { ...options, baseUrl: API_ROOT })
