<script setup>
import { useRouter } from 'vue-router'
import { getUser, logout } from '../services/auth'

const router = useRouter()
const user = getUser()

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <header>
      <span class="brand">Products</span>
      <button type="button" class="logout" @click="handleLogout">Log out</button>
    </header>

    <main>
      <p v-if="user">Hey, {{ user.name }}</p>
      <p class="hint">You're logged in. Build the product screens from here.</p>
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
  max-width: 720px;
  margin: 40px auto;
  padding: 0 24px;
}

.hint {
  color: #666;
}
</style>
