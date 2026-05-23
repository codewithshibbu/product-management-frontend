<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchUnreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  subscribeUnreadCountRefresh,
} from '../services/notifications'

const router = useRouter()
const route = useRoute()
const root = ref(null)
const open = ref(false)
const unreadCount = ref(0)
const notifications = ref([])
const loading = ref(false)

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
  try {
    const data = await fetchNotifications({ rows: 15 })
    notifications.value = data.data ?? []
  } catch {
    notifications.value = []
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
  try {
    await markAllAsRead()
    notifications.value.forEach((n) => {
      n.is_read = true
    })
    unreadCount.value = 0
  } catch {
    alert('Could not mark all as read.')
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
      Alerts
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="dropdown" @click.stop>
      <div class="dropdown-head">
        <strong>Low stock alerts</strong>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="mark-all"
          @click="onMarkAll"
        >
          Mark all read
        </button>
      </div>

      <p v-if="loading" class="dropdown-msg">Loading...</p>
      <p v-else-if="notifications.length === 0" class="dropdown-msg">No notifications yet.</p>

      <ul v-else class="dropdown-list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="dropdown-item"
          :class="{ unread: !n.is_read }"
        >
          <button type="button" class="item-btn" @click="onItemClick(n)">
            <span v-if="!n.is_read" class="dot" aria-hidden="true" />
            <span class="item-text">{{ n.message }}</span>
            <span v-if="n.product?.name" class="item-product">{{ n.product.name }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.bell-wrap {
  position: relative;
}

.bell-btn {
  position: relative;
  padding: 8px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}

.bell-btn:hover {
  background: #f9f9f9;
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #c45c00;
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
  width: 320px;
  max-height: 360px;
  overflow: auto;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 50;
}

.dropdown-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #eee;
}

.dropdown-head strong {
  font-size: 0.9rem;
}

.mark-all {
  padding: 4px 8px;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 0.8rem;
  cursor: pointer;
}

.mark-all:hover {
  text-decoration: underline;
}

.dropdown-msg {
  margin: 0;
  padding: 16px 14px;
  color: #666;
  font-size: 0.85rem;
}

.dropdown-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-item.unread {
  background: #fff8f0;
}

.item-btn {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.item-btn:hover {
  background: #f4f5f7;
}

.dropdown-item.unread .item-btn:hover {
  background: #ffedd5;
}

.item-text {
  display: block;
  font-size: 0.85rem;
  color: #222;
  line-height: 1.35;
}

.item-product {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: #2563eb;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: #c45c00;
  vertical-align: middle;
}
</style>
