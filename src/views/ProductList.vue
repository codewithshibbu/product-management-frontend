<script setup>
import { onMounted, ref, watch } from 'vue'
import { fetchProducts, deleteProduct } from '../services/products'

const products = ref([])
const meta = ref({})
const loading = ref(false)
const error = ref('')

const filters = ref({
  search: '',
  min_price: '',
  max_price: '',
  low_stock: false,
  sort: 'created_at',
  order: 'desc',
  rows: 10,
  page: 1,
})

let searchTimer = null

function buildParams() {
  const params = { ...filters.value }
  if (!params.search) delete params.search
  if (!params.min_price) delete params.min_price
  if (!params.max_price) delete params.max_price
  if (!params.low_stock) delete params.low_stock
  else params.low_stock = 1
  return params
}

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchProducts(buildParams())
    products.value = data.data
    meta.value = {
      current_page: data.current_page,
      last_page: data.last_page,
      total: data.total,
    }
  } catch {
    error.value = 'Could not load products.'
    products.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  filters.value.page = 1
  loadProducts()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 400)
}

function goToPage(page) {
  if (page < 1 || page > meta.value.last_page) return
  filters.value.page = page
  loadProducts()
}

async function onDelete(id) {
  if (!confirm('Delete this product?')) return
  try {
    await deleteProduct(id)
    if (products.value.length === 1 && filters.value.page > 1) {
      filters.value.page--
    }
    loadProducts()
  } catch {
    alert('Could not delete product.')
  }
}

onMounted(loadProducts)

watch(
  () => [
    filters.value.sort,
    filters.value.order,
    filters.value.rows,
    filters.value.low_stock,
  ],
  applyFilters
)
</script>

<template>
  <div class="page">
    <div class="top">
      <h1>Products</h1>
      <router-link to="/products/new" class="btn">Add product</router-link>
    </div>

    <div class="filters">
      <input
        v-model="filters.search"
        type="search"
        placeholder="Search name or description"
        @input="onSearchInput"
      />
      <input v-model="filters.min_price" type="number" min="0" step="0.01" placeholder="Min price" />
      <input v-model="filters.max_price" type="number" min="0" step="0.01" placeholder="Max price" />
      <label class="check">
        <input v-model="filters.low_stock" type="checkbox" />
        Low stock
      </label>
      <select v-model="filters.sort">
        <option value="created_at">Newest</option>
        <option value="name">Name</option>
        <option value="price">Price</option>
        <option value="stock_quantity">Stock</option>
      </select>
      <select v-model="filters.order">
        <option value="desc">Desc</option>
        <option value="asc">Asc</option>
      </select>
      <select v-model="filters.rows">
        <option :value="10">10 rows</option>
        <option :value="20">20 rows</option>
        <option :value="30">30 rows</option>
        <option :value="50">50 rows</option>
      </select>
      <button type="button" class="btn-secondary" @click="applyFilters">Apply</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading">Loading...</p>

    <p v-else-if="products.length === 0" class="empty">No products found.</p>

    <ul v-else class="list">
      <li v-for="p in products" :key="p.id" class="item">
        <div>
          <strong>{{ p.name }}</strong>
          <span>${{ Number(p.price).toFixed(2) }}</span>
          <span> · Stock {{ p.stock_quantity }}</span>
          <span
            v-if="p.stock_quantity <= p.low_stock_threshold"
            class="low"
          > · Low stock</span>
        </div>
        <div class="actions">
          <router-link :to="`/products/${p.id}/edit`" class="edit">Edit</router-link>
          <button type="button" class="delete" @click="onDelete(p.id)">Delete</button>
        </div>
      </li>
    </ul>

    <div v-if="meta.last_page > 1" class="pager">
      <button type="button" :disabled="meta.current_page <= 1" @click="goToPage(meta.current_page - 1)">
        Prev
      </button>
      <span>Page {{ meta.current_page }} of {{ meta.last_page }} ({{ meta.total }} items)</span>
      <button
        type="button"
        :disabled="meta.current_page >= meta.last_page"
        @click="goToPage(meta.current_page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  font-size: 1.3rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filters input,
.filters select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.filters input[type='search'] {
  min-width: 200px;
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.btn {
  padding: 8px 14px;
  background: #2d5bff;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-secondary {
  padding: 7px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list li.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
}

.edit {
  color: #2d5bff;
  text-decoration: none;
}

.delete {
  border: none;
  background: none;
  color: #b42318;
  cursor: pointer;
  padding: 0;
}

.low {
  color: #c2410c;
  font-weight: 600;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.pager button {
  padding: 7px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.pager button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #b42318;
}

.empty {
  color: #666;
}
</style>
