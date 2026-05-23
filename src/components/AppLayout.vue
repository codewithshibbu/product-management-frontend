<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '../services/auth'
import { sessionUser } from '../services/token'
import NotificationBell from './NotificationBell.vue'

const router = useRouter()

const currentUser = sessionUser

const welcomeName = computed(() => {
  const name = sessionUser.value?.name?.trim()
  return name || sessionUser.value?.email || 'User'
})

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
        <p class="welcome">
          Welcome, <span class="welcome-name">{{ welcomeName }}</span>
          <span v-if="currentUser?.is_super_admin" class="role-badge">Super admin</span>
        </p>
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
  gap: 12px;
}

.welcome {
  margin: 0;
  font-size: 0.9rem;
  color: #444;
}

.welcome-name {
  font-weight: 600;
  color: #222;
}

.role-badge {
  margin-left: 6px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #7c3aed;
  background: #ede9fe;
  border-radius: 999px;
  vertical-align: middle;
}

.logout {
  padding: 8px 14px;
  border: 1px solid #b42318;
  border-radius: 6px;
  background: #dc2626;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.logout:hover {
  background: #b42318;
}

main {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}
</style>
