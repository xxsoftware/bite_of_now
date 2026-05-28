import { Stronghold, Client, Store } from '@tauri-apps/plugin-stronghold'

let strongholdInstance: Stronghold | null = null
let clientInstance: Client | null = null
let storeInstance: Store | null = null

const VAULT_PATH = 'bite_of_now.stronghold'
const CLIENT_NAME = 'bite_of_now_client'
// In production, use a proper password derivation from device ID or user PIN
const PASSWORD = 'bite-of-now-secure-vault-2026'

async function getStore() {
  if (!storeInstance) {
    strongholdInstance = await Stronghold.load(VAULT_PATH, PASSWORD)
    try {
      clientInstance = await strongholdInstance.loadClient(CLIENT_NAME)
    } catch {
      clientInstance = await strongholdInstance.createClient(CLIENT_NAME)
    }
    storeInstance = clientInstance.getStore()
  }
  return storeInstance
}

export async function saveEncryptedKey(key: string, value: string): Promise<void> {
  const store = await getStore()
  await store.insert(key, Array.from(new TextEncoder().encode(value)))
  if (strongholdInstance) {
    await strongholdInstance.save()
  }
}

export async function getEncryptedKey(key: string): Promise<string | null> {
  try {
    const store = await getStore()
    const data = await store.get(key)
    if (!data) return null
    return new TextDecoder().decode(new Uint8Array(data))
  } catch {
    return null
  }
}

export async function deleteEncryptedKey(key: string): Promise<void> {
  try {
    const store = await getStore()
    await store.remove(key)
    if (strongholdInstance) {
      await strongholdInstance.save()
    }
  } catch {
    // ignore
  }
}
