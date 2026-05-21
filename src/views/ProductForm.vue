<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createProduct, buildProductFormData } from '../services/products'

const router = useRouter()

const name = ref('')
const description = ref('')
const price = ref('')
const category = ref('')
const stockQuantity = ref(0)
const lowStockThreshold = ref(10)
const imageFiles = ref([])
const saving = ref(false)
const error = ref('')

function onFileChange(e) {
  imageFiles.value = Array.from(e.target.files || [])
}

async function onSubmit() {
  error.value = ''
  saving.value = true

  try {
    const formData = buildProductFormData(
      {
        name: name.value,
        description: description.value,
        price: price.value,
        category: category.value,
        stock_quantity: stockQuantity.value,
        low_stock_threshold: lowStockThreshold.value,
      },
      imageFiles.value
    )
    await createProduct(formData)
    router.push('/products')
  } catch (e) {
    error.value = e.response?.data?.message || 'Could not save product.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <router-link to="/products">Back to list</router-link>
    <h1>New product</h1>

    <form class="form" @submit.prevent="onSubmit">
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
        Category
        <input v-model="category" type="text" />
      </label>

      <label>
        Stock quantity
        <input v-model.number="stockQuantity" type="number" min="0" required />
      </label>

      <label>
        Low stock threshold
        <input v-model.number="lowStockThreshold" type="number" min="0" required />
      </label>

      <label>
        Images
        <input type="file" accept="image/*" multiple @change="onFileChange" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="saving">
        {{ saving ? 'Saving...' : 'Create product' }}
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

button {
  margin-top: 8px;
  padding: 10px 16px;
  background: #2d5bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
}

.error {
  color: #b42318;
  font-size: 0.9rem;
}
</style>
