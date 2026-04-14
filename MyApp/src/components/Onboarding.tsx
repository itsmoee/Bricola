import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Language, ServiceCategory, UserProfile, UserRole, translations } from '../types';
import { isProfileComplete } from '../utils/profileUtils';
import { NotificationService } from '../utils/notificationService';
import { useRemoteConfig } from '../utils/remoteConfigService';

interface OnboardingProps {
  user: UserProfile;
  lang: Language;
  onFinish: (updatedUser: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, lang, onFinish }) => {
  const t = translations[lang] || translations.AR;
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user.fullName);
  const [profilePic, setProfilePic] = useState(user.profilePictureUrl || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user.skills || []);
  const [isSaving, setIsSaving] = useState(false);
  const { onboardingStyle } = useRemoteConfig();

  const totalSteps = user.role === UserRole.TECHNICIAN ? 3 : 2;
  const isSinglePage = onboardingStyle === 'single_page';

  const serviceList = useMemo(() => Object.values(ServiceCategory), []);

  const pickProfilePhoto = async () => {
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
    if (!result.canceled && result.assets[0]?.uri) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const maybeUploadProfilePhoto = async (userId: string, uri: string) => {
    if (!uri || uri.startsWith('http')) {
      return uri;
    }
    const imageRef = ref(storage, `onboarding/${userId}/profile_${Date.now()}.jpg`);
    const blob = await (await fetch(uri)).blob();
    await uploadBytes(imageRef, blob);
    return getDownloadURL(imageRef);
  };

  const handleSkip = async () => {
    const complete = isProfileComplete(user);
    if (user.id !== 'mock_guest') {
      setIsSaving(true);
      try {
        await updateDoc(doc(db, 'users', user.id), {
          onboardingCompleted: true,
          onboardingComplete: complete
        });
      } catch {
        // Non-blocking during onboarding skip.
      } finally {
        setIsSaving(false);
      }
    }
    onFinish({ ...user, onboardingCompleted: true, onboardingComplete: complete });
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      let finalPhoto = profilePic;
      if (user.id !== 'mock_guest') {
        finalPhoto = await maybeUploadProfilePhoto(user.id, profilePic);
      }

      const updatedProfile: UserProfile = {
        ...user,
        fullName,
        profilePictureUrl: finalPhoto,
        skills: selectedSkills,
        onboardingCompleted: true
      };
      updatedProfile.onboardingComplete = isProfileComplete(updatedProfile);

      if (updatedProfile.onboardingComplete) {
        await NotificationService.cancelOnboardingReminder();
      }

      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'users', user.id), {
          fullName,
          profilePictureUrl: finalPhoto,
          skills: selectedSkills,
          onboardingCompleted: true,
          onboardingComplete: updatedProfile.onboardingComplete
        });
      }

      onFinish(updatedProfile);
    } catch {
      // Keep default behavior minimal; caller can still retry.
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => (prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]));
  };

  const renderProfileStep = () => (
    <View style={styles.block}>
      <Text style={styles.stepTitle}>{lang === 'AR' ? 'ملفك الشخصي' : 'Your Profile'}</Text>
      <Text style={styles.stepHint}>{lang === 'AR' ? 'ابدأ باسمك وصورتك الشخصية' : 'Start with your name and profile photo'}</Text>

      <Pressable style={styles.photoWrap} onPress={pickProfilePhoto}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.photo} />
        ) : (
          <Text style={styles.photoFallback}>📸</Text>
        )}
      </Pressable>

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder={t.fullName}
        style={styles.input}
      />
    </View>
  );

  const renderSkillsStep = () => (
    <View style={styles.block}>
      <Text style={styles.stepTitle}>{lang === 'AR' ? 'تخصصاتك' : 'Your Specialties'}</Text>
      <Text style={styles.stepHint}>{lang === 'AR' ? 'اختر تخصصاً أو أكثر' : 'Select one or more service categories'}</Text>
      <View style={styles.chipsGrid}>
        {serviceList.map(skill => {
          const selected = selectedSkills.includes(skill);
          return (
            <Pressable
              key={skill}
              onPress={() => toggleSkill(skill)}
              style={[styles.skillChip, selected && styles.skillChipActive]}
            >
              <Text style={[styles.skillChipText, selected && styles.skillChipTextActive]}>
                {(t as any)[skill.toLowerCase()] || skill}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderDoneStep = () => (
    <View style={styles.blockCenter}>
      <Text style={styles.doneEmoji}>🎉</Text>
      <Text style={styles.stepTitle}>{lang === 'AR' ? 'أنت جاهز' : 'You are ready'}</Text>
      <Text style={styles.stepHint}>{lang === 'AR' ? 'مرحباً بك في بريكولا' : 'Welcome to Bricola'}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressRow}>
            {[1, 2, 3].slice(0, totalSteps).map(s => (
              <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
            ))}
          </View>
          <Pressable onPress={handleSkip}>
            <Text style={styles.skip}>{lang === 'AR' ? 'تخطي' : 'Skip'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isSinglePage ? (
            <>
              {renderProfileStep()}
              {user.role === UserRole.TECHNICIAN ? renderSkillsStep() : null}
            </>
          ) : step === 1 ? (
            renderProfileStep()
          ) : step === 2 && user.role === UserRole.TECHNICIAN ? (
            renderSkillsStep()
          ) : (
            renderDoneStep()
          )}
        </ScrollView>

        <Pressable
          style={styles.btn}
          disabled={isSaving}
          onPress={() => {
            if (isSinglePage) {
              void handleComplete();
              return;
            }
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              void handleComplete();
            }
          }}
        >
          <Text style={styles.btnText}>
            {isSaving
              ? '...'
              : isSinglePage || step === totalSteps
              ? lang === 'AR'
                ? 'ابدأ الاستخدام'
                : 'Get Started'
              : lang === 'AR'
              ? 'التالي'
              : 'Next'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressDot: { width: 26, height: 5, borderRadius: 6, backgroundColor: '#E2E8F0' },
  progressDotActive: { backgroundColor: '#F97316' },
  skip: { color: '#94A3B8', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  content: { paddingVertical: 24, gap: 18 },
  block: { gap: 12 },
  blockCenter: { alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 10 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  stepHint: { color: '#64748B', fontWeight: '600' },
  photoWrap: {
    width: 126,
    height: 126,
    borderRadius: 34,
    alignSelf: 'center',
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: { fontSize: 42 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16
  },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF'
  },
  skillChipActive: { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
  skillChipText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  skillChipTextActive: { color: '#C2410C' },
  doneEmoji: { fontSize: 70 },
  btn: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center'
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }
});
