<script setup>
import { ref } from 'vue'

const open = ref(false)

// Static placeholder data for UI commit only
const unreadCount = 2
const notifications = [
  {
    id: 1,
    is_read: false,
    message: 'Widget A is low on stock (3 left, alert at 10)',
    product: { name: 'Widget A' },
  },
  {
    id: 2,
    is_read: false,
    message: 'Gadget B is low on stock (1 left, alert at 5)',
    product: { name: 'Gadget B' },
  },
  {
    id: 3,
    is_read: true,
    message: 'Supply C is low on stock (0 left, alert at 8)',
    product: { name: 'Supply C' },
  },
]

function toggleOpen() {
  open.value = !open.value
}

function onItemClick() {
  open.value = false
}

function onMarkAll() {
  open.value = false
}
</script>

<template>
  <div class="bell-wrap">
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

      <p v-if="notifications.length === 0" class="dropdown-msg">No notifications yet.</p>

      <ul v-else class="dropdown-list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="dropdown-item"
          :class="{ unread: !n.is_read }"
        >
          <button type="button" class="item-btn" @click="onItemClick">
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
