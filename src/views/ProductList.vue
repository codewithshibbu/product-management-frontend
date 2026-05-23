<script setup>
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProducts, deleteProduct, productListAction } from '../services/products'
import { sessionUser } from '../services/token'
import { productImageUrl } from '../utils/productImage'
import ConfirmModal from '../components/ConfirmModal.vue'

const defaultFilters = () => ({
  search: '',
  min_price: '',
  max_price: '',
  low_stock: false,
  mine: false,
  sort: 'created_at',
  order: 'desc',
  rows: 10,
  page: 1,
})

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

const filters = ref(defaultFilters())

const confirmModal = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'OK',
  danger: true,
  loading: false,
  action: null,
})

function openConfirm({ title, message, confirmLabel, danger = true, action }) {
  confirmModal.value = {
    open: true,
    title,
    message,
    confirmLabel: confirmLabel || 'OK',
    danger,
    loading: false,
    action,
  }
}

function closeConfirm() {
  confirmModal.value.open = false
  confirmModal.value.action = null
}

async function onConfirmOk() {
  const fn = confirmModal.value.action
  if (!fn) {
    closeConfirm()
    return
  }
  confirmModal.value.loading = true
  try {
    await fn()
    closeConfirm()
  } catch (e) {
    confirmModal.value.loading = false
    error.value =
      e.response?.status === 403
        ? e.response?.data?.message || 'You do not have permission for this action.'
        : 'Action failed. Please try again.'
    closeConfirm()
  }
}

let searchTimer = null

const isSuperAdmin = computed(() => Boolean(sessionUser.value?.is_super_admin))

function canManageProduct(product) {
  if (!product) return false
  if (isSuperAdmin.value) return true
  const uid = sessionUser.value?.id
  return uid != null && product.user_id === uid
}

function manageableOnPage() {
  return products.value.filter((p) => canManageProduct(p))
}

const allPageSelected = computed(() => {
  const pageIds = manageableOnPage().map((p) => p.id)
  return pageIds.length > 0 && pageIds.every((id) => selectedIds.value.includes(id))
})

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
  if (!params.mine) delete params.mine
  else params.mine = 1
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

function resetFilters() {
  filters.value = defaultFilters()
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

function onDelete(id) {
  openConfirm({
    title: 'Delete product',
    message: 'Delete this product? This cannot be undone.',
    confirmLabel: 'Delete',
    action: async () => {
      await deleteProduct(id)
      selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
      if (products.value.length === 1 && filters.value.page > 1) {
        filters.value.page--
      }
      await loadProducts()
    },
  })
}

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function productImages(product) {
  return product.images ?? []
}

function firstImageUrl(product) {
  return productImageUrl(productImages(product)[0])
}

function creatorName(product) {
  return product.user?.name?.trim() || '—'
}

function extraImageCount(product) {
  const count = productImages(product).length
  return count > 1 ? count - 1 : 0
}

const imageModalProduct = ref(null)
const enlargedImageIndex = ref(0)

const modalImages = computed(() =>
  imageModalProduct.value ? productImages(imageModalProduct.value) : []
)

const enlargedImageSrc = computed(() =>
  productImageUrl(modalImages.value[enlargedImageIndex.value])
)

function openImageGallery(product) {
  if (!productImages(product).length) return
  imageModalProduct.value = product
  enlargedImageIndex.value = 0
}

function closeImageGallery() {
  imageModalProduct.value = null
}

function selectEnlargedImage(index) {
  enlargedImageIndex.value = index
}

function onImageModalKeydown(event) {
  if (!imageModalProduct.value) return
  if (event.key === 'Escape') {
    closeImageGallery()
    return
  }
  const last = modalImages.value.length - 1
  if (event.key === 'ArrowLeft' && enlargedImageIndex.value > 0) {
    enlargedImageIndex.value--
  }
  if (event.key === 'ArrowRight' && enlargedImageIndex.value < last) {
    enlargedImageIndex.value++
  }
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
  const pageIds = manageableOnPage().map((p) => p.id)
  if (pageIds.length === 0) return

  const allManagedSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.value.includes(id))

  if (allManagedSelected) {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    const merged = new Set([...selectedIds.value, ...pageIds])
    selectedIds.value = [...merged]
  }
}

function toggleBulkMenu() {
  bulkMenuOpen.value = !bulkMenuOpen.value
}

function closeBulkMenu() {
  bulkMenuOpen.value = false
}

function onDeleteSelected() {
  closeBulkMenu()
  const ids = [...selectedIds.value]
  if (ids.length === 0) {
    openConfirm({
      title: 'Nothing selected',
      message: 'Select at least one product, or use Delete all products.',
      confirmLabel: 'OK',
      danger: false,
      action: async () => {},
    })
    return
  }

  openConfirm({
    title: 'Delete selected',
    message: `Delete ${ids.length} selected product(s)? This cannot be undone.`,
    confirmLabel: 'Delete',
    action: async () => {
      bulkActionLoading.value = true
      try {
        await productListAction({ action: 'delete', ids })
        selectedIds.value = []
        if (products.value.length <= ids.length && filters.value.page > 1) {
          filters.value.page--
        }
        await loadProducts()
      } finally {
        bulkActionLoading.value = false
      }
    },
  })
}

function onDeleteAll() {
  closeBulkMenu()
  openConfirm({
    title: 'Delete all products',
    message: 'Delete every product in the catalog? This cannot be undone.',
    confirmLabel: 'Delete all',
    action: async () => {
      bulkActionLoading.value = true
      try {
        await productListAction({ action: 'delete-all' })
        selectedIds.value = []
        filters.value.page = 1
        await loadProducts()
      } finally {
        bulkActionLoading.value = false
      }
    },
  })
}

function onBulkMenuOutside(event) {
  if (bulkMenuRef.value && !bulkMenuRef.value.contains(event.target)) {
    closeBulkMenu()
  }
}

provide('refreshProducts', () => loadProducts())

onMounted(() => {
  loadProducts()
  document.addEventListener('click', onBulkMenuOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onBulkMenuOutside)
  document.removeEventListener('keydown', onImageModalKeydown)
  document.body.style.overflow = ''
})

watch(imageModalProduct, (product) => {
  if (product) {
    document.addEventListener('keydown', onImageModalKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onImageModalKeydown)
    document.body.style.overflow = ''
  }
})

watch(
  () => [
    filters.value.sort,
    filters.value.order,
    filters.value.rows,
    filters.value.low_stock,
    filters.value.mine,
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

</script>

<template>
  <div class="page" :class="{ 'has-form': showForm }">
    <section class="list-panel">
      <div class="top-bar">
        <h1>
          Products
          <span v-if="meta.total != null" class="title-count">({{ meta.total }})</span>
        </h1>
        <p v-if="lowStockCount > 0" class="low-banner" role="status">
          {{ lowStockCount }} product{{ lowStockCount === 1 ? '' : 's' }} low on stock.
        </p>
        <router-link to="/products/new" class="btn btn-add">Add product</router-link>
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
        <label class="check">
          <input v-model="filters.mine" type="checkbox" />
          Added by me
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
        <button type="button" class="btn-reset" @click="resetFilters">Reset</button>
      </div>

      <div
        v-if="
          error ||
          (loading && products.length === 0) ||
          (!loading && products.length === 0)
        "
        class="list-state"
      >
        <p v-if="error" class="error">{{ error }}</p>
        <p v-else-if="loading" class="state-msg">Loading...</p>
        <p v-else class="state-msg">No products found.</p>
      </div>

      <template v-else>
        <div class="table-wrap" :class="{ 'is-refreshing': refreshing }">
          <div class="table-bulk-bar">
            <label
              class="bulk-check-slot select-all"
              :title="`Select all on page (${products.length})`"
            >
              <input
                type="checkbox"
                :checked="allPageSelected"
                :indeterminate.prop="somePageSelected"
                @change="toggleSelectAll"
              />
              <span class="bulk-select-count" aria-hidden="true">{{ selectedIds.length }}</span>
              <span class="sr-only">Select all on page, {{ selectedIds.length }} selected</span>
            </label>

            <div class="bulk-actions-slot">
              <div ref="bulkMenuRef" class="bulk-menu-wrap">
                <button
                  type="button"
                  class="bulk-toggle"
                  :class="{ open: bulkMenuOpen }"
                  :disabled="bulkActionLoading"
                  aria-haspopup="menu"
                  :aria-expanded="bulkMenuOpen"
                  aria-label="Delete actions"
                  @click.stop="toggleBulkMenu"
                >
                  <span class="caret" aria-hidden="true">▲</span>
                </button>
                <div v-if="bulkMenuOpen" class="bulk-menu" role="menu" @click.stop>
                  <button
                    type="button"
                    role="menuitem"
                    :disabled="!hasSelection || bulkActionLoading"
                    @click="onDeleteSelected"
                  >
                    Delete selected
                  </button>
              <button
                v-if="isSuperAdmin"
                type="button"
                role="menuitem"
                class="danger"
                :disabled="bulkActionLoading"
                @click="onDeleteAll"
              >
                Delete all products
              </button>
                </div>
              </div>
            </div>
          </div>
          <table class="product-table" :class="{ compact: showForm }">
            <colgroup>
              <col class="col-check" />
              <col v-if="!showForm" class="col-image" />
              <col class="col-name" />
              <col v-if="!showForm" class="col-desc" />
              <col class="col-price" />
              <col class="col-stock" />
              <col v-if="!showForm" class="col-created" />
              <col class="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th class="col-check" scope="col">
                  <span class="sr-only">Select</span>
                </th>
                <th v-if="!showForm" class="col-image" scope="col">Images</th>
                <th class="col-name" scope="col">Product Name</th>
                <th v-if="!showForm" class="col-desc" scope="col">Description</th>
                <th class="col-price" scope="col">Price</th>
                <th class="col-stock" scope="col">Stock</th>
                <th v-if="!showForm" class="col-created" scope="col">Added by</th>
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
                    :disabled="!canManageProduct(p)"
                    :aria-label="`Select ${p.name}`"
                    @change="toggleSelect(p.id)"
                  />
                </td>
                <td v-if="!showForm" class="col-image">
                  <button
                    v-if="firstImageUrl(p)"
                    type="button"
                    class="image-cell-btn"
                    :aria-label="`View images for ${p.name}`"
                    @click="openImageGallery(p)"
                  >
                    <img
                      :src="firstImageUrl(p)"
                      :alt="p.name"
                      class="thumb"
                    />
                    <span v-if="extraImageCount(p)" class="more-badge">
                      +{{ extraImageCount(p) }} more
                    </span>
                  </button>
                  <span v-else class="no-img">—</span>
                </td>
                <td class="col-name">
                  <div class="name-cell">
                    <span class="name-text">{{ p.name }}</span>
                    <span v-if="isLowStock(p)" class="low-badge">Low stock</span>
                  </div>
                </td>
                <td v-if="!showForm" class="col-desc">
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
                <td v-if="!showForm" class="col-created">{{ creatorName(p) }}</td>
                <td class="col-action">
                  <template v-if="canManageProduct(p)">
                    <router-link :to="`/products/${p.id}/edit`" class="btn-edit">
                      Edit
                    </router-link>
                    <button type="button" class="btn-delete" @click="onDelete(p.id)">
                      Delete
                    </button>
                  </template>
                  <span v-else class="action-view-only">View only</span>
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

    <ConfirmModal
      :open="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-label="confirmModal.confirmLabel"
      :danger="confirmModal.danger"
      :loading="confirmModal.loading"
      @confirm="onConfirmOk"
      @cancel="closeConfirm"
    />

    <Teleport to="body">
      <div
        v-if="imageModalProduct"
        class="image-modal-backdrop"
        role="presentation"
        @click.self="closeImageGallery"
      >
        <div
          class="image-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`Images for ${imageModalProduct.name}`"
        >
          <header class="image-modal-header">
            <h2 class="image-modal-title">{{ imageModalProduct.name }}</h2>
            <button
              type="button"
              class="image-modal-close"
              aria-label="Close"
              @click="closeImageGallery"
            >
              ×
            </button>
          </header>

          <div class="image-modal-main">
            <img
              v-if="enlargedImageSrc"
              :src="enlargedImageSrc"
              :alt="`${imageModalProduct.name} image ${enlargedImageIndex + 1}`"
              class="image-modal-enlarge"
            />
          </div>

          <div
            v-if="modalImages.length > 1"
            class="image-modal-thumbs"
            role="list"
          >
            <button
              v-for="(img, index) in modalImages"
              :key="img.id"
              type="button"
              role="listitem"
              class="image-modal-thumb-btn"
              :class="{ active: index === enlargedImageIndex }"
              :aria-label="`View image ${index + 1}`"
              :aria-current="index === enlargedImageIndex ? 'true' : undefined"
              @click="selectEnlargedImage(index)"
            >
              <img
                :src="productImageUrl(img)"
                :alt="`${imageModalProduct.name} thumbnail ${index + 1}`"
              />
            </button>
          </div>

          <p v-if="modalImages.length > 1" class="image-modal-hint">
            Click a thumbnail or use arrow keys to switch images
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  min-height: calc(100vh - 53px);
}

.page.has-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) min(640px, 58vw);
  align-items: stretch;
}

.list-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: calc(100vh - 53px);
  padding: 8px 16px 24px;
  box-sizing: border-box;
}

.list-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 32px 16px;
  text-align: center;
}

.list-state .state-msg {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.list-state .error {
  margin: 0;
}

.page.has-form .list-panel {
  height: calc(100vh - 53px);
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid #ddd;
}

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
  padding-bottom: 1px;
}

.page.has-form .filters > * {
  flex-shrink: 0;
}

.page.has-form .filter-search {
  width: 180px;
  min-width: 180px;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  min-width: 0;
}

.top-bar h1 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.title-count {
  font-weight: 600;
  color: #444;
}

.top-bar .low-banner {
  flex: 0 1 auto;
  min-width: 0;
}

.btn-add {
  margin-left: auto;
  flex-shrink: 0;
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

.btn-reset {
  padding: 7px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f4f5f7;
  color: #444;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-reset:hover {
  background: #e8eaef;
}

.table-bulk-bar {
  display: flex;
  align-items: center;
  padding: 6px 12px 4px;
  background: transparent;
}

.bulk-check-slot {
  flex: 0 0 56px;
  width: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin: 0 14px;
  cursor: pointer;
}

.bulk-select-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #444;
  min-width: 1ch;
  line-height: 1;
  user-select: none;
}

.bulk-actions-slot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.select-all {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.bulk-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.bulk-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
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
  left: 0;
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
  min-width: 1000px;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.product-table.compact {
  min-width: 0;
}

.product-table.compact col.col-name {
  width: auto;
}

.product-table.compact col.col-price {
  width: 22%;
}

.product-table.compact col.col-stock {
  width: 18%;
}

.product-table.compact col.col-action {
  width: 28%;
}

.product-table col.col-check {
  width: 56px;
}

.product-table col.col-image {
  width: 88px;
}

.product-table col.col-name {
  width: 16%;
}

.product-table col.col-desc {
  width: 28%;
}

.product-table col.col-price {
  width: 9%;
}

.product-table col.col-stock {
  width: 7%;
}

.product-table col.col-created {
  width: 12%;
}

.product-table col.col-action {
  width: 13%;
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

.product-table th.col-created,
.product-table td.col-created {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  vertical-align: top;
  font-size: 0.85rem;
  color: #444;
}

.product-table th.col-action,
.product-table td.col-action {
  white-space: nowrap;
}

.image-cell-btn {
  position: relative;
  display: block;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.image-cell-btn:hover .thumb {
  border-color: #2d5bff;
}

.image-cell-btn:focus-visible {
  outline: 2px solid #2d5bff;
  outline-offset: 2px;
  border-radius: 4px;
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
  border: 1px solid #e5e5e5;
}

.more-badge {
  display: block;
  margin-top: 3px;
  font-size: 0.68rem;
  font-weight: 600;
  color: #2d5bff;
  line-height: 1.2;
  white-space: nowrap;
}

.no-img {
  color: #999;
}

.image-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.55);
  box-sizing: border-box;
}

.image-modal {
  width: min(720px, 100%);
  max-height: min(90vh, 900px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.image-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}

.image-modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-modal-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: #f4f5f7;
  color: #444;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.image-modal-close:hover {
  background: #e8eaef;
}

.image-modal-main {
  flex: 1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #f8f9fb;
  overflow: auto;
}

.image-modal-enlarge {
  max-width: 100%;
  max-height: min(60vh, 520px);
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.image-modal-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  background: #fff;
}

.image-modal-thumb-btn {
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  overflow: hidden;
}

.image-modal-thumb-btn img {
  display: block;
  width: 56px;
  height: 56px;
  object-fit: cover;
}

.image-modal-thumb-btn:hover {
  border-color: #c7d7ff;
}

.image-modal-thumb-btn.active {
  border-color: #2d5bff;
}

.image-modal-hint {
  margin: 0;
  padding: 0 16px 12px;
  font-size: 0.75rem;
  color: #888;
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

.action-view-only {
  font-size: 0.8rem;
  color: #888;
}

.low-banner {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 6px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  color: #9a3412;
  font-size: 0.85rem;
  line-height: 1.4;
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
</style>
