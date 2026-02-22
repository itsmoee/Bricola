
import React, { useState } from 'react';
import { UserProfile, Language, translations, ServiceRequest, UserRole } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface RequestControlPanelProps {
  request: ServiceRequest;
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onUpdateProfile: (user: UserProfile) => void;
  onOpenChat: (reqId: string) => void;
  onStatusUpdate: (req: ServiceRequest) => void;
}

export const RequestControlPanel: React.FC<RequestControlPanelProps> = ({ 
  request, user, lang, onBack, onUpdateProfile, onOpenChat, onStatusUpdate
}) => {
  const t = translations[lang] || translations.AR;
  const [isUpdating, setIsUpdating] = useState(false);
  const [offerPrice, setOfferPrice] = useState(request.quote || '');
  const [offerMessage, setOfferMessage] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    let updatedData: any = { status: newStatus };
    
    // Auto-assign tech if accepting
    if (newStatus === 'ACCEPTED' && !request.assignedTechId) {
       updatedData.assignedTechId = user.id;
       updatedData.assignedTechName = user.fullName;
    }

    onStatusUpdate({ ...request, ...updatedData });

    try {
      if (user.id !== 'mock_guest') {
        const reqRef = doc(db, 'requests', request.id);
        await updateDoc(reqRef, updatedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendOffer = async () => {
    if (!offerPrice) return;
    setIsUpdating(true);
    try {
       const updatedData = { 
         quote: offerPrice, 
         quoteStatus: 'PROPOSED' as const,
         status: 'ACCEPTED' as const, // For now, we auto-accept the job when offering to simplify
         assignedTechId: user.id,
         assignedTechName: user.fullName
       };
       
       if (user.id !== 'mock_guest') {
          await updateDoc(doc(db, 'requests', request.id), updatedData);
       }
       
       onStatusUpdate({ ...request, ...updatedData });
       setShowOfferForm(false);
       
       if (offerMessage) {
          // You might want to send a chat message here
          console.log("Offer message:", offerMessage);
       }
    } catch (err) {
       console.error(err);
    } finally {
       setIsUpdating(false);
    }
  };

  const statusColors = {
      'PENDING': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'INQUIRY': 'bg-purple-100 text-purple-700 border-purple-200',
      'ACCEPTED': 'bg-blue-100 text-blue-700 border-blue-200',
      'COMPLETED': 'bg-green-100 text-green-700 border-green-200'
  };

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'PENDING': return '⏳';
          case 'INQUIRY': return '❓';
          case 'ACCEPTED': return '🤝';
          case 'COMPLETED': return '✅';
          default: return '📋';
      }
  };

  // Helper for mock distance
  const getDistance = () => {
      // If we had user location, we'd calculate real distance
      // For now returning a mock value
      return "2.4 km";
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fade-in pb-24">
      {/* Offer Form Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
           <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {lang === 'AR' ? 'إرسال عرض سعر' : 'Send Offer'}
                </h3>
                <button onClick={() => setShowOfferForm(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold hover:bg-gray-200 transition-all">✕</button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest mb-2 px-1">{lang === 'AR' ? 'السعر المقترح (د.ت)' : 'Proposed Price (DT)'}</label>
                    <input 
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest mb-2 px-1">{lang === 'AR' ? 'رسالة اختيارية' : 'Optional Message'}</label>
                    <textarea 
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      placeholder={lang === 'AR' ? 'أضف أي تفاصيل أخرى لحريفك...' : 'Add any other details for your client...'}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm font-medium"
                    />
                 </div>

                 <button 
                  onClick={handleSendOffer}
                  disabled={!offerPrice || isUpdating}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                 >
                   {isUpdating ? '...' : (lang === 'AR' ? 'إرسال العرض الآن' : 'Send Offer Now')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-400 font-bold hover:bg-gray-200 transition-all">
          {lang === 'AR' ? '←' : '←'}
        </button>
        <div className="text-center">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {lang === 'AR' ? 'تفاصيل الطلب' : 'Request Details'}
            </h2>
            <p className="text-[10px] text-orange-500 font-black tracking-widest uppercase">#{request.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="p-6 space-y-6">
        {/* Status Stepper */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center relative mb-8">
                {['PENDING', 'ACCEPTED', 'COMPLETED'].map((step, idx) => {
                    const isActive = request.status === step;
                    const isPast = ['ACCEPTED', 'COMPLETED'].includes(request.status) && idx < 1;
                    const isCompleted = request.status === 'COMPLETED';
                    
                    return (
                        <div key={step} className="flex flex-col items-center z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                                isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' :
                                (isPast || (isCompleted && idx <= 2)) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                                {idx + 1}
                            </div>
                            <span className={`text-[8px] font-black uppercase mt-2 tracking-widest ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                                {step}
                            </span>
                        </div>
                    );
                })}
                <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-100 -z-0" />
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-3xl border-2 ${statusColors[request.status as keyof typeof statusColors] || 'bg-gray-100'}`}>
                <span className="text-2xl">{getStatusIcon(request.status)}</span>
                <div className="flex-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">{lang === 'AR' ? 'الحالة الحالية' : 'Current Status'}</h3>
                    <p className="text-sm font-black">{request.status}</p>
                </div>
                {request.quoteStatus === 'ACCEPTED' && (
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black">
                     {lang === 'AR' ? 'تم القبول' : 'ACCEPTED'}
                  </div>
                )}
            </div>
        </div>

        {/* Person Card (Client or Tech) */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-md border border-white/5">
                 {user.role === UserRole.TECHNICIAN ? '👤' : '🛠️'}
              </div>
              <div className="flex-1">
                 <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                    {user.role === UserRole.TECHNICIAN 
                      ? (lang === 'AR' ? 'بيانات الحريف' : 'Client Profile') 
                      : (lang === 'AR' ? 'الفني المعين' : 'Assigned Technician')}
                 </h3>
                 <h4 className="text-xl font-black mb-1">
                    {user.role === UserRole.TECHNICIAN 
                      ? request.clientName 
                      : (request.assignedTechName || (lang === 'AR' ? 'بانتظار الرد' : 'Waiting for Response'))}
                 </h4>
                 <div className="flex items-center gap-2">
                    <span className="text-orange-400 text-sm">⭐</span>
                    <span className="text-sm font-bold opacity-80">
                       {user.role === UserRole.TECHNICIAN ? (request.clientRating || 0.0) : 0.0}
                    </span>
                 </div>
              </div>
              <div className="flex flex-col items-end">
                 <button 
                  onClick={() => onOpenChat(request.id)}
                  className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20 transition-all font-black text-white"
                 >
                    💬
                 </button>
              </div>
           </div>
           
           <div className="flex gap-3">
              {user.role === UserRole.TECHNICIAN && (
                <a href={`tel:${request.clientPhone || '#'}`} className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-900/50 flex items-center justify-center gap-2">
                    <span>📞</span> {lang === 'AR' ? 'اتصال بالحريف' : 'Call Client'}
                </a>
              )}
              {user.role === UserRole.CLIENT && request.assignedTechId && (
                <a href={`tel:#`} className="flex-1 py-4 bg-green-500 hover:bg-green-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-900/50 flex items-center justify-center gap-2">
                    <span>📞</span> {lang === 'AR' ? 'اتصال بالفني' : 'Call Technician'}
                </a>
              )}
           </div>
        </div>

        {/* Job Details Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
           <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{lang === 'AR' ? 'تفاصيل المهمة' : 'Job Details'}</h3>
                 <span className="text-[10px] font-black px-3 py-1 bg-orange-50 text-orange-500 rounded-full uppercase tracking-widest">{request.serviceType}</span>
              </div>
              
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                 <h4 className="text-sm font-black text-slate-800 mb-2">{lang === 'AR' ? 'وصف المشكلة:' : 'Problem Description:'}</h4>
                 <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                    "{request.description || (lang === 'AR' ? 'لا يوجد وصف متاح' : 'No description')}"
                 </p>
              </div>

              {request.photos && request.photos.length > 0 && (
                <div className="mt-6">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">📸 {lang === 'AR' ? 'صور مرفقة' : 'Attached Photos'}</h4>
                   <div className="flex gap-3 overflow-x-auto pb-2">
                      {request.photos.map((url, i) => (
                        <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                           <img src={url} className="w-full h-full object-cover" alt="attachment" />
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 transition-all hover:bg-blue-50">
                 <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">{lang === 'AR' ? 'الموقع' : 'Location'}</h4>
                 <p className="text-xs font-black text-blue-900 truncate">📍 {request.location}</p>
                 <p className="text-[8px] font-black text-blue-400 mt-1">📏 {lang === 'AR' ? 'يبعد عنك' : 'Distance'}: {getDistance()}</p>
              </div>
              <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 transition-all hover:bg-red-50">
                 <h4 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">{lang === 'AR' ? 'الأهمية' : 'Urgency'}</h4>
                 <p className="text-xs font-black text-red-900 uppercase tracking-tighter">⚡ {request.urgency || 'MEDIUM'}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <div>
                 <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{lang === 'AR' ? 'الموعد المفضل' : 'Preferred Time'}</h4>
                 <p className="text-xs font-black text-gray-800">🗓️ {request.preferredTime ? new Date(request.preferredTime).toLocaleString() : (lang === 'AR' ? 'في أقرب وقت' : 'As soon as possible')}</p>
              </div>
              <div>
                 <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{lang === 'AR' ? 'الميزانية المقترحة' : 'Budget'}</h4>
                 <p className="text-xs font-black text-slate-800 tracking-tight">💰 {request.budget || '??'} DT</p>
              </div>
           </div>
        </div>

        {/* Action Panel */}
        <div className="pt-4">
           {user.role === UserRole.TECHNICIAN && request.status === 'PENDING' && (
              <div className="space-y-3">
                 <button 
                    onClick={() => updateStatus('ACCEPTED')}
                    className="w-full py-5 bg-green-500 text-white rounded-2xl font-black shadow-lg shadow-green-100 active:scale-95 transition-all text-sm uppercase tracking-widest"
                 >
                    {lang === 'AR' ? 'قبول المهمة فوراً' : 'Accept Job Now'}
                 </button>
                 
                 <div className="flex gap-3">
                    <button 
                        onClick={() => setShowOfferForm(true)}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
                    >
                        {lang === 'AR' ? 'إرسال عرض سعر' : 'Send Offer'}
                    </button>
                    <button 
                        onClick={() => onBack()}
                        className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                    >
                        {lang === 'AR' ? 'رفض الطلب' : 'Decline'}
                    </button>
                 </div>
              </div>
           )}

           {request.status === 'ACCEPTED' && (
              <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-3">
                 <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                    <p className="text-xs font-black text-green-700 uppercase tracking-widest">{lang === 'AR' ? 'المهمة قيد التنفيذ' : 'Job In Progress'}</p>
                 </div>
                 <button 
                    onClick={() => updateStatus('COMPLETED')}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    <span>🎯</span>
                    {lang === 'AR' ? 'تم إنجاز العمل' : 'Mark as Completed'}
                 </button>
              </div>
           )}

           {request.status === 'COMPLETED' && (
              <div className="p-8 bg-green-500 rounded-[2.5rem] shadow-xl text-white text-center animate-fade-in">
                 <span className="text-4xl mb-4 block">🏆</span>
                 <h3 className="text-xl font-black mb-1">{lang === 'AR' ? 'تمت المهمة بنجاح!' : 'Task Completed!'}</h3>
                 <p className="text-xs font-bold opacity-80">{lang === 'AR' ? 'شكراً لتقديم خدمتك عبر Bricola.' : 'Great job! You successfully finished this task.'}</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
