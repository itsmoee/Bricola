
import React, { useState } from 'react';
import { UserProfile, Language, translations, UserRole } from '../types';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { tunisianCities, getTunisianCityAr } from '../utils/tunisia-locations';

interface ProfilePageProps {
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onUpdateProfile: (user: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  user, lang, onBack, onUpdateProfile 
}) => {
  const t = translations[lang] || translations.AR;
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Tunisia Location dropdown logic
  const [selectedCity, setSelectedCity] = useState(() => {
    if (!user.location) return '';
    const parts = user.location.split(', ');
    return Object.keys(tunisianCities).find(c => c === parts[0]) || '';
  });
  const [selectedPlace, setSelectedPlace] = useState(() => {
    if (!user.location) return '';
    const parts = user.location.split(', ');
    return parts[1] || '';
  });

  const handleFileUpload = async (field: keyof UserProfile, file: File) => {
    if (!file) return;
    
    // Size check: limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'AR' ? 'حجم الملف كبير جداً (أقصى حد 5 ميجابايت)' : 'File is too large (max 5MB)');
      return;
    }

    if (user.id === 'mock_guest') {
      alert('Mock mode: File simulated');
      onUpdateProfile({ ...user, [field]: URL.createObjectURL(file) });
      return;
    }
    setIsUploading(true);
    try {
      // Use "profile_pics" folder for clarity across roles
      const folder = field === 'profilePictureUrl' ? 'avatars' : 'tech_docs';
      const storageRef = ref(storage, `${folder}/${user.id}/${field}_${Date.now()}`);
      
      console.log('Uploading file to:', storageRef.fullPath);
      const uploadResult = await uploadBytes(storageRef, file);
      console.log('Upload successful, path:', uploadResult.ref.fullPath);
      
      const url = await getDownloadURL(storageRef);
      console.log('Got download URL:', url);
      
      const userRef = doc(db, 'users', user.id);
      const updateData = { [field]: url };
      
      console.log('Updating document:', user.id, updateData);
      await updateDoc(userRef, updateData);
      
      // Update local state and notify parent
      const updatedUser = { ...user, [field]: url };
      onUpdateProfile(updatedUser);
      alert(lang === 'AR' ? 'تم رفع الصورة بنجاح!' : 'File uploaded successfully!');
    } catch (err: any) {
      console.error('Upload error details:', err);
      alert(lang === 'AR' ? `فشل الرفع: ${err.message}` : `Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const complexLocation = selectedCity ? (selectedPlace ? `${selectedCity}, ${selectedPlace}` : selectedCity) : user.location;
    
    const updatedUser = {
      ...user,
      fullName,
      phone,
      location: complexLocation,
    };

    if (user.id !== 'mock_guest') {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          fullName,
          phone,
          location: complexLocation,
        });
      } catch (err) {
        console.error('Error updating profile:', err);
      }
    }

    onUpdateProfile(updatedUser);
    setIsSaving(false);
    alert(lang === 'AR' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile updated successfully!');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 animate-fade-in bg-white">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-gray-400 font-bold flex items-center gap-2">
          {lang === 'AR' ? '← رجوع' : 'Back →'}
        </button>
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {lang === 'AR' ? 'ملفي الشخصي' : 'My Profile'}
        </h2>
      </header>

      <div className="flex flex-col items-center mb-8 relative">
          <div className="w-28 h-28 bg-orange-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl relative group">
              {isUploading ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : null}
              {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-black text-orange-500">
                    {fullName.charAt(0)}
                  </div>
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                  <span className="text-2xl">📸</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload('profilePictureUrl', e.target.files[0])}
                  />
              </label>
          </div>
          <p className="mt-3 text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-3 py-1 rounded-full">
            {user.role} - ID: {user.id.substring(0, 8)}
          </p>

          {/* Profile Completion Bar */}
          <div className="mt-6 w-full max-w-sm px-6">
              <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-400">{lang === 'AR' ? 'اكتمال الملف الشخصي' : 'Profile Completion'}</span>
                  <span className="text-orange-500">{(() => {
                      let score = 0;
                      const fields = ['fullName', 'phone', 'location', 'profilePictureUrl', 'cvUrl', 'skills', 'galleryUrls'];
                      fields.forEach(f => {
                          const val = (user as any)[f];
                          if (val && (Array.isArray(val) ? val.length > 0 : val !== '')) score += 1;
                      });
                      return Math.round((score / fields.length) * 100);
                  })()}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div 
                      className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                      style={{ width: `${(() => {
                          let score = 0;
                          const fields = ['fullName', 'phone', 'location', 'profilePictureUrl', 'cvUrl', 'skills', 'galleryUrls'];
                          fields.forEach(f => {
                              const val = (user as any)[f];
                              if (val && (Array.isArray(val) ? val.length > 0 : val !== '')) score += 1;
                          });
                          return Math.round((score / fields.length) * 100);
                      })()}%` }}
                  />
              </div>
          </div>
      </div>

      <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-[2rem] space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">{lang === 'AR' ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-transparent rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">{lang === 'AR' ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input 
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="216..."
                    className="w-full p-4 bg-white border-2 border-transparent rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">{lang === 'AR' ? 'الموقع' : 'Location'}</label>
                <div className="space-y-2">
                    <select 
                        value={selectedCity}
                        onChange={(e) => { setSelectedCity(e.target.value); setSelectedPlace(''); }}
                        className="w-full p-4 bg-white border-2 border-transparent rounded-2xl shadow-sm font-bold appearance-none outline-none focus:border-orange-500"
                    >
                        <option value="">{lang === 'AR' ? 'اختر الولاية...' : 'Select City...'}</option>
                        {Object.keys(tunisianCities).sort().map(city => (
                            <option key={city} value={city}>{lang === 'AR' ? getTunisianCityAr(city) : city}</option>
                        ))}
                    </select>

                    {selectedCity && (
                        <select 
                            value={selectedPlace}
                            onChange={(e) => setSelectedPlace(e.target.value)}
                            className="w-full p-4 bg-white border-2 border-transparent rounded-2xl shadow-sm font-bold appearance-none outline-none focus:border-orange-500 animate-fade-in"
                        >
                            <option value="">{lang === 'AR' ? 'اختر المعتمدية...' : 'Select Place...'}</option>
                            {tunisianCities[selectedCity].map(place => (
                                <option key={place} value={place}>{place}</option>
                            ))}
                        </select>
                    )}
                </div>
              </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? (lang === 'AR' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'AR' ? 'تحديث البيانات' : 'Update Profile')}
          </button>
      </div>

      <div className="mt-10 p-6 bg-slate-900 rounded-[2rem] text-white">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2">
            <span>ℹ️</span> {lang === 'AR' ? 'معلومات الحساب' : 'Account Info'}
          </h3>
          <div className="space-y-3 opacity-80 text-xs">
              <div className="flex justify-between">
                <span>{lang === 'AR' ? 'البريد الإلكتروني' : 'Email'}</span>
                <span className="font-bold">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span>{lang === 'AR' ? 'حالة الحساب' : 'Status'}</span>
                <span className={`font-bold ${user.status === 'APPROVED' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user.status || 'ACTIVE'}
                </span>
              </div>
          </div>
      </div>
    </div>
  );
};
