import api from '../api/axios'

export async function fetchProducts(params = {}) {
  const { data } = await api.get('/products', { params })
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
  fd.append('stock_quantity', fields.stock_quantity)
  fd.append('low_stock_threshold', fields.low_stock_threshold)
  imageFiles.forEach((file) => fd.append('images[]', file))
  return fd
}
