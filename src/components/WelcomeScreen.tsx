import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserRole } from '../types';
import { useRemoteConfig } from '../utils/remoteConfigService';

interface WelcomeScreenProps {
  onSelectRole: (role: UserRole) => void;
  onEnterPrototype: (role: UserRole) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectRole, onEnterPrototype }) => {
  const [showProtoOptions, setShowProtoOptions] = useState(false);
  const { ctaLabelStyle } = useRemoteConfig();

  const clientLabel =
    ctaLabelStyle === 'find' ? '👤 أنا حريف (أبحث عن فني)' : '👤 أنا حريف (انشر طلبًا)';

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🛠️</Text>
        </View>
        <Text style={styles.brand}>Bricola</Text>
        <Text style={styles.tagline}>Tunisia Service Platform</Text>
      </View>

      <View style={styles.actions}>
        <Text style={styles.who}>من أنت؟</Text>

        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => onSelectRole(UserRole.CLIENT)}>
          <Text style={[styles.btnText, styles.btnTextGhost]}>{clientLabel}</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onSelectRole(UserRole.TECHNICIAN)}>
          <Text style={[styles.btnText, styles.btnTextPrimary]}>🧰 أنا فني (أعرض خدماتي)</Text>
        </Pressable>
      </View>

      <View style={styles.protoWrap}>
        {!showProtoOptions ? (
          <Pressable style={[styles.btn, styles.btnSoft]} onPress={() => setShowProtoOptions(true)}>
            <Text style={styles.btnSoftText}>🔎 تجربة التطبيق (See Prototype)</Text>
          </Pressable>
        ) : (
          <View style={styles.protoRow}>
            <Pressable style={styles.protoBtn} onPress={() => onEnterPrototype(UserRole.CLIENT)}>
              <Text style={styles.protoBtnText}>تجربة (حريف)</Text>
            </Pressable>
            <Pressable style={styles.protoBtn} onPress={() => onEnterPrototype(UserRole.TECHNICIAN)}>
              <Text style={styles.protoBtnText}>تجربة (فني)</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={() => setShowProtoOptions(false)}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable onPress={() => onSelectRole(UserRole.ADMIN)}>
        <Text style={styles.adminLink}>دخول الإدارة (Admin Access)</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center'
  },
  brandWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoEmoji: { fontSize: 42 },
  brand: { marginTop: 12, fontSize: 40, fontWeight: '900', color: '#111827' },
  tagline: { marginTop: 3, fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  actions: { gap: 12 },
  who: { textAlign: 'center', fontSize: 13, color: '#6B7280', fontWeight: '700' },
  btn: { borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  btnGhost: { borderWidth: 2, borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  btnPrimary: { backgroundColor: '#F97316' },
  btnSoft: { backgroundColor: '#E2E8F0' },
  btnText: { fontSize: 17, fontWeight: '800' },
  btnTextGhost: { color: '#EA580C' },
  btnTextPrimary: { color: '#FFFFFF' },
  btnSoftText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  protoWrap: { marginTop: 10, marginBottom: 20 },
  protoRow: { flexDirection: 'row', gap: 8 },
  protoBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  protoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  closeBtn: {
    width: 42,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeText: { color: '#475569', fontWeight: '700' },
  adminLink: { textAlign: 'center', color: '#6B7280', textDecorationLine: 'underline', fontSize: 12 }
});
