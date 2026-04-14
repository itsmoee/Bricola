import React, { useMemo } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { UserProfile, Language, UserRole, translations } from '../types';

interface SideMenuProps {
  user: UserProfile;
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'DASHBOARD' | 'PROFILE' | 'SETTINGS') => void;
  onLogout: () => void;
  onOpenChat: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  user,
  lang,
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  onOpenChat
}) => {
  const t = translations[lang] || translations.AR;

  const profileCompletionScore = useMemo(() => {
    const fields = ['fullName', 'phone', 'location', 'profilePictureUrl', 'cvUrl', 'skills', 'galleryUrls'];
    let score = 0;
    fields.forEach(f => {
      const val = (user as any)[f];
      if (val && (Array.isArray(val) ? val.length > 0 : val !== '')) {
        score += 1;
      }
    });
    return Math.round((score / fields.length) * 100);
  }, [user]);

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.drawer, lang === 'AR' ? styles.right : styles.left]}>
        <View style={styles.flexColumn}>
          {/* Header Profile Section */}
          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {user.profilePictureUrl ? (
                  <Image source={{ uri: user.profilePictureUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{user.fullName.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerName}>{user.fullName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user.role === UserRole.CLIENT ? (lang === 'AR' ? 'حريف' : 'Client') : (lang === 'AR' ? 'فني' : 'Technician')}
                </Text>
              </View>

              {/* Profile Completion Mini Progress */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>
                    {lang === 'AR' ? 'اكتمال الملف' : 'Profile Progress'}
                  </Text>
                  <Text style={styles.progressValue}>{profileCompletionScore}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${profileCompletionScore}%` }]} />
                </View>
              </View>
            </View>
          </View>

          {/* Navigation Links */}
          <ScrollView style={styles.navSection} contentContainerStyle={styles.navContent}>
            <Pressable style={styles.item} onPress={() => { onNavigate('DASHBOARD'); onClose(); }}>
              <Text style={styles.itemIcon}>🏠</Text>
              <Text style={styles.itemText}>{lang === 'AR' ? 'الرئيسية' : 'Dashboard'}</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => { onNavigate('PROFILE'); onClose(); }}>
              <Text style={styles.itemIcon}>👤</Text>
              <Text style={styles.itemText}>{lang === 'AR' ? 'ملفي الشخصي' : 'My Profile'}</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => { onNavigate('SETTINGS'); onClose(); }}>
              <Text style={styles.itemIcon}>⚙️</Text>
              <Text style={styles.itemText}>{lang === 'AR' ? 'الإعدادات' : 'Settings'}</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={() => { onOpenChat(); onClose(); }}>
              <Text style={styles.itemIcon}>💬</Text>
              <Text style={styles.itemText}>{lang === 'AR' ? 'المحادثات' : 'Chats'}</Text>
            </Pressable>
            <Pressable
              style={styles.item}
              onPress={async () => {
                const refUrl = `https://bricola.app/ref/${user.id}`;
                const message =
                  lang === 'AR'
                    ? `انضم إلي في بريكولا! حمل التطبيق وابحث عن أفضل الحرفيين في تونس: ${refUrl}`
                    : `Join me on Bricola! Download the app and find the best artisans in Tunisia: ${refUrl}`;
                try {
                  await Share.share({ title: 'Invite to Bricola', message, url: refUrl });
                } catch {
                  // Share cancelled or failed — no action needed
                }
                onClose();
              }}
            >
              <Text style={styles.itemIcon}>🤝</Text>
              <Text style={styles.itemText}>{lang === 'AR' ? 'دعوة صديق' : 'Invite a Friend'}</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={[styles.item, styles.logout]} onPress={onLogout}>
              <Text style={styles.itemIcon}>🚪</Text>
              <Text style={[styles.itemText, styles.logoutText]}>{lang === 'AR' ? 'تسجيل الخروج' : 'Logout'}</Text>
            </Pressable>
          </ScrollView>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>B R I C O L A</Text>
            <Text style={styles.footerVersion}>V 1.0.2 - Tunisia 🇹🇳</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)'
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 290,
    backgroundColor: '#FFFFFF'
  },
  right: { right: 0 },
  left: { left: 0 },
  flexColumn: { flex: 1, flexDirection: 'column' },
  header: {
    backgroundColor: '#0F172A',
    padding: 32,
    paddingTop: 48,
    position: 'relative'
  },
  closeButton: { position: 'absolute', top: 16, left: 16, zIndex: 1 },
  closeText: { color: 'rgba(255,255,255,0.5)', fontSize: 18 },
  avatarContainer: { alignItems: 'center' },
  avatarWrapper: {
    width: 80,
    height: 80,
    backgroundColor: '#F97316',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 30, fontWeight: '900', color: '#FFFFFF' },
  headerName: { fontWeight: '900', fontSize: 18, color: '#FFFFFF' },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4
  },
  roleBadgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#FB923C',
    letterSpacing: 2
  },
  progressContainer: { marginTop: 16, width: '100%', paddingHorizontal: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  progressValue: { fontSize: 8, fontWeight: '900', color: '#FB923C' },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressBarFill: { height: '100%', backgroundColor: '#F97316', borderRadius: 999 },
  navSection: { flex: 1, padding: 24 },
  navContent: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16
  },
  itemIcon: { fontSize: 20 },
  itemText: { color: '#1E293B', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  logout: { backgroundColor: '#FEF2F2' },
  logoutText: { color: '#DC2626' },
  footer: { padding: 32, borderTopWidth: 1, borderTopColor: '#F9FAFB', alignItems: 'center' },
  footerBrand: { fontSize: 12, fontWeight: '900', color: '#CBD5E1', letterSpacing: 4 },
  footerVersion: { fontSize: 8, color: '#9CA3AF', fontWeight: '700', marginTop: 4, opacity: 0.5 }
});
