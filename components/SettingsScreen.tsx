
import React, { useState } from 'react';
import { UserProfile, Language, translations, UserRole, ServiceCategory } from '../types';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { tunisianCities, getTunisianCityAr } from '../utils/tunisia-locations';

interface SettingsScreenProps {
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onLogout: () => void;
  onLanguageChange: (lang: Language) => void;
  onUpdateProfile: (user: UserProfile) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
  user, lang, onBack, onLogout, onLanguageChange, onUpdateProfile 
}) => {
  const t = translations[lang] as any;
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  
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

  const [skills, setSkills] = useState<string[]>(user.skills || []);

  const toggleSkill = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill]
    );
  };

  const [notifications, setNotifications] = useState(user.notificationsEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'IDLE' | 'LOADING' | 'SUCCESS'>>({});

  const handleFileUpload = async (field: keyof UserProfile, file: File) => {
    if (user.id === 'mock_guest') {
      alert('Mock mode: File simulated');
      return;
    }
    setIsUploading(true);
    setUploadStatus(prev => ({ ...prev, [field]: 'LOADING' }));
    try {
      const storageRef = ref(storage, `tech_docs/${user.id}/${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { [field]: url });
      onUpdateProfile({ ...user, [field]: url });
      setUploadStatus(prev => ({ ...prev, [field]: 'SUCCESS' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, [field]: 'IDLE' })), 3000);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
      setUploadStatus(prev => ({ ...prev, [field]: 'IDLE' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileGalleryUpload = async (file: File) => {
     if (user.id === 'mock_guest') return;
     setIsUploading(true);
     try {
       const storageRef = ref(storage, `gallery/${user.id}/${Date.now()}`);
       await uploadBytes(storageRef, file);
       const url = await getDownloadURL(storageRef);
       const newGallery = [...(user.galleryUrls || []), url];
       await updateDoc(doc(db, 'users', user.id), { galleryUrls: newGallery });
       onUpdateProfile({ ...user, galleryUrls: newGallery });
     } catch (err) {
       console.error(err);
     } finally {
       setIsUploading(false);
     }
  };

  const handleRemoveGalleryImage = async (index: number) => {
     if (user.id === 'mock_guest') return;
     const newGallery = (user.galleryUrls || []).filter((_, i) => i !== index);
     await updateDoc(doc(db, 'users', user.id), { galleryUrls: newGallery });
     onUpdateProfile({ ...user, galleryUrls: newGallery });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const complexLocation = selectedCity ? (selectedPlace ? `${selectedCity}, ${selectedPlace}` : selectedCity) : location;
    
    const updatedUser: UserProfile = {
      ...user,
      fullName,
      phone,
      location: complexLocation,
      notificationsEnabled: notifications,
      skills
    };

    if (user.id !== 'mock_guest') {
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          fullName,
          phone,
          location: complexLocation,
          notificationsEnabled: notifications,
          skills
        });
      } catch (err) {
        console.error('Error updating profile in settings:', err);
      }
    }

    onUpdateProfile(updatedUser);
    setIsSaving(false);
    alert(lang === 'AR' ? 'تم الحفظ بنجاح' : 'Saved successfully');
  };

  return (
    <div className="flex flex-col min-h-screen p-6 animate-fade-in">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-gray-400 font-bold flex items-center gap-2">
          {lang === 'AR' ? '← رجوع' : 'Back →'}
        </button>
        <h2 className="text-2xl font-black text-gray-800">{t.settings}</h2>
      </header>

      <div className="space-y-8">
        {/* Language Selection */}
        <section className="bg-gray-50 p-4 rounded-3xl">
          <label className="block text-xs font-bold text-gray-400 mb-3 px-1 uppercase tracking-wider">{t.language}</label>
          <div className="flex gap-2">
            <button 
              onClick={() => onLanguageChange('AR')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${lang === 'AR' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-500'}`}
            >
              العربية
            </button>
            <button 
              onClick={() => onLanguageChange('EN')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${lang === 'EN' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-500'}`}
            >
              English
            </button>
          </div>
        </section>

        {/* Notifications Toggle */}
        <section className="bg-gray-50 p-4 rounded-3xl flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800">{t.notifications}</h4>
            <p className="text-xs text-gray-400">{notifications ? (lang === 'AR' ? 'مفعلة' : 'Enabled') : (lang === 'AR' ? 'معطلة' : 'Disabled')}</p>
          </div>
          <button 
            onClick={() => setNotifications(!notifications)}
            className={`w-14 h-8 rounded-full relative transition-colors ${notifications ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${notifications ? (lang === 'AR' ? 'left-1' : 'right-1') : (lang === 'AR' ? 'right-1' : 'left-1')}`} />
          </button>
        </section>

        {/* Profile Update */}
        <section className="bg-gray-50 p-6 rounded-3xl space-y-4">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t.updateProfile}</label>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase">{t.fullName}</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.fullName}
                className={`w-full p-4 bg-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm ${lang === 'AR' ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase">{t.phone}</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phone}
                className={`w-full p-4 bg-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm ${lang === 'AR' ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase">{t.permanentLocation}</label>
              <div className="space-y-2">
                <select 
                  value={selectedCity}
                  onChange={(e) => { setSelectedCity(e.target.value); setSelectedPlace(''); }}
                  className={`w-full p-4 bg-white border-2 border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm appearance-none ${lang === 'AR' ? 'text-right' : 'text-left'}`}
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
                    className={`w-full p-4 bg-white border-2 border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm appearance-none animate-fade-in ${lang === 'AR' ? 'text-right' : 'text-left'}`}
                  >
                    <option value="">{lang === 'AR' ? 'اختر المعتمدية...' : 'Select Place...'}</option>
                    {tunisianCities[selectedCity].map(place => (
                      <option key={place} value={place}>{place}</option>
                    ))}
                  </select>
                )}
                
                {!selectedCity && (
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t.permanentLocation}
                    className={`w-full p-4 bg-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm ${lang === 'AR' ? 'text-right' : 'text-left'}`}
                  />
                )}
              </div>
            </div>
            
            {user.role === UserRole.TECHNICIAN && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                {/* Specialties Selection */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{lang === 'AR' ? 'تخصصاتك (يمكن اختيار أكثر من واحد)' : 'Your Specialties (Multiple Selection)'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(ServiceCategory).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleSkill(cat)}
                        className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          skills.includes(cat)
                            ? 'bg-blue-50 border-blue-500 text-blue-800'
                            : 'bg-white border-transparent text-gray-400'
                        }`}
                      >
                        <span className="text-lg">
                          {cat === ServiceCategory.PLUMBER && '🚰'}
                          {cat === ServiceCategory.ELECTRICIAN && '⚡'}
                          {cat === ServiceCategory.AC_REPAIR && '❄️'}
                          {cat === ServiceCategory.PAINTER && '🎨'}
                          {cat === ServiceCategory.CARPENTER && '🪚'}
                          {cat === ServiceCategory.MASON && '🧱'}
                          {cat === ServiceCategory.CLEANING && '🧹'}
                          {cat === ServiceCategory.OTHER && '🛠️'}
                        </span>
                        <span className="text-xs font-black">
                          {t[cat.toLowerCase()] || cat}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pt-4 border-t border-gray-100">{lang === 'AR' ? 'الوثائق و الصور' : 'Docs & Media'}</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-orange-50">
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-gray-700">{t.profilePicture}</span>
                       <span className="text-[10px] text-gray-400">{user.profilePictureUrl ? '✅' : '❌'}</span>
                    </div>
                    <label className={`cursor-pointer ${user.profilePictureUrl ? 'bg-orange-100 text-orange-600' : 'bg-orange-500 text-white'} px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-600 hover:text-white transition-all`}>
                      {uploadStatus['profilePictureUrl'] === 'LOADING' ? '...' : (user.profilePictureUrl ? (lang === 'AR' ? 'تغيير' : 'Edit') : (lang === 'AR' ? 'تحميل' : 'Upload'))}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files && handleFileUpload('profilePictureUrl', e.target.files[0])}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-orange-50">
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-gray-700">{t.idCard}</span>
                       <span className="text-[10px] text-gray-400">{user.documentUrl ? '✅' : '❌'}</span>
                    </div>
                    <label className={`cursor-pointer ${user.documentUrl ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-white'} px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all`}>
                      {uploadStatus['documentUrl'] === 'LOADING' ? '...' : (user.documentUrl ? (lang === 'AR' ? 'تغيير' : 'Edit') : (lang === 'AR' ? 'تحميل' : 'Upload'))}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files && handleFileUpload('documentUrl', e.target.files[0])}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-orange-50">
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-gray-700">{t.cv}</span>
                       <span className="text-[10px] text-gray-400">{user.cvUrl ? '✅' : '❌'}</span>
                    </div>
                    <label className={`cursor-pointer ${user.cvUrl ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-white'} px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all`}>
                      {uploadStatus['cvUrl'] === 'LOADING' ? '...' : (user.cvUrl ? (lang === 'AR' ? 'تغيير' : 'Edit') : (lang === 'AR' ? 'تحميل' : 'Upload'))}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => e.target.files && handleFileUpload('cvUrl', e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>

                {/* Portfolio Management */}
                <div className="p-5 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{lang === 'AR' ? 'معرض أعمالك' : 'Work Portfolio'}</label>
                        <label className="cursor-pointer bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg shadow-blue-100">
                           + {lang === 'AR' ? 'أضف صورة' : 'Add Photo'}
                           <input 
                             type="file" 
                             className="hidden" 
                             accept="image/*"
                             onChange={(e) => e.target.files && handleProfileGalleryUpload(e.target.files[0])}
                           />
                        </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {(user.galleryUrls || []).map((url, i) => (
                           <div key={i} className="aspect-square rounded-xl overflow-hidden relative group border border-gray-50 bg-gray-50 flex items-center justify-center">
                               <img src={url} alt="Work" className="w-full h-full object-cover" />
                               <button 
                                 onClick={() => handleRemoveGalleryImage(i)}
                                 className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 ✕
                               </button>
                           </div>
                        ))}
                    </div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50 mt-2"
          >
            {isSaving || isUploading ? '...' : t.save}
          </button>
        </section>

        {/* Account Actions */}
        <section className="space-y-3">
          <button className="w-full py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all">
            {t.changePassword}
          </button>
          <button 
            onClick={onLogout}
            className="w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all"
          >
            {t.logout}
          </button>
        </section>
      </div>
    </div>
  );
};
