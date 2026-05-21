<script setup>
import { useRouter } from 'vue-router'
import { logout } from '../services/auth'

const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <header>
      <router-link to="/products" class="brand">Products</router-link>
      <button type="button" class="logout" @click="handleLogout">Log out</button>
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
  font-weight: 600;
  color: #222;
  text-decoration: none;
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
</style>
