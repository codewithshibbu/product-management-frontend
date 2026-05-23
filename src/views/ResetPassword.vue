<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '../services/auth'

const route = useRoute()
const router = useRouter()

const email = ref((route.query.email || '').toString())
const token = ref((route.query.token || '').toString())
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref('')

const linkValid = computed(() => Boolean(email.value && token.value))

function getErrorMessage(e) {
  const data = e.response?.data
  if (!data) return 'Something went wrong. Try again.'
  if (data.message) return data.message
  const first = data.errors && Object.values(data.errors).flat()[0]
  return first || 'Something went wrong. Try again.'
}

async function onSubmit() {
  if (!linkValid.value) return

  error.value = ''
  loading.value = true

  try {
    await resetPassword({
      email: email.value,
      token: token.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    router.push({ name: 'login', query: { reset: 'success' } })
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <form v-if="linkValid" class="auth-box" @submit.prevent="onSubmit">
      <h1>Set new password</h1>
      <p class="sub">Choose a new password for {{ email }}</p>

      <label>
        New password
        <input
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </label>

      <label>
        Confirm password
        <input
          v-model="passwordConfirmation"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Saving…' : 'Update password' }}
      </button>

      <p class="footer">
        <router-link to="/login">Back to sign in</router-link>
      </p>
    </form>

    <div v-else class="auth-box">
      <h1>Invalid link</h1>
      <p class="sub">This reset link is missing a token or email. Request a new one.</p>
      <p class="footer">
        <router-link to="/forgot-password">Request reset link</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f4f5f7;
}

.auth-box {
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
}

.footer a {
  color: #2d5bff;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
</style>
