export function getApiOrigin() {
  const api = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
  return api.replace(/\/api\/?$/, '')
}


export function productImageUrl(image) {
  if (!image) return null

  const origin = getApiOrigin()
  let pathname = null

  if (image.path) {
    pathname = image.path.startsWith('storage/')
      ? `/${image.path}`
      : `/storage/${image.path.replace(/^\//, '')}`
  } else if (image.url) {
    pathname = image.url.replace(/^https?:\/\/[^/]+/i, '')
    if (!pathname.startsWith('/')) {
      pathname = `/${pathname}`
    }
  }

  if (!pathname) return null

  return `${origin}${pathname}`
}
