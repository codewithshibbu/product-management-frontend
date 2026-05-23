<script setup>
import { useRouter } from 'vue-router'
import { logout } from '../services/auth'
import NotificationBell from './NotificationBell.vue'

const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <header>
      <router-link to="/products" class="brand">PRODUCT MANAGEMENT SYSTEM</router-link>
      <div class="header-actions">
        <NotificationBell />
        <button type="button" class="logout" @click="handleLogout">Log out</button>
      </div>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: #f4f5f7;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.brand {
  font-weight: 900;
  color: #222;
  text-decoration: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logout {
  padding: 8px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}

.logout:hover {
  background: #f9f9f9;
}

main {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}
</style>
