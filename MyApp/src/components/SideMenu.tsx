import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserProfile, Language, UserRole } from '../types';
import { Share } from 'react-native';

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
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.role}>
          {user.role === UserRole.CLIENT ? (lang === 'AR' ? 'حريف' : 'Client') : lang === 'AR' ? 'فني' : 'Technician'}
        </Text>
        <Text style={styles.progress}>{lang === 'AR' ? 'اكتمال الملف' : 'Profile Progress'}: {profileCompletionScore}%</Text>

        <Pressable style={styles.item} onPress={() => { onNavigate('DASHBOARD'); onClose(); }}>
          <Text style={styles.itemText}>🏠 {lang === 'AR' ? 'الرئيسية' : 'Dashboard'}</Text>
        </Pressable>
        <Pressable style={styles.item} onPress={() => { onNavigate('PROFILE'); onClose(); }}>
          <Text style={styles.itemText}>👤 {lang === 'AR' ? 'ملفي الشخصي' : 'My Profile'}</Text>
        </Pressable>
        <Pressable style={styles.item} onPress={() => { onNavigate('SETTINGS'); onClose(); }}>
          <Text style={styles.itemText}>⚙️ {lang === 'AR' ? 'الإعدادات' : 'Settings'}</Text>
        </Pressable>
        <Pressable style={styles.item} onPress={() => { onOpenChat(); onClose(); }}>
          <Text style={styles.itemText}>💬 {lang === 'AR' ? 'المحادثات' : 'Chats'}</Text>
        </Pressable>
        <Pressable
          style={styles.item}
          onPress={async () => {
            const refUrl = `https://bricola.app/ref/${user.id}`;
            const message =
              lang === 'AR'
                ? `انضم إلي في بريكولا! ${refUrl}`
                : `Join me on Bricola! ${refUrl}`;
            await Share.share({ title: 'Invite to Bricola', message, url: refUrl });
            onClose();
          }}
        >
          <Text style={styles.itemText}>🤝 {lang === 'AR' ? 'دعوة صديق' : 'Invite a Friend'}</Text>
        </Pressable>

        <Pressable style={[styles.item, styles.logout]} onPress={onLogout}>
          <Text style={[styles.itemText, styles.logoutText]}>🚪 {lang === 'AR' ? 'تسجيل الخروج' : 'Logout'}</Text>
        </Pressable>
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
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 8
  },
  right: { right: 0 },
  left: { left: 0 },
  name: { marginTop: 32, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  role: { color: '#F97316', fontWeight: '700', marginBottom: 8 },
  progress: { color: '#64748B', fontSize: 12, marginBottom: 8 },
  item: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14 },
  itemText: { color: '#1E293B', fontWeight: '700' },
  logout: { marginTop: 6, backgroundColor: '#FEF2F2' },
  logoutText: { color: '#DC2626' }
});
