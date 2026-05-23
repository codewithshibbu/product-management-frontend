<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProducts, deleteProduct, productListAction } from '../services/products'

const route = useRoute()

const products = ref([])
const lowStockCount = ref(0)
const meta = ref({})
const loading = ref(false)
const error = ref('')
const selectedIds = ref([])
const bulkMenuOpen = ref(false)
const bulkMenuRef = ref(null)
const bulkActionLoading = ref(false)

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

const allPageSelected = computed(
  () =>
    products.value.length > 0 &&
    products.value.every((p) => selectedIds.value.includes(p.id))
)

const somePageSelected = computed(
  () => selectedIds.value.length > 0 && !allPageSelected.value
)

const hasSelection = computed(() => selectedIds.value.length > 0)

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
    selectedIds.value = selectedIds.value.filter((id) =>
      products.value.some((p) => p.id === id)
    )
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
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
    if (products.value.length === 1 && filters.value.page > 1) {
      filters.value.page--
    }
    loadProducts()
  } catch {
    alert('Could not delete product.')
  }
}

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id) {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function toggleSelectAll() {
  if (allPageSelected.value) {
    const pageIds = products.value.map((p) => p.id)
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    const merged = new Set([...selectedIds.value, ...products.value.map((p) => p.id)])
    selectedIds.value = [...merged]
  }
}

function toggleBulkMenu() {
  bulkMenuOpen.value = !bulkMenuOpen.value
}

function closeBulkMenu() {
  bulkMenuOpen.value = false
}

async function onDeleteSelected() {
  closeBulkMenu()
  const ids = [...selectedIds.value]
  if (ids.length === 0) {
    alert('Select at least one product, or use Delete all.')
    return
  }
  if (!confirm(`Delete ${ids.length} selected product(s)?`)) return

  bulkActionLoading.value = true
  try {
    await productListAction({ action: 'delete', ids })
    selectedIds.value = []
    if (products.value.length <= ids.length && filters.value.page > 1) {
      filters.value.page--
    }
    await loadProducts()
  } catch {
    alert('Could not delete selected products.')
  } finally {
    bulkActionLoading.value = false
  }
}

async function onDeleteAll() {
  closeBulkMenu()
  if (!confirm('Delete ALL products? This cannot be undone.')) return

  bulkActionLoading.value = true
  try {
    await productListAction({ action: 'delete-all' })
    selectedIds.value = []
    filters.value.page = 1
    await loadProducts()
  } catch {
    alert('Could not delete all products.')
  } finally {
    bulkActionLoading.value = false
  }
}

function onBulkMenuOutside(event) {
  if (bulkMenuRef.value && !bulkMenuRef.value.contains(event.target)) {
    closeBulkMenu()
  }
}

onMounted(() => {
  loadProducts()
  document.addEventListener('click', onBulkMenuOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onBulkMenuOutside)
})

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

      <template v-else>
        <div class="list-toolbar">
          <label class="select-all">
            <input
              type="checkbox"
              :checked="allPageSelected"
              :indeterminate.prop="somePageSelected"
              @change="toggleSelectAll"
            />
            <span>Select all on page</span>
          </label>

          <span v-if="hasSelection" class="selection-count">
            {{ selectedIds.length }} selected
          </span>

          <div ref="bulkMenuRef" class="bulk-menu-wrap">
            <button
              type="button"
              class="bulk-toggle"
              :class="{ open: bulkMenuOpen }"
              :disabled="bulkActionLoading"
              aria-label="Bulk actions"
              @click.stop="toggleBulkMenu"
            >
              <span class="caret" aria-hidden="true">▲</span>
            </button>
            <div v-if="bulkMenuOpen" class="bulk-menu" @click.stop>
              <button
                type="button"
                :disabled="!hasSelection || bulkActionLoading"
                @click="onDeleteSelected"
              >
                Delete selected
              </button>
              <button
                type="button"
                class="danger"
                :disabled="bulkActionLoading"
                @click="onDeleteAll"
              >
                Delete all products
              </button>
            </div>
          </div>
        </div>

        <ul class="list">
        <li
          v-for="p in products"
          :key="p.id"
          class="item"
          :class="{ active: activeProductId === p.id, selected: isSelected(p.id) }"
        >
          <label class="row-check">
            <input
              type="checkbox"
              :checked="isSelected(p.id)"
              @change="toggleSelect(p.id)"
            />
          </label>
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
      </template>

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

.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.selection-count {
  font-size: 0.85rem;
  color: #555;
}

.bulk-menu-wrap {
  position: relative;
  margin-left: auto;
}

.bulk-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 32px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.bulk-toggle:hover:not(:disabled) {
  background: #f4f5f7;
}

.bulk-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bulk-toggle .caret {
  display: inline-block;
  font-size: 0.75rem;
  transition: transform 0.15s ease;
}

.bulk-toggle.open .caret {
  transform: rotate(180deg);
}

.bulk-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  z-index: 20;
  overflow: hidden;
}

.bulk-menu button {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: #fff;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
}

.bulk-menu button:hover:not(:disabled) {
  background: #f4f5f7;
}

.bulk-menu button:disabled {
  color: #999;
  cursor: not-allowed;
}

.bulk-menu button.danger {
  color: #b42318;
  border-top: 1px solid #eee;
}

.row-check {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
  flex-shrink: 0;
}

.list li.item.selected {
  border-color: #93b4ff;
  background: #f8faff;
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
  gap: 10px;
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
