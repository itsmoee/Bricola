import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { UserRole, AuthMode, UserProfile, translations } from '../types';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { appStorage, storageKeys } from '../storage/appStorage';

interface AuthFormProps {
  role: UserRole;
  onSuccess: (user: UserProfile) => void;
  onBack: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ role, onSuccess, onBack }) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.AR;
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(t.verifying);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setLoadingText(t.verifying);
    setError(null);

    if (mode === 'REGISTER' && role === UserRole.ADMIN && adminCode !== 'BRICOLA-2025') {
      setError(t.adminCodeError);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'REGISTER') {
        let user;
        setLoadingText(t.creatingAccount);
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          user = userCredential.user;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            setLoadingText(t.checkingData);
            const signinCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            user = signinCredential.user;

            const existingDoc = await getDoc(doc(db, 'users', `${user.uid}_${role}`));
            if (existingDoc.exists()) {
              throw new Error(language === 'AR' ? 'أنت مسجل مسبقاً بهذا الحساب' : 'You already have a profile with this role');
            }
          } else {
            throw err;
          }
        }

        setLoadingText(t.preparingProfile);
        await updateProfile(user, { displayName: fullName });

        const userData: UserProfile = {
          id: `${user.uid}_${role}`,
          email: email.trim(),
          role,
          fullName,
          status: role === UserRole.TECHNICIAN ? 'PENDING' : 'APPROVED',
          onboardingCompleted: false,
          onboardingComplete: false,
          ratingAvg: 0,
          ratingCount: 0
        };

        const referredBy = await appStorage.get(storageKeys.referredBy);
        if (referredBy) {
          userData.referredBy = referredBy;
          await appStorage.remove(storageKeys.referredBy);
        }

        if (role === UserRole.TECHNICIAN) {
          userData.isOnline = false;
        }

        await setDoc(doc(db, 'users', `${user.uid}_${role}`), userData);

        if (referredBy) {
          await addDoc(collection(db, 'referral_events'), {
            newUserId: user.uid,
            newUserName: fullName,
            referrerId: referredBy,
            createdAt: serverTimestamp()
          });
        }

        setLoadingText(t.registrationComplete);
        onSuccess(userData);
      } else {
        setLoadingText(t.loggingIn);
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        setLoadingText(t.fetchingData);
        const userDoc = await getDoc(doc(db, 'users', `${user.uid}_${role}`));

        if (userDoc.exists()) {
          onSuccess(userDoc.data() as UserProfile);
        } else {
          const oldDoc = await getDoc(doc(db, 'users', user.uid));
          if (oldDoc.exists() && oldDoc.data()?.role === role) {
            const data = oldDoc.data() as UserProfile;
            data.id = `${user.uid}_${role}`;
            await setDoc(doc(db, 'users', `${user.uid}_${role}`), data);
            onSuccess(data);
            return;
          }

          setError(
            language === 'AR'
              ? `لا يوجد حساب ${role === UserRole.CLIENT ? 'حريف' : 'فني'} لهذا البريد الإلكتروني. يرجى التسجيل أولاً.`
              : `No ${role === UserRole.CLIENT ? 'client' : 'technician'} account found for this email. Please register first.`
          );
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      let msg = err.message || (language === 'AR' ? 'حدث خطأ ما، يرجى المحاولة لاحقاً.' : 'An error occurred. Please try again.');
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = language === 'AR' ? 'كلمة المرور غير صحيحة.' : 'Incorrect password.';
      }
      if (err.code === 'auth/user-not-found') {
        msg = language === 'AR' ? 'الحساب غير موجود.' : 'Account not found.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={styles.backWrap}>
          <Text style={styles.back}>← رجوع</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{mode === 'LOGIN' ? 'مرحباً بعودتك' : 'حساب جديد'}</Text>
          <Text style={styles.subtitle}>
            دخول كـ {role === UserRole.CLIENT ? 'حريف' : role === UserRole.TECHNICIAN ? 'فني' : 'مسؤول'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {mode === 'REGISTER' ? (
          <TextInput
            style={styles.input}
            placeholder="الاسم بالكامل"
            value={fullName}
            onChangeText={setFullName}
            textAlign="right"
          />
        ) : null}

        {mode === 'REGISTER' && role === UserRole.ADMIN ? (
          <TextInput
            style={styles.input}
            placeholder="كود الإدارة"
            value={adminCode}
            onChangeText={setAdminCode}
            secureTextEntry
            textAlign="right"
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="right"
        />

        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
        />

        <Pressable style={styles.submit} onPress={handleSubmit} disabled={isLoading}>
          <Text style={styles.submitText}>{isLoading ? loadingText : mode === 'LOGIN' ? 'دخول' : 'إنشاء حساب'}</Text>
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>
          <Text style={styles.switchMode}>
            {mode === 'LOGIN' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ ادخل هنا'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 12, backgroundColor: '#FFFFFF', flexGrow: 1 },
  backWrap: { marginTop: 8, marginBottom: 8 },
  back: { color: '#64748B', fontWeight: '800' },
  header: { marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#1F2937' },
  subtitle: { color: '#F97316', marginTop: 4, fontWeight: '600' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12 },
  errorText: { color: '#DC2626', fontWeight: '600' },
  submit: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  switchMode: { marginTop: 8, textAlign: 'center', color: '#6B7280', fontWeight: '600' }
});
