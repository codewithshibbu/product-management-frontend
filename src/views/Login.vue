<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../services/auth'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true

  try {
    await login(email.value, password.value)
    const redirect = route.query.redirect || '/products'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.message || 'Something went wrong. Try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-box" @submit.prevent="onSubmit">
      <h1>Sign in</h1>
      <p class="sub">Product management</p>

      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <label>
        Password
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="footer">
        No account yet?
        <router-link to="/register">Sign up</router-link>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f4f5f7;
}

.login-box {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 28px 24px;
  text-align: left;
}

h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
  font-weight: 600;
  color: #222;
}

.sub {
  margin: 0 0 20px;
  color: #666;
  font-size: 0.9rem;
}

label {
  display: block;
  margin-bottom: 14px;
  font-size: 0.85rem;
  color: #444;
}

input {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4a7cff;
}

.error {
  margin: 0 0 12px;
  color: #b42318;
  font-size: 0.9rem;
}

button {
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 6px;
  background: #2d5bff;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #244dd4;
}

.footer {
  margin: 16px 0 0;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}

.footer a {
  color: #2d5bff;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
