import api from '../api/axios'

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
