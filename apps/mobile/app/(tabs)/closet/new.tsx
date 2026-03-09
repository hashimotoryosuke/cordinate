import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { apiRequest } from '../../../src/lib/api'
import type { ClothingItem } from '@cordinate/shared'

const colors = {
  primary: '#1A1A1A',
  accent: '#C9A84C',
  background: '#FAFAFA',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  mutedText: '#71717A',
}

interface PresignedUrlResponse {
  data: {
    uploadUrl: string
    publicUrl: string
    key: string
  }
}

export default function NewClosetItemScreen() {
  const router = useRouter()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<string>('')

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('カメラのアクセス許可が必要です', 'アプリの設定からカメラへのアクセスを許可してください。')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function handleLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('フォトライブラリのアクセス許可が必要です', 'アプリの設定からフォトライブラリへのアクセスを許可してください。')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function handleUpload() {
    if (!imageUri) return

    setIsUploading(true)
    try {
      // Step 1: 署名付きURLを取得
      setUploadStep('アップロード準備中...')
      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const presignedRes = await apiRequest<PresignedUrlResponse>(
        '/upload/presigned-url',
        {
          method: 'POST',
          body: JSON.stringify({ contentType, extension: ext }),
        }
      )
      const { uploadUrl, publicUrl } = presignedRes.data

      // Step 2: R2 に PUT アップロード
      setUploadStep('画像をアップロード中...')
      const imageBlob = await fetch(imageUri).then((r) => r.blob())
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: imageBlob,
      })
      if (!uploadRes.ok) {
        throw new Error('画像のアップロードに失敗しました')
      }

      // Step 3: DBに登録
      setUploadStep('登録中...')
      await apiRequest<{ data: ClothingItem }>('/closet', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: publicUrl }),
      })

      Alert.alert('追加完了', '服をクローゼットに追加しました！', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: unknown) {
      Alert.alert(
        'エラー',
        e instanceof Error ? e.message : '追加に失敗しました。もう一度お試しください。'
      )
    } finally {
      setIsUploading(false)
      setUploadStep('')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>服を追加</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          服を追加してください{'\n'}AIが自動でタグ付けします
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.pickButton}
            onPress={handleCamera}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={32} color={colors.primary} />
            <Text style={styles.pickButtonText}>カメラで撮影</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickButton}
            onPress={handleLibrary}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={32} color={colors.primary} />
            <Text style={styles.pickButtonText}>ライブラリから選ぶ</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>プレビュー</Text>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        )}

        {imageUri && (
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>{uploadStep}</Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>クローゼットに追加</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  description: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
  },
  pickButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  pickButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  previewContainer: {
    gap: 10,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedText,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
})
