const API_BASE_URL = 'http://127.0.0.1:8000'

export async function processCall(file: File) {
  const formData = new FormData()

  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/calls/process`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(
      errorText || 'Failed to process the call.'
    )
  }

  return response.json()
}

// ==================================================
// DASHBOARD
// ==================================================

export async function getDashboard() {
  const response = await fetch(
    `${API_BASE_URL}/api/dashboard`
  )

  if (!response.ok) {
    throw new Error(
      'Failed to fetch dashboard data.'
    )
  }

  return response.json()
}