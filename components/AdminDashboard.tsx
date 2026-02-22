
import React, { useState, useEffect } from 'react';
import { UserProfile, ServiceRequest, TechStatus, UserRole, Language, translations, AppNotification } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface AdminDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onSettings: () => void;
  lang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onSettings, lang }) => {
  const [activeTab, setActiveTab] = useState<'TECHS' | 'REQUESTS'>('TECHS');
  const [techs, setTechs] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch all Technicians (real-time)
  useEffect(() => {
    if (user.id === 'mock_guest') {
       const mockTechs: UserProfile[] = [
         { id: 'tech_1', fullName: 'فيصل الرحماني', email: 'faycel@mock.tn', role: UserRole.TECHNICIAN, status: 'PENDING', phone: '21698765432', location: 'تطاوين المدينة', profilePictureUrl: 'https://i.pravatar.cc/150?u=tech1' },
         { id: 'tech_2', fullName: 'سلوى الودرني', email: 'salwa@mock.tn', role: UserRole.TECHNICIAN, status: 'APPROVED', isOnline: true, phone: '21655123456', location: 'غمراسن' }
       ];
       setTechs(mockTechs);
       return;
    }
    try {
      const q = query(collection(db, 'users'), where('role', '==', UserRole.TECHNICIAN));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTechs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[]);
      }, (e) => {
        console.error('Tech fetch error:', e);
        setError(e.message);
      });
      return () => unsubscribe();
    } catch (err: any) {
      console.error('Tech fetch hook error:', err);
      setError(err.message);
    }
  }, []);

  // Fetch all Service Requests (real-time)
  useEffect(() => {
    if (user.id === 'mock_guest') {
      setRequests([
        { id: 'req_1', clientId: 'c1', clientName: 'مبروك', serviceType: 'سباك', location: 'البئر الأحمر', status: 'PENDING', createdAt: new Date().toISOString() },
        { id: 'req_2', clientId: 'c2', clientName: 'نجية', serviceType: 'كهربائي', location: 'تطاوين الجنوبية', status: 'ACCEPTED', assignedTechName: 'فيصل الرحماني', createdAt: new Date().toISOString() }
      ]);
      return;
    }
    try {
      const q = query(collection(db, 'requests'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceRequest[]);
      }, (e) => {
        console.error('Request fetch error:', e);
        setError(e.message);
      });
      return () => unsubscribe();
    } catch (err: any) {
      console.error('Request fetch hook error:', err);
      setError(err.message);
    }
  }, []);

  const updateTechStatus = async (id: string, newStatus: TechStatus) => {
    if (user.id === 'mock_guest') {
       setTechs(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
       alert(lang === 'AR' ? 'تم تحديث الحالة تجريبياً!' : 'Status updated in mockup!');
       return;
    }
    try {
      const techRef = doc(db, 'users', id);
      const newNotif: AppNotification = {
        id: 'notif_' + Date.now(),
        title: newStatus === 'APPROVED' ? 'تم تفعيل حسابك' : 'تم رفض الحساب',
        body: newStatus === 'APPROVED' 
          ? 'مبروك! يمكنك الآن استقبال الطلبات.' 
          : 'عذراً، لم نتمكن من قبول حسابك. يرجى مراجعة الوثائق.',
        createdAt: new Date().toLocaleDateString(),
        read: false
      };
      
      await updateDoc(techRef, {
        status: newStatus,
        notifications: arrayUnion(newNotif)
      });
    } catch (err) {
      console.error('Error updating technician:', err);
      alert('Failed to update status');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
        <p className="text-sm text-red-500 mb-6">{error}</p>
        <button onClick={onLogout} className="px-6 py-2 bg-red-600 text-white rounded-xl">Logout</button>
      </div>
    );
  }

  const t_ui = translations[lang] || translations.AR;

  const filteredTechs = (techs || []).filter(t => {
    const search = (searchTerm || '').toLowerCase();
    const fullName = (t.fullName || '').toLowerCase();
    const skills = (t.skills || []).map(s => String(s).toLowerCase());
    return fullName.includes(search) || skills.some(s => s.includes(search));
  });

  const filteredRequests = (requests || []).filter(r => {
    const search = (searchTerm || '').toLowerCase();
    const clientName = (r.clientName || '').toLowerCase();
    const serviceType = (r.serviceType || '').toLowerCase();
    return clientName.includes(search) || serviceType.includes(search);
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
      <header className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onSettings}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white shadow-sm hover:bg-white/20 transition-all"
          >
            ⚙️
          </button>
          <h1 className="text-xl font-black tracking-tight">Admin - Bricola</h1>
        </div>
        
        <div className="flex bg-white/10 p-1 rounded-xl">
          <button 
            onClick={() => { setActiveTab('TECHS'); setSearchTerm(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'TECHS' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60'}`}
          >
            {lang === 'AR' ? 'الفنيين' : 'Technicians'} ({techs.length})
          </button>
          <button 
            onClick={() => { setActiveTab('REQUESTS'); setSearchTerm(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'REQUESTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60'}`}
          >
            {lang === 'AR' ? 'الطلبات' : 'Requests'} ({requests.length})
          </button>
        </div>
      </header>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6 relative">
          <input 
            type="text"
            placeholder={activeTab === 'TECHS' 
              ? (lang === 'AR' ? 'بحث عن فني...' : 'Search for a tech...') 
              : (lang === 'AR' ? 'بحث عن طلب...' : 'Search for a request...')
            }
            className={`w-full p-4 rounded-2xl border-none shadow-md focus:ring-2 focus:ring-orange-500 outline-none transition-all ${lang === 'AR' ? 'text-right' : 'text-left'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === 'TECHS' ? (
          <div className="space-y-4 pb-24">
            {filteredTechs.map(tech => (
              <div key={tech.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className={`flex justify-between items-start mb-3 ${lang === 'AR' ? '' : 'flex-row-reverse'}`}>
                  <div className={`flex items-center gap-2 ${lang === 'AR' ? '' : 'flex-row-reverse'}`}>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      tech.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 
                      tech.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {tech.status}
                    </span>
                    {tech.isOnline !== undefined && (
                      <span className={`w-2 h-2 rounded-full animate-pulse ${tech.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    )}
                  </div>
                  <div className={lang === 'AR' ? 'text-right' : 'text-left'}>
                    <h3 className="font-bold text-gray-800">{tech.fullName}</h3>
                    <p className="text-xs text-gray-400">{tech.phone || 'No Phone'}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">📍 {tech.location || 'No Location'}</p>
                  </div>
                </div>

                {/* Verification Documents */}
                <div className={`mt-4 grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-dashed border-gray-200 ${lang === 'AR' ? '' : 'flex-row-reverse'}`}>
                   <a 
                    href={tech.profilePictureUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-gray-50 hover:bg-gray-100 transition-colors"
                   >
                    <span className="text-xl">📸</span>
                    <span className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                      {lang === 'AR' ? 'الصورة الشخصية' : 'Profile Pic'}
                    </span>
                   </a>
                   <a 
                    href={tech.cvUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-gray-50 hover:bg-gray-100 transition-colors"
                   >
                    <span className="text-xl">📄</span>
                    <span className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-tighter">
                      {lang === 'AR' ? 'السيرة الذاتية' : 'Curriculum Vitae'}
                    </span>
                   </a>
                </div>
                
                {tech.status === 'PENDING' && (
                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={() => updateTechStatus(tech.id, 'APPROVED')}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                    >
                      {t_ui.approve}
                    </button>
                    <button 
                      onClick={() => updateTechStatus(tech.id, 'REJECTED')}
                      className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-all"
                    >
                      {t_ui.reject}
                    </button>
                  </div>
                )}
                
                {tech.status !== 'PENDING' && (
                  <button 
                    onClick={() => updateTechStatus(tech.id, 'PENDING')}
                    className="w-full mt-2 py-2 text-[10px] text-gray-400 underline"
                  >
                    {lang === 'AR' ? 'إعادة التعيين لقيد الانتظار' : 'Reset to Pending'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pb-24">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                   <div className={lang === 'AR' ? 'text-right' : 'text-left'}>
                     <h3 className="font-bold text-gray-800 text-lg">{req.serviceType}</h3>
                     <p className="text-xs text-gray-400 font-bold mb-1">👤 {req.clientName}</p>
                     <p className="text-xs text-slate-500 font-bold">📍 {req.location}</p>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                        req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        req.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {req.status}
                      </span>
                      {req.urgency && (
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          req.urgency === 'HIGH' ? 'bg-red-500 text-white animate-pulse' : 
                          req.urgency === 'MEDIUM' ? 'bg-yellow-500 text-white' : 
                          'bg-blue-500 text-white'
                        }`}>
                          {req.urgency}
                        </span>
                      )}
                   </div>
                 </div>
                 
                 {req.description && (
                   <div className="p-4 bg-gray-50 rounded-2xl text-[11px] text-gray-600 font-medium italic border-l-2 border-orange-500">
                     "{req.description}"
                   </div>
                 )}

                 {req.assignedTechName && (
                   <div className="pt-2 border-t border-gray-50 flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{lang === 'AR' ? 'الفني المعين:' : 'Assigned Tech:'}</span>
                     <span className="text-xs font-black text-blue-600">🛠️ {req.assignedTechName}</span>
                   </div>
                 )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
