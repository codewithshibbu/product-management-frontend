import api from '../api/axios'

const unreadRefreshListeners = new Set()

export function subscribeUnreadCountRefresh(callback) {
  unreadRefreshListeners.add(callback)
  return () => unreadRefreshListeners.delete(callback)
}

export function notifyUnreadCountRefresh() {
  unreadRefreshListeners.forEach((callback) => callback())
}

export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/unread-count')
  return data
}

export async function fetchNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params })
  return data
}

export async function markAsRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

export async function markAllAsRead() {
  const { data } = await api.patch('/notifications/read-all')
  return data
}

export async function clearAllNotifications() {
  const { data } = await api.delete('/notifications')
  return data
}
