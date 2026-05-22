<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProducts, deleteProduct } from '../services/products'

const route = useRoute()

const products = ref([])
const lowStockCount = ref(0)
const meta = ref({})
const loading = ref(false)
const error = ref('')

const showForm = computed(
  () => route.name === 'product-create' || route.name === 'product-edit'
)

const activeProductId = computed(() =>
  route.name === 'product-edit' ? Number(route.params.id) : null
)

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
    lowStockCount.value = data.low_stock_count ?? 0
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

watch(
  () => route.name,
  (name, prev) => {
    if (
      (prev === 'product-create' || prev === 'product-edit') &&
      name === 'products'
    ) {
      loadProducts()
    }
  }
)
</script>

<template>
  <div class="page" :class="{ 'is-split': showForm }">
    <section class="list-panel" :class="{ half: showForm }">
      <div class="top">
        <h1>Products</h1>
        <router-link to="/products/new" class="btn">Add product</router-link>
      </div>

      <div class="filters" :class="{ compact: showForm }">
        <input
          v-model="filters.search"
          type="search"
          class="filter-search"
          placeholder="Search name or description"
          @input="onSearchInput"
        />
        <input
          v-model="filters.min_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Min price"
        />
        <input
          v-model="filters.max_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Max price"
        />
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
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
        </select>
        <button type="button" class="btn-secondary" @click="applyFilters">Apply</button>
      </div>

      <p v-if="lowStockCount > 0" class="low-banner">
        {{ lowStockCount }} product(s) low on stock.
      </p>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading">Loading...</p>

      <p v-else-if="products.length === 0" class="empty">No products found.</p>

      <ul v-else class="list">
        <li
          v-for="p in products"
          :key="p.id"
          class="item"
          :class="{ active: activeProductId === p.id }"
        >
          <div class="item-main">
            <strong>{{ p.name }}</strong>
            <span>${{ Number(p.price).toFixed(2) }}</span>
            <span> · Stock {{ p.stock_quantity }}</span>
            <span v-if="p.is_low_stock" class="low"> · Low stock</span>
          </div>
          <div class="actions">
            <router-link :to="`/products/${p.id}/edit`" class="edit">Edit</router-link>
            <button type="button" class="delete" @click="onDelete(p.id)">Delete</button>
          </div>
        </li>
      </ul>

      <div v-if="meta.last_page > 1" class="pager">
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="goToPage(meta.current_page - 1)"
        >
          Prev
        </button>
        <span class="pager-label">
          {{ meta.current_page }} / {{ meta.last_page }}
        </span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="goToPage(meta.current_page + 1)"
        >
          Next
        </button>
      </div>
    </section>

    <aside v-if="showForm" class="form-panel">
      <router-view />
    </aside>
  </div>
</template>

<style scoped>
.page {
  min-height: calc(100vh - 53px);
}

.page.is-split {
  display: flex;
  align-items: stretch;
}

.list-panel {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

.list-panel.half {
  flex: 0 0 50%;
  max-width: 50%;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.form-panel {
  flex: 0 0 50%;
  max-width: 50%;
  min-width: 0;
  overflow-y: auto;
  background: #f4f5f7;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
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

.filters.compact .filter-search {
  flex: 1 1 100%;
  min-width: 0;
}

.filters.compact input,
.filters.compact select {
  flex: 1 1 calc(50% - 4px);
  min-width: 0;
}

.filters.compact .check {
  flex: 1 1 100%;
}

.filters.compact .btn-secondary {
  flex: 1 1 100%;
}

.filters input,
.filters select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.filters:not(.compact) .filter-search {
  min-width: 200px;
  flex: 1 1 220px;
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
  white-space: nowrap;
}

.btn-secondary {
  padding: 7px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.low-banner {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  color: #9a3412;
  font-size: 0.9rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list li.item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 8px;
}

.list li.item.active {
  border-color: #2d5bff;
  box-shadow: 0 0 0 1px #2d5bff;
}

.item-main {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.item-main strong {
  display: block;
  margin-bottom: 2px;
}

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  font-size: 0.85rem;
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
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.pager-label {
  font-size: 0.85rem;
  color: #555;
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
