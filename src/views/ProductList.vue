<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProducts, deleteProduct, productListAction } from '../services/products'

const route = useRoute()
const router = useRouter()

const products = ref([])
const lowStockCount = ref(0)
const meta = ref({})
const loading = ref(false)
const refreshing = ref(false)
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

const DESCRIPTION_LIMIT = 100
const expandedDescIds = ref(new Set())

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
  const hasRows = products.value.length > 0
  if (hasRows) {
    refreshing.value = true
  } else {
    loading.value = true
  }
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
    if (!hasRows) {
      products.value = []
    }
  } finally {
    loading.value = false
    refreshing.value = false
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

function firstImageUrl(product) {
  return product.images?.[0]?.url ?? null
}

function isLowStock(product) {
  if (product.is_low_stock != null) {
    return Boolean(product.is_low_stock)
  }
  return product.stock_quantity <= product.low_stock_threshold
}

function isDescExpanded(id) {
  return expandedDescIds.value.has(id)
}

function toggleDescription(id) {
  const next = new Set(expandedDescIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedDescIds.value = next
}

function getDescriptionText(product) {
  const text = (product.description || '').trim()
  if (!text) return ''
  if (isDescExpanded(product.id) || text.length <= DESCRIPTION_LIMIT) {
    return text
  }
  return `${text.slice(0, DESCRIPTION_LIMIT)}...`
}

function canExpandDescription(product) {
  return (product.description || '').trim().length > DESCRIPTION_LIMIT
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
    const leftForm =
      (prev === 'product-create' || prev === 'product-edit') && name === 'products'
    if (leftForm && route.query.refresh === '1') {
      loadProducts().finally(() => {
        router.replace({ name: 'products' })
      })
    }
  }
)

watch(
  () => route.query.refresh,
  (refresh) => {
    if (!refresh) return
    if (route.name !== 'product-create' && route.name !== 'product-edit') return

    loadProducts().finally(() => {
      const query = { ...route.query }
      delete query.refresh
      router.replace({ name: route.name, params: route.params, query })
    })
  }
)
</script>

<template>
  <div class="page" :class="{ 'has-form': showForm }">
    <section class="list-panel">
      <div class="top">
        <h1>Products</h1>
        <router-link to="/products/new" class="btn">Add product</router-link>
      </div>

      <div class="filters">
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
      <p v-else-if="loading && products.length === 0">Loading...</p>
      <p v-else-if="products.length === 0">No products found.</p>

      <template v-else>
        <div class="list-toolbar" :class="{ 'is-refreshing': refreshing }">
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

        <div class="table-wrap" :class="{ 'is-refreshing': refreshing }">
          <table class="product-table">
            <colgroup>
              <col class="col-check" />
              <col class="col-image" />
              <col class="col-name" />
              <col class="col-desc" />
              <col class="col-price" />
              <col class="col-stock" />
              <col class="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-check" scope="col">
                  <span class="sr-only">Select</span>
                </th>
                <th class="col-image" scope="col">Images</th>
                <th class="col-name" scope="col">Product Name</th>
                <th class="col-desc" scope="col">Description</th>
                <th class="col-price" scope="col">Price</th>
                <th class="col-stock" scope="col">Stock</th>
                <th class="col-action" scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in products"
                :key="p.id"
                :class="{
                  active: activeProductId === p.id,
                  selected: isSelected(p.id),
                }"
              >
                <td class="col-check">
                  <input
                    type="checkbox"
                    :checked="isSelected(p.id)"
                    :aria-label="`Select ${p.name}`"
                    @change="toggleSelect(p.id)"
                  />
                </td>
                <td class="col-image">
                  <img
                    v-if="firstImageUrl(p)"
                    :src="firstImageUrl(p)"
                    :alt="p.name"
                    class="thumb"
                  />
                  <span v-else class="no-img">—</span>
                </td>
                <td class="col-name">
                  <div class="name-cell">
                    <span class="name-text">{{ p.name }}</span>
                    <span v-if="isLowStock(p)" class="low-badge">Low stock</span>
                  </div>
                </td>
                <td class="col-desc">
                  <span v-if="!p.description?.trim()" class="no-desc">—</span>
                  <button
                    v-else-if="canExpandDescription(p)"
                    type="button"
                    class="desc-text desc-toggle"
                    :title="isDescExpanded(p.id) ? 'Show less' : 'Show full description'"
                    @click="toggleDescription(p.id)"
                  >
                    {{ getDescriptionText(p) }}
                  </button>
                  <span v-else class="desc-text">{{ p.description }}</span>
                </td>
                <td class="col-price">${{ Number(p.price).toFixed(2) }}</td>
                <td class="col-stock">{{ p.stock_quantity }}</td>
                <td class="col-action">
                  <router-link :to="`/products/${p.id}/edit`" class="btn-edit">
                    Edit
                  </router-link>
                  <button type="button" class="btn-delete" @click="onDelete(p.id)">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

.page.has-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) min(480px, 46vw);
  align-items: stretch;
}

.list-panel {
  min-width: 0;
  padding: 8px 16px 24px;
  box-sizing: border-box;
}

.page.has-form .list-panel {
  height: calc(100vh - 53px);
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid #ddd;
}

.list-toolbar.is-refreshing,
.table-wrap.is-refreshing {
  opacity: 0.65;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.form-panel {
  min-width: 0;
  height: calc(100vh - 53px);
  overflow-y: auto;
  background: #f4f5f7;
}

.page.has-form .filters {
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 4px;
}

.page.has-form .filters > * {
  flex-shrink: 0;
}

.page.has-form .filter-search {
  width: 180px;
  min-width: 180px;
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

.filters input,
.filters select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
}

.filter-search {
  min-width: 200px;
  flex: 1 1 220px;
}

.page:not(.has-form) .filter-search {
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.table-wrap {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.product-table {
  width: 100%;
  min-width: 900px;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.product-table col.col-check {
  width: 44px;
}

.product-table col.col-image {
  width: 76px;
}

.product-table col.col-name {
  width: 16%;
}

.product-table col.col-desc {
  width: 34%;
}

.product-table col.col-price {
  width: 10%;
}

.product-table col.col-stock {
  width: 8%;
}

.product-table col.col-action {
  width: 14%;
}

.product-table th,
.product-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

.product-table thead th {
  background: #f8f9fb;
  font-weight: 600;
  color: #333;
  font-size: 0.85rem;
}

.product-table tbody tr:last-child td {
  border-bottom: none;
}

.product-table tbody tr:hover {
  background: #fafbfc;
}

.product-table tbody tr.selected {
  background: #f8faff;
}

.product-table tbody tr.active {
  background: #eef4ff;
  box-shadow: inset 3px 0 0 #2d5bff;
}

.product-table th.col-check,
.product-table td.col-check {
  text-align: center;
}

.product-table th.col-name,
.product-table td.col-name {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
}

.product-table th.col-desc,
.product-table td.col-desc {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
}

.product-table tbody td {
  vertical-align: top;
}

.desc-text {
  display: block;
  width: 100%;
  max-width: 100%;
  font-size: 0.85rem;
  color: #444;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
}

.desc-toggle {
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.5;
}

.desc-toggle:hover {
  color: #2d5bff;
}

.no-desc {
  color: #999;
}

.product-table th.col-price,
.product-table td.col-price,
.product-table th.col-stock,
.product-table td.col-stock {
  white-space: nowrap;
}

.product-table th.col-action,
.product-table td.col-action {
  white-space: nowrap;
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
  border: 1px solid #e5e5e5;
}

.no-img {
  color: #999;
}

.name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 100%;
}

.name-text {
  font-weight: 600;
  color: #222;
}

.low-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: middle;
}

.btn-edit,
.btn-delete {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  margin-right: 6px;
}

.btn-edit {
  color: #2d5bff;
  border-color: #2d5bff;
  background: #fff;
}

.btn-edit:hover {
  background: #eef2ff;
}

.btn-delete {
  color: #b42318;
  border-color: #f5c4c0;
  background: #fff;
}

.btn-delete:hover {
  background: #fef3f2;
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
