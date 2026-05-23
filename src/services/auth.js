import api from '../api/axios'
import {
  saveSession,
  clearAuth,
  isLoggedIn,
  getToken,
  getUser,
  sessionUser,
} from './token'

export { isLoggedIn, getToken, getUser, clearAuth, sessionUser }

export async function login(email, password) {
  const { data } = await api.post('/login', { email, password })
  saveSession(data.token, data.user)
  await refreshCurrentUser()
  return data
}

export async function register(payload) {
  const { data } = await api.post('/register', payload)
  saveSession(data.token, data.user)
  await refreshCurrentUser()
  return data
}

/** Reload user from API so is_super_admin stays in sync with backend .env. */
export async function refreshCurrentUser() {
  if (!isLoggedIn()) return null
  try {
    const { data } = await api.get('/user')
    if (data.user) {
      saveSession(getToken(), data.user)
    }
    return data.user ?? null
  } catch {
    return getUser()
  }
}

export async function logout() {
  try {
    await api.post('/logout')
  } finally {
    clearAuth()
  }
}
