<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchUnreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  subscribeUnreadCountRefresh,
} from '../services/notifications'
import ConfirmModal from './ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const root = ref(null)
const open = ref(false)
const unreadCount = ref(0)
const notifications = ref([])
const loading = ref(false)
const clearConfirmOpen = ref(false)
const clearing = ref(false)
const actionError = ref('')

async function refreshCount() {
  try {
    const data = await fetchUnreadCount()
    unreadCount.value = data.unread_count ?? 0
  } catch {
    unreadCount.value = 0
  }
}

async function loadList() {
  loading.value = true
  actionError.value = ''
  try {
    const data = await fetchNotifications({ rows: 20 })
    notifications.value = data.data ?? []
  } catch {
    notifications.value = []
    actionError.value = 'Could not load alerts.'
  } finally {
    loading.value = false
  }
}

async function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    await Promise.all([loadList(), refreshCount()])
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function onItemClick(notification) {
  if (!notification.is_read) {
    try {
      await markAsRead(notification.id)
      notification.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      /* still navigate on failure */
    }
  }
  open.value = false
  if (notification.product_id) {
    router.push(`/products/${notification.product_id}/edit`)
  }
}

async function onMarkAll() {
  actionError.value = ''
  try {
    await markAllAsRead()
    notifications.value.forEach((n) => {
      n.is_read = true
    })
    unreadCount.value = 0
  } catch {
    actionError.value = 'Could not mark all as read.'
  }
}

function onClearAllClick() {
  clearConfirmOpen.value = true
}

function onClearCancel() {
  clearConfirmOpen.value = false
}

async function onClearConfirm() {
  clearing.value = true
  actionError.value = ''
  try {
    await clearAllNotifications()
    notifications.value = []
    unreadCount.value = 0
    clearConfirmOpen.value = false
  } catch {
    actionError.value = 'Could not clear alerts.'
  } finally {
    clearing.value = false
  }
}

function onClickOutside(event) {
  if (root.value && !root.value.contains(event.target)) {
    open.value = false
  }
}

let unsubscribeUnreadRefresh = null

onMounted(() => {
  refreshCount()
  unsubscribeUnreadRefresh = subscribeUnreadCountRefresh(refreshCount)
  document.addEventListener('click', onClickOutside)
})

watch(
  () => route.name,
  (name, prev) => {
    if (
      name === 'products' &&
      (prev === 'product-create' || prev === 'product-edit')
    ) {
      refreshCount()
    }
  }
)

onUnmounted(() => {
  unsubscribeUnreadRefresh?.()
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="root" class="bell-wrap">
    <button type="button" class="bell-btn" aria-label="Stock notifications" @click.stop="toggleOpen">
      <span class="bell-label">Alerts</span>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="dropdown" @click.stop>
      <div class="dropdown-head">
        <div class="head-text">
          <strong>Low stock alerts</strong>
          <span v-if="unreadCount > 0" class="unread-pill">{{ unreadCount }} unread</span>
        </div>
        <div class="head-actions">
          <button
            v-if="unreadCount > 0"
            type="button"
            class="head-btn"
            @click="onMarkAll"
          >
            Mark all read
          </button>
          <button
            v-if="notifications.length > 0"
            type="button"
            class="head-btn danger"
            @click="onClearAllClick"
          >
            Clear all
          </button>
        </div>
      </div>

      <p v-if="actionError" class="dropdown-error">{{ actionError }}</p>
      <p v-if="loading" class="dropdown-msg">Loading...</p>
      <p v-else-if="notifications.length === 0" class="dropdown-msg">No alerts right now.</p>

      <ul v-else class="dropdown-list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="dropdown-item"
          :class="{ unread: !n.is_read }"
        >
          <button type="button" class="item-btn" @click="onItemClick(n)">
            <span class="item-top">
              <span v-if="!n.is_read" class="unread-dot" aria-hidden="true" />
              <span v-if="n.product?.name" class="item-product">{{ n.product.name }}</span>
            </span>
            <span class="item-text">{{ n.message }}</span>
            <span class="item-time">{{ formatTime(n.created_at) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <ConfirmModal
      :open="clearConfirmOpen"
      title="Clear all alerts"
      message="Remove every alert from the list? This deletes them from the database and cannot be undone."
      confirm-label="Clear all"
      :loading="clearing"
      @confirm="onClearConfirm"
      @cancel="onClearCancel"
    />
  </div>
</template>

<style scoped>
.bell-wrap {
  position: relative;
}

.bell-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  background: #fef3c7;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #92400e;
}

.bell-btn:hover {
  background: #fde68a;
  border-color: #d97706;
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #c2410c;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(380px, calc(100vw - 32px));
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 50;
  overflow: hidden;
}

.dropdown-head {
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(180deg, #fffbeb 0%, #fff 100%);
}

.head-text {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.head-text strong {
  font-size: 0.95rem;
  color: #1f2937;
}

.unread-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: #ffedd5;
  color: #c2410c;
  font-size: 0.75rem;
  font-weight: 600;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.head-btn {
  padding: 5px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 0.78rem;
  cursor: pointer;
}

.head-btn:hover {
  background: #f3f4f6;
}

.head-btn.danger {
  border-color: #fecaca;
  color: #b42318;
}

.head-btn.danger:hover {
  background: #fef2f2;
}

.dropdown-error {
  margin: 0;
  padding: 10px 16px;
  background: #fef2f2;
  color: #b42318;
  font-size: 0.8rem;
}

.dropdown-msg {
  margin: 0;
  padding: 24px 16px;
  color: #6b7280;
  font-size: 0.85rem;
  text-align: center;
}

.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.dropdown-item {
  border-bottom: 1px solid #f3f4f6;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item.unread {
  background: #fffbeb;
}

.item-btn {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.item-btn:hover {
  background: #f9fafb;
}

.dropdown-item.unread .item-btn:hover {
  background: #fef3c7;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ea580c;
  flex-shrink: 0;
}

.item-product {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1d4ed8;
}

.item-text {
  display: block;
  font-size: 0.82rem;
  color: #4b5563;
  line-height: 1.45;
}

.item-time {
  display: block;
  margin-top: 6px;
  font-size: 0.72rem;
  color: #9ca3af;
}
</style>
