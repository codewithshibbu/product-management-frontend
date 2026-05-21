<script setup>
import { onMounted, ref } from 'vue'
import { fetchProducts } from '../services/products'

const products = ref([])
const loading = ref(false)
const error = ref('')

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchProducts()
    products.value = data.data
  } catch {
    error.value = 'Could not load products.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
</script>

<template>
  <div class="page">
    <div class="top">
      <h1>Products</h1>
      <router-link to="/products/new" class="btn">Add product</router-link>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading">Loading...</p>

    <p v-else-if="products.length === 0" class="empty">
      No products yet.
      <router-link to="/products/new">Create one</router-link>
    </p>

    <ul v-else class="list">
      <li v-for="p in products" :key="p.id">
        <strong>{{ p.name }}</strong>
        <span>${{ Number(p.price).toFixed(2) }}</span>
        <span v-if="p.category"> · {{ p.category }}</span>
        <span> · Stock {{ p.stock_quantity }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
  font-size: 1.3rem;
}

.btn {
  padding: 8px 14px;
  background: #2d5bff;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list li {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 8px;
}

.error {
  color: #b42318;
}

.empty {
  color: #666;
}
</style>
