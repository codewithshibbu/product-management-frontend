<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchProduct,
  createProduct,
  updateProduct,
  buildProductFormData,
} from '../services/products'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'product-edit')

const name = ref('')
const description = ref('')
const price = ref('')
const stockQuantity = ref(0)
const lowStockThreshold = ref(10)
const existingImages = ref([])
const removeImageIds = ref([])
const imageFiles = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fileInput = ref(null)
const saveMenuOpen = ref(false)
const saveMenuRef = ref(null)

function resetForm() {
  name.value = ''
  description.value = ''
  price.value = ''
  stockQuantity.value = 0
  lowStockThreshold.value = 10
  existingImages.value = []
  removeImageIds.value = []
  imageFiles.value = []
  error.value = ''
}

function clearFileInput() {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function onFileChange(e) {
  imageFiles.value = Array.from(e.target.files || [])
}

function markRemove(imageId) {
  if (!removeImageIds.value.includes(imageId)) {
    removeImageIds.value.push(imageId)
  }
}

function unmarkRemove(imageId) {
  removeImageIds.value = removeImageIds.value.filter((id) => id !== imageId)
}

function isRemoved(imageId) {
  return removeImageIds.value.includes(imageId)
}

async function loadProduct() {
  if (!isEdit.value) {
    resetForm()
    return
  }
  loading.value = true
  error.value = ''
  try {
    const p = await fetchProduct(route.params.id)
    name.value = p.name
    description.value = p.description || ''
    price.value = p.price
    stockQuantity.value = p.stock_quantity
    lowStockThreshold.value = p.low_stock_threshold
    existingImages.value = p.images || []
    removeImageIds.value = []
    imageFiles.value = []
    clearFileInput()
  } catch (e) {
    error.value = e.response?.data?.message || 'Record not found.'
  } finally {
    loading.value = false
  }
}

function refreshList() {
  const query = { ...route.query }
  delete query.refresh
  query.refresh = String(Date.now())
  router.replace({
    name: route.name,
    params: route.params,
    query,
  })
}

async function onSubmit(closeAfter = false) {
  saveMenuOpen.value = false
  error.value = ''
  saving.value = true

  const formData = buildProductFormData(
    {
      name: name.value,
      description: description.value,
      price: price.value,
      stock_quantity: stockQuantity.value,
      low_stock_threshold: lowStockThreshold.value,
    },
    imageFiles.value,
    removeImageIds.value
  )

  try {
    if (isEdit.value) {
      await updateProduct(route.params.id, formData)
      if (closeAfter) {
        router.push({ name: 'products', query: { refresh: '1' } })
      } else {
        await loadProduct()
        refreshList()
      }
    } else {
      await createProduct(formData)
      if (closeAfter) {
        router.push({ name: 'products', query: { refresh: '1' } })
      } else {
        resetForm()
        clearFileInput()
        refreshList()
      }
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not save product.'
  } finally {
    saving.value = false
  }
}

function closePanel() {
  router.push({ name: 'products' })
}

function fillDummyData() {
  const suffix = Date.now().toString().slice(-6)
  name.value = `Demo Product ${suffix}`
  description.value = 'Sample description for quick testing.'
  price.value = '24.99'
  stockQuantity.value = 5
  lowStockThreshold.value = 10
  error.value = ''
}

function resetValues() {
  resetForm()
  clearFileInput()
}

function toggleSaveMenu() {
  saveMenuOpen.value = !saveMenuOpen.value
}

function onSaveMenuOutside(event) {
  if (saveMenuRef.value && !saveMenuRef.value.contains(event.target)) {
    saveMenuOpen.value = false
  }
}

const isLowStock = computed(() => stockQuantity.value <= lowStockThreshold.value)

const saveLabel = computed(() => (isEdit.value ? 'Update' : 'Create'))
const saveAndCloseLabel = computed(() =>
  isEdit.value ? 'Update and close' : 'Create and close'
)

onMounted(() => {
  loadProduct()
  document.addEventListener('click', onSaveMenuOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onSaveMenuOutside)
})

watch(() => route.params.id, loadProduct)
watch(() => route.name, loadProduct)
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <h2>{{ isEdit ? 'Edit product' : 'New product' }}</h2>
      <div class="panel-actions">
        <template v-if="!isEdit">
          <button type="button" class="dummy-btn" @click="fillDummyData">
            Fill dummy data
          </button>
          <button type="button" class="reset-btn" @click="resetValues">Reset</button>
        </template>

        <div v-if="!loading" ref="saveMenuRef" class="save-dropdown">
          <div class="save-split">
            <button
              type="button"
              class="btn-save-main"
              :disabled="saving"
              @click="onSubmit(false)"
            >
              {{ saving ? 'Saving...' : saveLabel }}
            </button>
            <button
              type="button"
              class="btn-save-caret"
              :disabled="saving"
              aria-label="More save options"
              @click.stop="toggleSaveMenu"
            >
              <span class="caret" :class="{ open: saveMenuOpen }">▼</span>
            </button>
          </div>
          <div v-if="saveMenuOpen" class="save-menu" @click.stop>
            <button type="button" :disabled="saving" @click="onSubmit(false)">
              {{ saveLabel }}
            </button>
            <button type="button" :disabled="saving" @click="onSubmit(true)">
              {{ saveAndCloseLabel }}
            </button>
          </div>
        </div>

        <button type="button" class="close-btn" @click="closePanel">Close</button>
      </div>
    </div>

    <p v-if="loading">Loading...</p>

    <form v-else id="product-form" class="form" @submit.prevent="onSubmit(false)">
      <label>
        Name
        <input v-model="name" type="text" required />
      </label>

      <label>
        Description
        <textarea v-model="description" rows="3" />
      </label>

      <label>
        Price
        <input v-model="price" type="number" min="0" step="0.01" required />
      </label>

      <label>
        Stock quantity
        <input v-model.number="stockQuantity" type="number" min="0" required />
      </label>

      <label>
        Low stock threshold
        <input v-model.number="lowStockThreshold" type="number" min="0" required />
      </label>

      <p v-if="isLowStock" class="low-hint">Stock is at or below the alert level.</p>

      <div v-if="existingImages.length" class="images">
        <p class="img-label">Current images</p>
        <div v-for="img in existingImages" :key="img.id" class="thumb">
          <img :src="img.url" alt="" :class="{ faded: isRemoved(img.id) }" />
          <button
            v-if="!isRemoved(img.id)"
            type="button"
            class="remove-btn"
            @click="markRemove(img.id)"
          >
            Remove
          </button>
          <button v-else type="button" class="remove-btn" @click="unmarkRemove(img.id)">
            Undo
          </button>
        </div>
      </div>

      <label>
        {{ isEdit ? 'Add more images' : 'Images' }}
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          @change="onFileChange"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.panel {
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

h2 {
  margin: 0;
  font-size: 1.15rem;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.save-dropdown {
  position: relative;
}

.save-split {
  display: flex;
  align-items: stretch;
}

.btn-save-main {
  padding: 6px 14px;
  background: #2d5bff;
  color: #fff;
  border: none;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.btn-save-main:hover:not(:disabled) {
  background: #2449d4;
}

.btn-save-caret {
  padding: 6px 10px;
  background: #2d5bff;
  color: #fff;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0 6px 6px 0;
  cursor: pointer;
}

.btn-save-caret:hover:not(:disabled) {
  background: #2449d4;
}

.btn-save-main:disabled,
.btn-save-caret:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.caret {
  display: inline-block;
  font-size: 0.65rem;
  transition: transform 0.15s ease;
}

.caret.open {
  transform: rotate(180deg);
}

.save-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 30;
  overflow: hidden;
}

.save-menu button {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: #fff;
  text-align: left;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-menu button:hover:not(:disabled) {
  background: #f4f5f7;
}

.save-menu button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-menu button + button {
  border-top: 1px solid #eee;
}

.dummy-btn {
  padding: 6px 12px;
  border: 1px solid #2d5bff;
  border-radius: 6px;
  background: #eef2ff;
  color: #2d5bff;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.dummy-btn:hover {
  background: #dbe4ff;
}

.reset-btn {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.reset-btn:hover {
  background: #f9f9f9;
}

.close-btn {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}

.close-btn:hover {
  background: #f9f9f9;
}

.form {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

label {
  display: block;
  margin-bottom: 12px;
  font-size: 0.85rem;
}

input,
textarea {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.images {
  margin-bottom: 12px;
}

.img-label {
  margin: 0 0 8px;
  font-size: 0.85rem;
}

.thumb {
  display: inline-block;
  margin-right: 10px;
  margin-bottom: 8px;
  vertical-align: top;
}

.thumb img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.thumb img.faded {
  opacity: 0.4;
}

.remove-btn {
  margin-top: 4px;
  padding: 0;
  border: none;
  background: none;
  color: #b42318;
  font-size: 0.75rem;
  cursor: pointer;
}

.low-hint {
  margin: -4px 0 12px;
  font-size: 0.85rem;
  color: #9a3412;
}

.error {
  color: #b42318;
  font-size: 0.9rem;
}
</style>
