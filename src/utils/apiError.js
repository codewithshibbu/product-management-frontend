export function getApiErrorMessage(e, fallback = 'Something went wrong.') {
  const data = e.response?.data
  if (!data) return fallback
  if (data.message) return data.message
  const first = data.errors && Object.values(data.errors).flat()[0]
  return first || fallback
}
