import api from '../api/axios'

export async function fetchProducts() {
  const { data } = await api.get('/products')
  return data
}

export async function createProduct(formData) {
  const { data } = await api.post('/products', formData)
  return data
}

export function buildProductFormData(fields, imageFiles = []) {
  const fd = new FormData()
  fd.append('name', fields.name)
  fd.append('description', fields.description || '')
  fd.append('price', fields.price)
  if (fields.category) {
    fd.append('category', fields.category)
  }
  fd.append('stock_quantity', fields.stock_quantity)
  fd.append('low_stock_threshold', fields.low_stock_threshold)
  imageFiles.forEach((file) => fd.append('images[]', file))
  return fd
}
