
import React, { useState } from 'react';
import { UserProfile, Language, translations, UserRole, ServiceCategory } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

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

    const totalSteps = user.role === UserRole.TECHNICIAN ? 3 : 2;

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = async () => {
        if (user.id !== 'mock_guest') {
            setIsSaving(true);
            try {
                const userRef = doc(db, 'users', user.id);
                await updateDoc(userRef, {
                    onboardingCompleted: true
                });
            } catch (err) {
                console.error('Error skipping onboarding:', err);
            } finally {
                setIsSaving(false);
            }
        }
        onFinish({ ...user, onboardingCompleted: true });
    };

    const handleComplete = async () => {
        setIsSaving(true);
        try {
            const updatedProfile = {
                ...user,
                fullName,
                profilePictureUrl: profilePic,
                skills: selectedSkills,
                onboardingCompleted: true
            };

            if (user.id !== 'mock_guest') {
                const userRef = doc(db, 'users', user.id);
                await updateDoc(userRef, {
                    fullName,
                    profilePictureUrl: profilePic,
                    skills: selectedSkills,
                    onboardingCompleted: true
                });
            }
            onFinish(updatedProfile);
        } catch (err) {
            console.error(err);
            alert('Error updating profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSkill = (skill: string) => {
        if (selectedSkills.includes(skill)) {
            setSelectedSkills(selectedSkills.filter(s => s !== skill));
        } else {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const serviceList = Object.values(ServiceCategory);

    return (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-fade-in">
            {/* Header / Progress */}
            <div className="p-6 flex justify-between items-center">
                <div className="flex gap-2">
                    {[1, 2, 3].slice(0, totalSteps).map(s => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${s <= step ? 'bg-orange-500' : 'bg-gray-100'}`} />
                    ))}
                </div>
                <button 
                  onClick={handleSkip}
                  className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 transition-colors"
                >
                    {lang === 'AR' ? 'تخطي' : 'Skip'}
                </button>
            </div>

            <div className="flex-1 p-8 flex flex-col justify-center max-w-lg mx-auto w-full">
                {step === 1 && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-gray-800 mb-2">
                                {lang === 'AR' ? 'ملمحك الشخصي' : 'Your Profile'}
                            </h2>
                            <p className="text-gray-400 font-medium text-sm">
                                {lang === 'AR' ? 'لنبدأ بإضافة اسمك وصورتك' : "Let's start with your name and photo"}
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <label className="relative cursor-pointer group">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-orange-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                                    {profilePic ? (
                                        <img src={profilePic} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <span className="text-4xl">📸</span>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                                    +
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>

                            <div className="w-full">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-2">
                                    {lang === 'AR' ? 'الاسم الكامل' : 'Full Name'}
                                </label>
                                <input 
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={lang === 'AR' ? 'أدخل اسمك هنا' : 'Enter your name'}
                                    className="w-full p-5 bg-gray-50 border-none rounded-[1.5rem] outline-none focus:ring-4 focus:ring-orange-100 text-lg font-bold"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && user.role === UserRole.TECHNICIAN && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-gray-800 mb-2">
                                {lang === 'AR' ? 'تخصصاتك' : 'Your Specialties'}
                            </h2>
                            <p className="text-gray-400 font-medium text-sm">
                                {lang === 'AR' ? 'اختر المجالات التي تتقنها' : 'Pick the areas you excel in'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {serviceList.map((skillKey) => {
                                const isSelected = selectedSkills.includes(skillKey);
                                const label = (t as any)[skillKey.toLowerCase()] || skillKey;
                                return (
                                    <button
                                        key={skillKey}
                                        onClick={() => toggleSkill(skillKey)}
                                        className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                                            isSelected 
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 scale-105' 
                                            : 'border-gray-100 text-gray-400 hover:border-orange-200'
                                        }`}
                                    >
                                        <span className="text-2xl">
                                            {skillKey === ServiceCategory.PLUMBER && '🚰'}
                                            {skillKey === ServiceCategory.ELECTRICIAN && '⚡'}
                                            {skillKey === ServiceCategory.AC_REPAIR && '❄️'}
                                            {skillKey === ServiceCategory.PAINTER && '🎨'}
                                            {skillKey === ServiceCategory.CARPENTER && '🪚'}
                                            {skillKey === ServiceCategory.MASON && '🧱'}
                                            {skillKey === ServiceCategory.CLEANING && '🧹'}
                                            {skillKey === ServiceCategory.OTHER && '🛠️'}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-tight">
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {(step === 2 && user.role === UserRole.CLIENT) || step === 3 && (
                    <div className="space-y-8 animate-slide-up text-center">
                        <div className="w-48 h-48 bg-orange-50 rounded-[3rem] flex items-center justify-center text-8xl mx-auto shadow-inner mb-8">
                             🎉
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-2">
                                {lang === 'AR' ? 'أنت جاهز!' : "You're all set!"}
                            </h2>
                            <p className="text-gray-400 font-medium text-sm">
                                {lang === 'AR' ? 'مرحباً بك في مجتمع بريكولا' : 'Welcome to the Bricola community'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Action */}
            <div className="p-8">
                <button 
                    onClick={handleNext}
                    disabled={isSaving}
                    className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {isSaving ? (
                        '...'
                    ) : (
                        <>
                            {step < totalSteps ? (lang === 'AR' ? 'التالي' : 'Next') : (lang === 'AR' ? 'ابدأ الاستخدام' : 'Get Started')}
                            <span className="text-xl">{step < totalSteps ? '→' : '✨'}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
