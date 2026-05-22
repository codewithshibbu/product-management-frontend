<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchProduct,
  createProduct,
  updateProduct,
  buildProductFormData,
} from '../services/products'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

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
  if (!isEdit.value) return
  loading.value = true
  try {
    const p = await fetchProduct(route.params.id)
    name.value = p.name
    description.value = p.description || ''
    price.value = p.price
    stockQuantity.value = p.stock_quantity
    lowStockThreshold.value = p.low_stock_threshold
    existingImages.value = p.images || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Record not found.'
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
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
    } else {
      await createProduct(formData)
    }
    router.push('/products')
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not save product.'
  } finally {
    saving.value = false
  }
}

const isLowStock = computed(() => stockQuantity.value <= lowStockThreshold.value)

onMounted(loadProduct)
</script>

<template>
  <div class="page">
    <router-link to="/products">Back to list</router-link>
    <h1>{{ isEdit ? 'Edit product' : 'New product' }}</h1>

    <p v-if="loading">Loading...</p>

    <form v-else class="form" @submit.prevent="onSubmit">
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
        <input type="file" accept="image/*" multiple @change="onFileChange" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="saving">
        {{ saving ? 'Saving...' : isEdit ? 'Update' : 'Create product' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.page a {
  color: #666;
  font-size: 0.9rem;
}

h1 {
  margin: 16px 0;
  font-size: 1.3rem;
}

.form {
  max-width: 400px;
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
  width: 80px;
  height: 80px;
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

button[type='submit'] {
  margin-top: 8px;
  padding: 10px 16px;
  background: #2d5bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button[type='submit']:disabled {
  opacity: 0.7;
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
