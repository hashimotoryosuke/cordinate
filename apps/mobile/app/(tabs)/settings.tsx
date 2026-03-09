import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'

const colors = {
  primary: '#1A1A1A',
  accent: '#C9A84C',
  background: '#FAFAFA',
  muted: '#F4F4F5',
  border: '#E4E4E7',
  mutedText: '#71717A',
}

interface SettingsRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress?: () => void
  destructive?: boolean
}

function SettingsRow({ icon, label, onPress, destructive }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? '#DC2626' : colors.mutedText}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.border} />
      )}
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuth()

  function handleLogout() {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: logout,
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* プロフィールセクション */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name ?? '未設定'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* アカウント設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="person-outline"
              label="プロフィール編集"
            />
            <View style={styles.separator} />
            <SettingsRow
              icon="lock-closed-outline"
              label="パスワード変更"
            />
            <View style={styles.separator} />
            <SettingsRow
              icon="notifications-outline"
              label="通知設定"
            />
          </View>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="document-text-outline"
              label="利用規約"
            />
            <View style={styles.separator} />
            <SettingsRow
              icon="shield-outline"
              label="プライバシーポリシー"
            />
            <View style={styles.separator} />
            <View style={[styles.row, { paddingRight: 16 }]}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.mutedText}
                  style={styles.rowIcon}
                />
                <Text style={styles.rowLabel}>バージョン</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* ログアウト */}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingsRow
              icon="log-out-outline"
              label="ログアウト"
              onPress={handleLogout}
              destructive
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 22,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.primary,
  },
  rowLabelDestructive: {
    color: '#DC2626',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  versionText: {
    fontSize: 14,
    color: colors.mutedText,
    marginRight: 4,
  },
})
