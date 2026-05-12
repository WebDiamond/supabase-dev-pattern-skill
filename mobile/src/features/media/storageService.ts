// src/features/media/storageService.ts
import { supabase }          from '../../lib/supabase'
import * as ImagePicker      from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem       from 'expo-file-system'
import { randomUUID }        from 'expo-crypto'

export async function pickAndUploadAvatar(userId: string): Promise<string> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') throw new Error('Permesso galleria negato')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true, aspect: [1, 1], quality: 1,
  })
  if (result.canceled) throw new Error('Selezione annullata')

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )

  const base64    = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const byteArray = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)))
  const fileName  = `${userId}/${randomUUID()}.jpg`

  const { error } = await supabase.storage
    .from('avatars').upload(fileName, byteArray, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName, {
    transform: { width: 200, height: 200, resize: 'cover' },
  })
  return publicUrl
}
