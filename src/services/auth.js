import api from '../api/axios'
import { saveSession, clearAuth, isLoggedIn, getToken, getUser } from './token'

export { isLoggedIn, getToken, getUser, clearAuth }

export async function login(email, password) {
  const { data } = await api.post('/login', { email, password })
  saveSession(data.token, data.user)
  return data
}

export async function register(payload) {
  const { data } = await api.post('/register', payload)
  saveSession(data.token, data.user)
  return data
}

export async function logout() {
  try {
    await api.post('/logout')
  } finally {
    clearAuth()
  }
}
