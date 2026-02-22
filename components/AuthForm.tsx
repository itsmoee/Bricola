import React, { useState } from 'react';
import { UserRole, AuthMode, UserProfile } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthFormProps {
  role: UserRole;
  onSuccess: (user: UserProfile) => void;
  onBack: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ role, onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('جاري التحقق...');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingText('جاري التحقق...');
    setError(null);

    if (mode === 'REGISTER' && role === UserRole.ADMIN && adminCode !== 'BRICOLA-2025') {
      setError('كود الإدارة غير صحيح. لا يمكن إنشاء حساب مسؤول.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'REGISTER') {
        let user;
        setLoadingText('إنشاء الحساب...');
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            setLoadingText('التحقق من البيانات...');
            const signinCredential = await signInWithEmailAndPassword(auth, email, password);
            user = signinCredential.user;
            
            const existingDoc = await getDoc(doc(db, 'users', `${user.uid}_${role}`));
            if (existingDoc.exists()) {
              throw new Error('أنت مسجل مسبقاً بهذا الحساب (You already have a profile with this role)');
            }
          } else {
            throw err;
          }
        }

        let documentUrl = '';

        setLoadingText('تجهيز الملف الشخصي...');
        await updateProfile(user, { displayName: fullName });

        const userData: UserProfile = {
          id: `${user.uid}_${role}`,
          email: email,
          role: role,
          fullName: fullName,
          documentUrl: documentUrl,
          status: role === UserRole.TECHNICIAN ? 'PENDING' : 'APPROVED',
          onboardingCompleted: false,
          ratingAvg: 0.0,
          ratingCount: 0
        };

        if (role === UserRole.TECHNICIAN) {
          userData.isOnline = false;
        }
        
        await setDoc(doc(db, 'users', `${user.uid}_${role}`), userData);
        setLoadingText('اكتمل التسجيل!');
        onSuccess(userData);
      } else {
        setLoadingText('تسجيل الدخول...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        setLoadingText('جلب البيانات...');
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
          
          setError(`لا يوجد حساب ${role === UserRole.CLIENT ? 'حريف' : 'فني'} لهذا البريد الإلكتروني. يرجى التسجيل أولاً.`);
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.error('Registration/Login Error:', err);
      let msg = err.message || 'حدث خطأ ما، يرجى المحاولة لاحقاً.';
      if (err.code === 'auth/wrong-password') msg = 'كلمة المرور غير صحيحة.';
      if (err.code === 'auth/user-not-found') msg = 'الحساب غير موجود.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 pt-10">
      <button onClick={onBack} className="mb-6 text-gray-400 font-bold hover:text-orange-500 flex items-center gap-2">
        <span>←</span> رجوع
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          {mode === 'LOGIN' ? 'مرحباً بعودتك' : 'حساب جديد'}
        </h2>
        <p className="text-orange-500 font-medium">
          دخول كـ {role === UserRole.CLIENT ? 'حريف' : role === UserRole.TECHNICIAN ? 'فني' : 'مسؤول'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'REGISTER' && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 px-1">الاسم بالكامل</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-right"
              placeholder="مثال: صالح التونسي"
            />
          </div>
        )}

        {mode === 'REGISTER' && role === UserRole.ADMIN && (
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 px-1">كود الأمان للمسؤول (Security Code)</label>
            <input
              type="password"
              required
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-right"
              placeholder="••••••••"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 px-1">البريد الإلكتروني</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-right"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1 px-1">كلمة المرور</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-right"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-orange-600 disabled:opacity-50 transition-all font-cairo"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{loadingText}</span>
            </div>
          ) : (mode === 'LOGIN' ? 'دخول' : 'إنشاء حساب')}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
          className="text-gray-500 text-sm font-medium"
        >
          {mode === 'LOGIN' ? (
            <span>ليس لديك حساب؟ <span className="text-orange-500 font-bold underline">سجل الآن</span></span>
          ) : (
            <span>لديك حساب بالفعل؟ <span className="text-orange-500 font-bold underline">ادخل هنا</span></span>
          )}
        </button>
      </div>
    </div>
  );
};

