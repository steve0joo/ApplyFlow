// Web app URL - change this for production
export const WEB_APP_URL = process.env.PLASMO_PUBLIC_WEB_APP_URL || 'http://localhost:3000'

const STORAGE_KEYS = {
  AUTH_TOKEN: 'applyflow_auth_token',
  USER_EMAIL: 'applyflow_user_email',
} as const

// Storage helpers
async function getStorageItem<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? null)
    })
  })
}

async function setStorageItem<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

async function removeStorageItem(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve)
  })
}

// Auth functions
export async function getAuthToken(): Promise<string | null> {
  return getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN)
}

export async function setAuthToken(token: string): Promise<void> {
  return setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken()
  return !!token
}

export async function openLoginPage(): Promise<void> {
  const extensionId = chrome.runtime.id
  const loginUrl = `${WEB_APP_URL}/auth/extension?extensionId=${extensionId}`
  chrome.tabs.create({ url: loginUrl })
}

export async function handleAuthCallback(token: string, email: string): Promise<void> {
  await setAuthToken(token)
  await setStorageItem(STORAGE_KEYS.USER_EMAIL, email)
}

export async function logout(): Promise<void> {
  await removeStorageItem(STORAGE_KEYS.AUTH_TOKEN)
}
