export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = "__localstorage_test__"
    window.localStorage.setItem(testKey, "1")
    window.localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

export const getItem = (key: string): string | null => {
  try {
    if (!isLocalStorageAvailable()) return null
    return window.localStorage.getItem(key)
  } catch (e) {
    return null
  }
}

export const setItem = (key: string, value: string): void => {
  try {
    if (!isLocalStorageAvailable()) return
    window.localStorage.setItem(key, value)
  } catch (e) {
    // swallow errors in restricted environments
  }
}

export const removeItem = (key: string): void => {
  try {
    if (!isLocalStorageAvailable()) return
    window.localStorage.removeItem(key)
  } catch (e) {
    // swallow
  }
}

export default {
  isLocalStorageAvailable,
  getItem,
  setItem,
  removeItem,
}
