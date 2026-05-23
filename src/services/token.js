import { ref } from 'vue'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function readUserFromStorage() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Reactive copy of the logged-in user (updates after login / profile refresh). */
export const sessionUser = ref(readUserFromStorage())

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  return sessionUser.value
}

export function isLoggedIn() {
  return !!getToken()
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  sessionUser.value = user
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionUser.value = null
}
