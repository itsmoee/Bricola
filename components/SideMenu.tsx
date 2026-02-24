
import React, { useMemo } from 'react';
import { UserProfile, Language, translations, UserRole } from '../types';
import { Share } from '@capacitor/share';

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
  user, lang, isOpen, onClose, onNavigate, onLogout, onOpenChat
}) => {
  const t = translations[lang] || translations.AR;

  const profileCompletionScore = useMemo(() => {
    const fields = ['fullName', 'phone', 'location', 'profilePictureUrl', 'cvUrl', 'skills', 'galleryUrls'];
    let score = 0;
    fields.forEach(f => {
      const val = (user as any)[f];
      if (val && (Array.isArray(val) ? val.length > 0 : val !== '')) score += 1;
    });
    return Math.round((score / fields.length) * 100);
  }, [user]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div 
        className={`fixed top-0 bottom-0 w-72 bg-white z-[160] transition-transform duration-300 ease-in-out shadow-2xl ${
          lang === 'AR' 
            ? (isOpen ? 'right-0' : 'translate-x-full right-0') 
            : (isOpen ? 'left-0' : '-translate-x-full left-0')
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Profile Section */}
          <div className="bg-slate-900 p-8 text-white relative">
            <button 
                onClick={onClose}
                className="absolute top-4 left-4 right-4 text-white/50 hover:text-white"
            >
                ✕
            </button>
            <div className="mt-4 flex flex-col items-center">
                <div className="w-20 h-20 bg-orange-500 rounded-[2rem] border-4 border-white/10 overflow-hidden mb-3">
                    {user.profilePictureUrl ? (
                        <img src={user.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-black">
                            {user.fullName.charAt(0)}
                        </div>
                    )}
                </div>
                <h3 className="font-black text-lg truncate max-w-full">{user.fullName}</h3>
                <p className="text-[10px] uppercase font-bold text-orange-400 tracking-widest px-3 py-1 bg-white/10 rounded-full mt-1">
                    {user.role === UserRole.CLIENT ? (lang === 'AR' ? 'حريف' : 'Client') : (lang === 'AR' ? 'فني' : 'Technician')}
                </p>

                {/* Profile Completion Mini Progress */}
                <div className="mt-4 w-full px-8">
                    <div className="flex justify-between items-center mb-1 text-[8px] font-black uppercase text-white/40 tracking-widest">
                        <span>{lang === 'AR' ? 'اكتمال الملف' : 'Profile Progress'}</span>
                        <span className="text-orange-400">{profileCompletionScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                            style={{ width: `${profileCompletionScore}%` }}
                        />
                    </div>
                </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <button 
                onClick={() => { onNavigate('DASHBOARD'); onClose(); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-2xl transition-all text-gray-700 font-bold group"
            >
                <span className="text-xl group-hover:scale-125 transition-transform">🏠</span>
                <span>{lang === 'AR' ? 'الرئيسية' : 'Dashboard'}</span>
            </button>

            <button 
                onClick={() => { onNavigate('PROFILE'); onClose(); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-2xl transition-all text-gray-700 font-bold group"
            >
                <span className="text-xl group-hover:scale-125 transition-transform">👤</span>
                <span>{lang === 'AR' ? 'ملفي الشخصي' : 'My Profile'}</span>
            </button>

            <button 
                onClick={() => { onNavigate('SETTINGS'); onClose(); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-2xl transition-all text-gray-700 font-bold group"
            >
                <span className="text-xl group-hover:scale-125 transition-transform">⚙️</span>
                <span>{lang === 'AR' ? 'الإعدادات' : 'Settings'}</span>
            </button>

            <button 
                onClick={() => { onOpenChat(); onClose(); }}
                className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-2xl transition-all text-gray-700 font-bold group"
            >
                <span className="text-xl group-hover:scale-125 transition-transform">💬</span>
                <span>{lang === 'AR' ? 'المحادثات' : 'Chats'}</span>
            </button>

            <button 
                onClick={async () => {
                   const refUrl = `https://bricola.app/ref/${user.id}`;
                   const message = lang === 'AR' 
                     ? `انضم إلي في بريكولا! حمل التطبيق وابحث عن أفضل الحرفيين في تونس: ${refUrl}`
                     : `Join me on Bricola! Download the app and find the best artisans in Tunisia: ${refUrl}`;
                   
                   try {
                     if (typeof navigator.share === 'function') {
                        await navigator.share({
                          title: 'Invite to Bricola',
                          text: message,
                          url: refUrl,
                        });
                     } else {
                        await Share.share({
                          title: 'Invite to Bricola',
                          text: message,
                          url: refUrl,
                          dialogTitle: lang === 'AR' ? 'دعوة صديق' : 'Invite a Friend'
                        });
                     }
                   } catch {
                      // Share cancelled or failed — no action needed
                   }
                   onClose();
                }}
                className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-2xl transition-all text-gray-700 font-bold group"
            >
                <span className="text-xl group-hover:scale-125 transition-transform">🤝</span>
                <span>{lang === 'AR' ? 'دعوة صديق' : 'Invite a Friend'}</span>
            </button>

            <div className="pt-4 border-t border-gray-100">
                <button 
                    onClick={onLogout}
                    className="w-full p-4 flex items-center gap-4 hover:bg-red-50 rounded-2xl transition-all text-red-500 font-bold group"
                >
                    <span className="text-xl group-hover:scale-125 transition-transform">🚪</span>
                    <span>{lang === 'AR' ? 'تسجيل الخروج' : 'Logout'}</span>
                </button>
            </div>
          </nav>

          {/* Footer Branding */}
          <div className="p-8 border-t border-gray-50 text-center">
             <h2 className="text-xs font-black text-slate-300 tracking-[0.2em]">B R I C O L A</h2>
             <p className="text-[8px] text-gray-400 font-bold mt-1 opacity-50">V 1.0.2 - Tunisia 🇹🇳</p>
          </div>
        </div>
      </div>
    </>
  );
};
