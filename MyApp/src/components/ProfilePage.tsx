import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { getTechnicianBadge } from '../utils/badgeUtils';
import { NotificationService } from '../utils/notificationService';
import { isProfileComplete } from '../utils/profileUtils';
import { getTunisianCityAr, tunisianCities } from '../utils/tunisia-locations';
import { AvailabilityStatus, Language, UserProfile, UserRole, translations } from '../types';

interface ProfilePageProps {
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, lang, onBack, onUpdateProfile }) => {
  const t = translations[lang] || translations.AR;
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    user.availabilityStatus || 'AVAILABLE'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedCity, setSelectedCity] = useState(() => {
    if (!user.location) {
      return '';
    }
    const city = user.location.split(', ')[0];
    return Object.keys(tunisianCities).includes(city) ? city : '';
  });
  const [selectedPlace, setSelectedPlace] = useState(() => {
    if (!user.location) {
      return '';
    }
    return user.location.split(', ')[1] || '';
  });

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

  const handleAvatarUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1]
    });
    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    if (user.id === 'mock_guest') {
      onUpdateProfile({ ...user, profilePictureUrl: result.assets[0].uri });
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.id}/profile_${Date.now()}.jpg`);
      const blob = await (await fetch(result.assets[0].uri)).blob();
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const updatedUser: UserProfile = { ...user, profilePictureUrl: url };
      updatedUser.onboardingComplete = isProfileComplete(updatedUser);

      if (updatedUser.onboardingComplete) {
        await NotificationService.cancelOnboardingReminder();
      }

      await updateDoc(doc(db, 'users', user.id), {
        profilePictureUrl: url,
        onboardingComplete: updatedUser.onboardingComplete
      });

      onUpdateProfile(updatedUser);
      Alert.alert('Saved', t.uploadSuccess);
    } catch {
      Alert.alert('Upload failed', t.errorSaving);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const complexLocation = selectedCity
      ? selectedPlace
        ? `${selectedCity}, ${selectedPlace}`
        : selectedCity
      : user.location;

    const updatedUser: UserProfile = {
      ...user,
      fullName,
      phone,
      location: complexLocation,
      availabilityStatus
    };
    updatedUser.onboardingComplete = isProfileComplete(updatedUser);

    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'users', user.id), {
          fullName,
          phone,
          location: complexLocation,
          availabilityStatus,
          onboardingComplete: updatedUser.onboardingComplete
        });
      }

      if (updatedUser.onboardingComplete) {
        await NotificationService.cancelOnboardingReminder();
      }

      onUpdateProfile(updatedUser);
      Alert.alert('Saved', t.profileUpdated);
    } catch {
      setSaveError(t.errorSaving);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const profileUrl = `https://bricola.app/tech/${user.id}`;
    const specialtyText =
      user.skills && user.skills.length > 0 ? user.skills[0] : lang === 'AR' ? 'فني' : 'Technician';
    const message =
      lang === 'AR'
        ? `تحقق من ملفي الشخصي في بريكولا! ${user.fullName} (${specialtyText}). ${profileUrl}`
        : `Check out my profile on Bricola! ${user.fullName} (${specialtyText}). ${profileUrl}`;
    try {
      await Share.share({ title: 'Bricola Profile', message, url: profileUrl });
    } catch {
      // User canceled share.
    }
  };

  const badge = getTechnicianBadge(user);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>{lang === 'AR' ? '← رجوع' : 'Back'}</Text>
        </Pressable>
        <View style={styles.titleRow}>
          {user.role === UserRole.TECHNICIAN ? (
            <Pressable style={styles.shareTopBtn} onPress={() => void handleShare()}>
              <Text style={styles.shareTopTxt}>📤</Text>
            </Pressable>
          ) : null}
          <Text style={styles.title}>{lang === 'AR' ? 'ملفي الشخصي' : 'My Profile'}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Pressable style={styles.avatarWrap} onPress={() => void handleAvatarUpload()}>
          {user.profilePictureUrl ? (
            <Image source={{ uri: user.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.initial}>{fullName.charAt(0) || 'U'}</Text>
          )}
          <View style={styles.cameraPill}>
            <Text style={styles.cameraPillText}>{isUploading ? '...' : '📸'}</Text>
          </View>
        </Pressable>

        <Text style={styles.userMeta}>
          {user.role} - ID: {user.id.substring(0, 8)}
        </Text>

        {user.role === UserRole.TECHNICIAN ? (
          <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {lang === 'AR' ? badge.label.AR : badge.label.EN}
            </Text>
          </View>
        ) : null}

        <View style={styles.progressWrap}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>{lang === 'AR' ? 'اكتمال الملف الشخصي' : 'Profile Completion'}</Text>
            <Text style={styles.progressValue}>{profileCompletionScore}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${profileCompletionScore}%` }]} />
          </View>
        </View>

        {user.role === UserRole.TECHNICIAN ? (
          <Pressable style={styles.shareBtn} onPress={() => void handleShare()}>
            <Text style={styles.shareBtnText}>{lang === 'AR' ? 'مشاركة ملفي الشخصي' : 'Share My Profile'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>{lang === 'AR' ? 'الاسم بالكامل' : 'Full Name'}</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />

        <Text style={styles.label}>{lang === 'AR' ? 'رقم الهاتف' : 'Phone Number'}</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholder="216..." />

        <Text style={styles.label}>{lang === 'AR' ? 'الموقع' : 'Location'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {Object.keys(tunisianCities)
            .sort()
            .map(city => (
              <Pressable
                key={city}
                style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                onPress={() => {
                  setSelectedCity(city);
                  setSelectedPlace('');
                }}
              >
                <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                  {lang === 'AR' ? getTunisianCityAr(city) : city}
                </Text>
              </Pressable>
            ))}
        </ScrollView>

        {selectedCity ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {tunisianCities[selectedCity].map(place => (
              <Pressable
                key={place}
                style={[styles.cityChip, selectedPlace === place && styles.cityChipActive]}
                onPress={() => setSelectedPlace(place)}
              >
                <Text style={[styles.cityChipText, selectedPlace === place && styles.cityChipTextActive]}>{place}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {user.role === UserRole.TECHNICIAN ? (
          <>
            <Text style={styles.label}>{t.availability}</Text>
            <View style={styles.availabilityRow}>
              {(['AVAILABLE', 'BUSY', 'VACATION'] as AvailabilityStatus[]).map(status => (
                <Pressable
                  key={status}
                  style={[styles.availPill, availabilityStatus === status && styles.availPillActive]}
                  onPress={() => setAvailabilityStatus(status)}
                >
                  <Text style={[styles.availPillText, availabilityStatus === status && styles.availPillTextActive]}>
                    {status === 'AVAILABLE' ? t.availableToday : status === 'BUSY' ? t.busyThisWeek : t.onVacation}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Pressable style={styles.updateBtn} onPress={() => void handleSave()} disabled={isSaving || isUploading}>
          <Text style={styles.updateBtnText}>
            {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : lang === 'AR' ? 'تحديث البيانات' : 'Update Profile'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{lang === 'AR' ? 'معلومات الحساب' : 'Account Info'}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{lang === 'AR' ? 'البريد الإلكتروني' : 'Email'}</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{lang === 'AR' ? 'حالة الحساب' : 'Status'}</Text>
          <Text style={[styles.infoValue, { color: user.status === 'APPROVED' ? '#4ADE80' : '#FACC15' }]}>
            {user.status || 'ACTIVE'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#94A3B8', fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  shareTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED'
  },
  shareTopTxt: { color: '#F97316', fontSize: 16 },
  hero: { alignItems: 'center', gap: 8 },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: { width: '100%', height: '100%' },
  initial: { fontSize: 40, fontWeight: '900', color: '#EA580C' },
  cameraPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  cameraPillText: { color: '#FFFFFF' },
  userMeta: { fontSize: 10, color: '#6B7280', fontWeight: '800' },
  badge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  progressWrap: { width: '100%', maxWidth: 320 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  progressValue: { fontSize: 10, color: '#F97316', fontWeight: '900' },
  track: { height: 9, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#F97316' },
  shareBtn: {
    marginTop: 6,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  shareBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  formCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 16, gap: 10 },
  label: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: '700',
    color: '#1E293B'
  },
  chipsRow: { gap: 8, paddingVertical: 2 },
  cityChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  cityChipActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  cityChipText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  cityChipTextActive: { color: '#C2410C' },
  availabilityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  availPill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  availPillActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  availPillText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  availPillTextActive: { color: '#C2410C' },
  error: { color: '#DC2626', fontWeight: '600', fontSize: 12 },
  updateBtn: { backgroundColor: '#EA580C', borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  updateBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  infoCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 16, gap: 10 },
  infoTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#94A3B8', fontSize: 12 },
  infoValue: { color: '#E2E8F0', fontWeight: '700', maxWidth: '58%' }
});
