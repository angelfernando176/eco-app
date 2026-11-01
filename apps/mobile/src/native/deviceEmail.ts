import { NativeModules, Platform } from 'react-native'

export async function getDeviceRegisteredEmail(): Promise<string | null> {
  if (Platform.OS !== 'android') return null
  try {
    const result = await NativeModules.EcoAccountsModule?.getDeviceEmail()
    return typeof result === 'string' && result.length > 0 ? result : null
  } catch {
    return null
  }
}
