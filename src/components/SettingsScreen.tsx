import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  AvailabilityStatus,
  Language,
  ServiceCategory,
  UserProfile,
  UserRole,
  translations
} from '../types';
import { db, storage } from '../firebase';
import { getTunisianCityAr, tunisianCities } from '../utils/tunisia-locations';

interface SettingsScreenProps {
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
  onUpdateProfile: (updatedUser: UserProfile) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  lang,
  onBack,
  onLogout,
  onLanguageChange,
  onUpdateProfile
}) => {
  const t = translations[lang] || translations.AR;
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [notifications, setNotifications] = useState(user.notificationsEnabled ?? true);
  const [skills, setSkills] = useState<string[]>(user.skills || []);
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

  const cityOptions = useMemo(() => Object.keys(tunisianCities).sort(), []);

  const toggleSkill = (skill: string) => {
    setSkills(prev => (prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]));
  };

  const pickImageAndUpload = async (field: 'profilePictureUrl' | 'documentUrl' | 'cvUrl') => {
    if (field !== 'profilePictureUrl') {
      Alert.alert(
        'Manual Review',
        '⚠️ MANUAL REVIEW NEEDED: document/cv uploads should use expo-document-picker for non-image files.'
      );
      return;
    }

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
      onUpdateProfile({ ...user, [field]: result.assets[0].uri });
      return;
    }

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const storageRef = ref(storage, `tech_docs/${user.id}/${field}_${Date.now()}.jpg`);
      const blob = await (await fetch(asset.uri)).blob();
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.id), { [field]: url });
      onUpdateProfile({ ...user, [field]: url });
    } catch {
      Alert.alert('Upload failed', t.errorSaving);
    } finally {
      setIsUploading(false);
    }
  };

  const addGalleryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    if (user.id === 'mock_guest') {
      onUpdateProfile({ ...user, galleryUrls: [...(user.galleryUrls || []), result.assets[0].uri] });
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `gallery/${user.id}/${Date.now()}.jpg`);
      const blob = await (await fetch(result.assets[0].uri)).blob();
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      const newGallery = [...(user.galleryUrls || []), url];
      await updateDoc(doc(db, 'users', user.id), { galleryUrls: newGallery });
      onUpdateProfile({ ...user, galleryUrls: newGallery });
    } catch {
      Alert.alert('Upload failed', t.errorSaving);
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryImage = async (index: number) => {
    const next = (user.galleryUrls || []).filter((_, i) => i !== index);
    if (user.id !== 'mock_guest') {
      await updateDoc(doc(db, 'users', user.id), { galleryUrls: next });
    }
    onUpdateProfile({ ...user, galleryUrls: next });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const complexLocation = selectedCity
      ? selectedPlace
        ? `${selectedCity}, ${selectedPlace}`
        : selectedCity
      : location;

    const updatedUser: UserProfile = {
      ...user,
      fullName,
      phone,
      location: complexLocation,
      notificationsEnabled: notifications,
      skills,
      availabilityStatus
    };

    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'users', user.id), {
          fullName,
          phone,
          location: complexLocation,
          notificationsEnabled: notifications,
          skills,
          availabilityStatus
        });
      }
      onUpdateProfile(updatedUser);
      Alert.alert('Saved', t.savedSuccess);
    } catch {
      setSaveError(t.errorSaving);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>{lang === 'AR' ? '← رجوع' : 'Back'}</Text>
        </Pressable>
        <Text style={styles.title}>{t.settings}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.language}</Text>
        <View style={styles.rowGap}>
          <Pressable style={[styles.langBtn, lang === 'AR' && styles.langBtnActive]} onPress={() => onLanguageChange('AR')}>
            <Text style={[styles.langText, lang === 'AR' && styles.langTextActive]}>العربية</Text>
          </Pressable>
          <Pressable style={[styles.langBtn, lang === 'EN' && styles.langBtnActive]} onPress={() => onLanguageChange('EN')}>
            <Text style={[styles.langText, lang === 'EN' && styles.langTextActive]}>English</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View>
          <Text style={styles.titleSmall}>{t.notifications}</Text>
          <Text style={styles.hint}>{notifications ? 'Enabled' : 'Disabled'}</Text>
        </View>
        <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#F97316' }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t.updateProfile}</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={t.fullName} />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t.phone} keyboardType="phone-pad" />

        <Text style={styles.subLabel}>{t.permanentLocation}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {cityOptions.map(city => (
            <Pressable
              key={city}
              style={[styles.chip, selectedCity === city && styles.chipActive]}
              onPress={() => {
                setSelectedCity(city);
                setSelectedPlace('');
              }}
            >
              <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>
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
                style={[styles.chip, selectedPlace === place && styles.chipActive]}
                onPress={() => setSelectedPlace(place)}
              >
                <Text style={[styles.chipText, selectedPlace === place && styles.chipTextActive]}>{place}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder={t.permanentLocation} />
        )}

        {user.role === UserRole.TECHNICIAN ? (
          <>
            <Text style={styles.subLabel}>{t.availability}</Text>
            <View style={styles.rowGapWrap}>
              {(['AVAILABLE', 'BUSY', 'VACATION'] as AvailabilityStatus[]).map(status => (
                <Pressable
                  key={status}
                  onPress={() => setAvailabilityStatus(status)}
                  style={[styles.skillChip, availabilityStatus === status && styles.skillChipActive]}
                >
                  <Text style={[styles.skillChipText, availabilityStatus === status && styles.skillChipTextActive]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Specialties</Text>
            <View style={styles.rowGapWrap}>
              {Object.values(ServiceCategory).map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => toggleSkill(cat)}
                  style={[styles.skillChip, skills.includes(cat) && styles.skillChipActive]}
                >
                  <Text style={[styles.skillChipText, skills.includes(cat) && styles.skillChipTextActive]}>
                    {(t as any)[cat.toLowerCase()] || cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subLabel}>Documents & Media</Text>
            <Pressable style={styles.uploadBtn} onPress={() => void pickImageAndUpload('profilePictureUrl')}>
              <Text style={styles.uploadBtnText}>{user.profilePictureUrl ? 'Edit Profile Photo' : 'Upload Profile Photo'}</Text>
            </Pressable>
            {user.profilePictureUrl ? <Image source={{ uri: user.profilePictureUrl }} style={styles.preview} /> : null}

            <Pressable style={styles.uploadBtn} onPress={() => void pickImageAndUpload('documentUrl')}>
              <Text style={styles.uploadBtnText}>Upload ID Card</Text>
            </Pressable>
            <Pressable style={styles.uploadBtn} onPress={() => void pickImageAndUpload('cvUrl')}>
              <Text style={styles.uploadBtnText}>Upload CV</Text>
            </Pressable>

            <View style={styles.galleryHeader}>
              <Text style={styles.subLabel}>Portfolio</Text>
              <Pressable style={styles.addBtn} onPress={() => void addGalleryImage()}>
                <Text style={styles.addBtnText}>+ Add Photo</Text>
              </Pressable>
            </View>
            <View style={styles.galleryGrid}>
              {(user.galleryUrls || []).map((url, i) => (
                <View key={`${url}_${i}`} style={styles.galleryItem}>
                  <Image source={{ uri: url }} style={styles.galleryImg} />
                  <Pressable style={styles.removeBtn} onPress={() => void removeGalleryImage(i)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Pressable style={styles.primaryBtn} onPress={() => void handleSave()} disabled={isSaving || isUploading}>
          <Text style={styles.primaryBtnText}>{isSaving || isUploading ? '...' : t.save}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>{t.logout}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#64748B', fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  card: { backgroundColor: '#F8FAFC', borderRadius: 22, padding: 14, gap: 10 },
  cardRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: { fontSize: 11, textTransform: 'uppercase', color: '#64748B', fontWeight: '900' },
  subLabel: { fontSize: 12, color: '#334155', fontWeight: '800', marginTop: 2 },
  titleSmall: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  hint: { color: '#64748B', fontSize: 12 },
  rowGap: { flexDirection: 'row', gap: 8 },
  rowGapWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  langBtn: { flex: 1, borderRadius: 14, paddingVertical: 11, backgroundColor: '#FFFFFF', alignItems: 'center' },
  langBtnActive: { backgroundColor: '#F97316' },
  langText: { color: '#475569', fontWeight: '800' },
  langTextActive: { color: '#FFFFFF' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15
  },
  chipsRow: { gap: 8, paddingVertical: 2 },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  chipActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  chipTextActive: { color: '#C2410C' },
  skillChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF'
  },
  skillChipActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  skillChipText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  skillChipTextActive: { color: '#C2410C' },
  uploadBtn: { backgroundColor: '#E2E8F0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  uploadBtnText: { color: '#1E293B', fontWeight: '700', fontSize: 12 },
  preview: { width: 96, height: 96, borderRadius: 14, marginTop: 6 },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryItem: { width: 74, height: 74, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  galleryImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  error: { color: '#DC2626', fontWeight: '600', fontSize: 12 },
  primaryBtn: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  logoutBtn: { backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  logoutBtnText: { color: '#DC2626', fontWeight: '800' }
});
