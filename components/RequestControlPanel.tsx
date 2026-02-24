
import React, { useState } from 'react';
import { UserProfile, Language, translations, ServiceRequest, UserRole } from '../types';
import { db, analytics } from '../firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { jsPDF } from 'jspdf';

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
  const [actionError, setActionError] = useState<string | null>(null);
  // Counter-offer form
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  // Rating form
  const [selectedRating, setSelectedRating] = useState(request.rating || 0);
  const [ratingFeedback, setRatingFeedback] = useState(request.feedback || '');
  const [ratingSubmitted, setRatingSubmitted] = useState(!!request.rating);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    setActionError(null);
    let updatedData: any = { status: newStatus };

    // Auto-assign tech if accepting
    if (newStatus === 'ACCEPTED' && !request.assignedTechId) {
       updatedData.assignedTechId = user.id;
       updatedData.assignedTechName = user.fullName;
    }

    if (newStatus === 'COMPLETED') {
       updatedData.paymentConfirmed = false;
    }

    onStatusUpdate({ ...request, ...updatedData });

    try {
      if (user.id !== 'mock_guest') {
        const reqRef = doc(db, 'requests', request.id);
        await updateDoc(reqRef, updatedData);
      }
    } catch {
      setActionError(t.errorCompletingJob);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendOffer = async () => {
    if (!offerPrice) return;
    setIsUpdating(true);
    setActionError(null);
    try {
       const updatedData = {
         quote: offerPrice,
         quoteStatus: 'PROPOSED' as const,
         status: 'ACCEPTED' as const,
         assignedTechId: user.id,
         assignedTechName: user.fullName
       };

       if (user.id !== 'mock_guest') {
          await updateDoc(doc(db, 'requests', request.id), updatedData);
       }

       onStatusUpdate({ ...request, ...updatedData });
       setShowOfferForm(false);
    } catch {
       setActionError(lang === 'AR' ? 'تعذر إرسال العرض. يرجى المحاولة مجدداً.' : 'Failed to send offer. Please try again.');
    } finally {
       setIsUpdating(false);
    }
  };

  const confirmWork = async () => {
    setIsUpdating(true);
    setActionError(null);
    const updatedData = {
      paymentConfirmed: true,
      completionConfirmedAt: serverTimestamp()
    };

    try {
      if (user.id !== 'mock_guest') {
        const reqRef = doc(db, 'requests', request.id);
        await updateDoc(reqRef, updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
    } catch {
      setActionError(t.errorCompletingJob);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptQuote = async () => {
    setIsUpdating(true);
    setActionError(null);
    const updatedData = { quoteStatus: 'ACCEPTED' as const };
    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
    } catch {
      setActionError(lang === 'AR' ? 'تعذر قبول العرض.' : 'Failed to accept offer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectQuote = async () => {
    setIsUpdating(true);
    setActionError(null);
    const updatedData = {
      quoteStatus: 'REJECTED' as const,
      status: 'PENDING' as const,
      assignedTechId: '',
      assignedTechName: ''
    };
    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
    } catch {
      setActionError(lang === 'AR' ? 'تعذر رفض العرض.' : 'Failed to reject offer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendCounter = async () => {
    if (!counterPrice) return;
    setIsUpdating(true);
    setActionError(null);
    const updatedData = { quoteStatus: 'COUNTERED' as const, counterQuote: counterPrice };
    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
      setShowCounterForm(false);
    } catch {
      setActionError(lang === 'AR' ? 'تعذر إرسال العرض المضاد.' : 'Failed to send counter offer.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptCounter = async () => {
    setIsUpdating(true);
    setActionError(null);
    const updatedData = {
      quoteStatus: 'ACCEPTED' as const,
      quote: request.counterQuote || request.quote
    };
    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
    } catch {
      setActionError(lang === 'AR' ? 'تعذر قبول العرض.' : 'Failed to accept counter.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedRating) return;
    setIsUpdating(true);
    setActionError(null);
    const reqUpdate = { rating: selectedRating, feedback: ratingFeedback };
    try {
      if (user.id !== 'mock_guest' && request.assignedTechId) {
        await updateDoc(doc(db, 'requests', request.id), reqUpdate);
        const techRef = doc(db, 'users', request.assignedTechId);
        const techSnap = await getDoc(techRef);
        if (techSnap.exists()) {
          const data = techSnap.data();
          const prevCount = data.ratingCount || 0;
          const prevAvg = data.ratingAvg || 0;
          const newCount = prevCount + 1;
          const newAvg = ((prevAvg * prevCount) + selectedRating) / newCount;
          await updateDoc(techRef, {
            ratingAvg: Math.round(newAvg * 10) / 10,
            ratingCount: newCount
          });
        }
      }
      onStatusUpdate({ ...request, ...reqUpdate });
      analytics.then(a => a && logEvent(a, 'rate_technician', { rating: selectedRating }));
      setRatingSubmitted(true);
    } catch {
      setActionError(lang === 'AR' ? 'تعذر حفظ التقييم. حاول مجدداً.' : 'Failed to save rating. Please try again.');
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

  const generateInvoice = () => {
    const doc = new jsPDF();
    
    // Logo placeholder
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.text('BRICOLA', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Tunisia Service Marketplace', 105, 26, { align: 'center' });
    
    // Invoice details
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', 20, 45);
    
    const timestamp = request.completionConfirmedAt?.seconds ? request.completionConfirmedAt.seconds * 1000 : Date.now();
    const invoiceNo = `${request.id.slice(-6).toUpperCase()}-${timestamp.toString().slice(-4)}`;
    
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNo}`, 20, 52);
    doc.text(`Date: ${new Date(timestamp).toLocaleDateString()}`, 20, 57);
    
    // Job info
    doc.setDrawColor(240);
    doc.line(20, 65, 190, 65);
    
    doc.setFontSize(12);
    doc.text('Job Details:', 20, 75);
    doc.setFontSize(10);
    doc.text(`Service: ${request.serviceType}`, 30, 85);
    doc.text(`Technician: ${request.assignedTechName || 'N/A'}`, 30, 92);
    doc.text(`Client: ${request.clientName || 'N/A'}`, 30, 99);
    
    // Pricing
    doc.setDrawColor(240);
    doc.line(20, 110, 190, 110);
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT:`, 140, 125, { align: 'right' });
    doc.text(`${request.quote || request.budget || '0'} DT`, 180, 125, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for using Bricola!', 105, 150, { align: 'center' });
    
    doc.save(`Invoice_${invoiceNo}.pdf`);
  };

  const shareOnWhatsApp = () => {
     const message = lang === 'AR' 
        ? `فاتورة بريكولا: تم إنجاز المهمة "${request.serviceType}". السعر المتفق عليه: ${request.quote || request.budget} د.ت. شكراً لثقتكم!` 
        : `Bricola Invoice: Task "${request.serviceType}" completed. Agreed price: ${request.quote || request.budget} TND. Thank you for your trust!`;
     
     const encodedMessage = encodeURIComponent(message);
     window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
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

      {/* Counter-Offer Form Modal */}
      {showCounterForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {lang === 'AR' ? 'عرض مضاد' : 'Counter Offer'}
              </h3>
              <button onClick={() => setShowCounterForm(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold hover:bg-gray-200 transition-all">✕</button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest mb-2 px-1">
                  {lang === 'AR' ? 'سعرك المقترح (د.ت)' : 'Your Proposed Price (DT)'}
                </label>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-400 text-sm font-bold"
                />
              </div>
              <button
                onClick={handleSendCounter}
                disabled={!counterPrice || isUpdating}
                className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 disabled:opacity-50 active:scale-95"
              >
                {isUpdating ? '...' : (lang === 'AR' ? 'إرسال العرض المضاد' : 'Send Counter Offer')}
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
           {actionError && (
             <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
               {actionError}
             </div>
           )}
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

           {/* Client quote response — shown when technician has proposed a price */}
           {user.role === UserRole.CLIENT && request.quoteStatus === 'PROPOSED' && request.quote && (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-blue-100 animate-fade-in">
                 <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">
                    {lang === 'AR' ? 'عرض سعر من الفني' : 'Quote from Technician'}
                 </h3>
                 <div className="flex items-center justify-between p-5 bg-blue-50 rounded-2xl mb-6">
                    <div>
                       <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{lang === 'AR' ? 'السعر المقترح' : 'Proposed Price'}</p>
                       <p className="text-3xl font-black text-blue-800">{request.quote} <span className="text-base font-bold text-blue-400">DT</span></p>
                    </div>
                    <span className="text-4xl">💸</span>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleAcceptQuote} disabled={isUpdating}
                       className="py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition-all disabled:opacity-50">
                       {lang === 'AR' ? 'قبول' : 'Accept'}
                    </button>
                    <button onClick={() => setShowCounterForm(true)} disabled={isUpdating}
                       className="py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50">
                       {lang === 'AR' ? 'عرض مضاد' : 'Counter'}
                    </button>
                    <button onClick={handleRejectQuote} disabled={isUpdating}
                       className="py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50">
                       {lang === 'AR' ? 'رفض' : 'Decline'}
                    </button>
                 </div>
              </div>
           )}

           {/* Client sees their counter offer is pending */}
           {user.role === UserRole.CLIENT && request.quoteStatus === 'COUNTERED' && (
              <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 text-center animate-fade-in">
                 <p className="text-xs font-black text-orange-600 uppercase tracking-widest">
                    {lang === 'AR'
                       ? `عرضك المضاد: ${request.counterQuote} د.ت — بانتظار رد الفني`
                       : `Counter sent: ${request.counterQuote} DT — Awaiting technician reply`}
                 </p>
              </div>
           )}

           {/* Technician sees the client's counter-offer */}
           {user.role === UserRole.TECHNICIAN && request.quoteStatus === 'COUNTERED' && request.counterQuote && (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-orange-100 animate-fade-in">
                 <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4">
                    {lang === 'AR' ? 'عرض مضاد من الحريف' : 'Counter Offer from Client'}
                 </h3>
                 <div className="flex items-center justify-between p-5 bg-orange-50 rounded-2xl mb-6">
                    <div>
                       <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">{lang === 'AR' ? 'السعر المضاد' : 'Counter Price'}</p>
                       <p className="text-3xl font-black text-orange-800">{request.counterQuote} <span className="text-base font-bold text-orange-400">DT</span></p>
                    </div>
                    <span className="text-4xl">🤝</span>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleAcceptCounter} disabled={isUpdating}
                       className="py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
                       {lang === 'AR' ? 'قبول السعر' : 'Accept Price'}
                    </button>
                    <button onClick={() => setShowOfferForm(true)} disabled={isUpdating}
                       className="py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">
                       {lang === 'AR' ? 'عرض جديد' : 'New Offer'}
                    </button>
                 </div>
              </div>
           )}

           {request.status === 'ACCEPTED' && (
              <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-3">
                 <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                    <p className="text-xs font-black text-green-700 uppercase tracking-widest">{lang === 'AR' ? 'المهمة قيد التنفيذ' : 'Job In Progress'}</p>
                 </div>
                 {user.role === UserRole.TECHNICIAN && (
                    <button
                       onClick={() => updateStatus('COMPLETED')}
                       className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                       <span>🎯</span>
                       {lang === 'AR' ? 'تم إنجاز العمل' : 'Mark as Completed'}
                    </button>
                 )}
              </div>
           )}

           {request.status === 'COMPLETED' && (
              <div className="space-y-4">
                 {user.role === UserRole.CLIENT && !request.paymentConfirmed ? (
                    <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-xl text-white text-center animate-fade-in transition-all">
                       <span className="text-4xl mb-4 block">📦</span>
                       <h3 className="text-xl font-black mb-1">{lang === 'AR' ? 'تأكيد العمل وتحرير التقييم' : 'Confirm Work & Release Rating'}</h3>
                       <p className="text-xs font-bold opacity-80 mb-6">{lang === 'AR' ? 'يرجى تأكيد إنجاز المهمة وإتمام الدفع النقدي لتحرير التقييم للفني.' : 'Please confirm the job is finished and cash payment made to release the rating for the technician.'}</p>
                       <button 
                        onClick={confirmWork}
                        disabled={isUpdating}
                        className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                       >
                          {isUpdating ? '...' : (
                            <>
                              <span>✅</span>
                              {lang === 'AR' ? 'تأكيد العمل وفتح التقييم' : 'Confirm & Release Rating'}
                            </>
                          )}
                       </button>
                    </div>
                 ) : (
                    <div className={`p-8 ${request.paymentConfirmed ? 'bg-green-500' : 'bg-slate-700'} rounded-[2.5rem] shadow-xl text-white text-center animate-fade-in`}>
                        <span className="text-4xl mb-4 block">{request.paymentConfirmed ? '🏆' : '⏳'}</span>
                        <h3 className="text-xl font-black mb-1">
                          {request.paymentConfirmed 
                            ? (lang === 'AR' ? 'تمت المهمة بنجاح!' : 'Task Completed!') 
                            : (lang === 'AR' ? 'بانتظار تأكيد الحريف' : 'Waiting for Confirmation')}
                        </h3>
                        <p className="text-xs font-bold opacity-80">
                           {request.paymentConfirmed 
                            ? (lang === 'AR' ? 'شكراً لتقديم خدمتك عبر Bricola.' : 'Great job! Rating is now available for the client.') 
                            : (lang === 'AR' ? 'بمجرد تأكيد الحريف لإنجاز المهمة، سيتمكن من ترك تقييم لك.' : 'Once the client confirms the job completion, they can leave you a review.')}
                        </p>

                        {request.paymentConfirmed && (
                           <div className="mt-8 flex flex-col gap-3">
                              <button 
                                 onClick={generateInvoice}
                                 className="w-full py-4 bg-white/20 hover:bg-white/30 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/20 active:scale-95"
                              >
                                 <span>📄</span>
                                 {lang === 'AR' ? 'تحميل الفاتورة' : 'Download Invoice'}
                              </button>
                              <button 
                                 onClick={shareOnWhatsApp}
                                 className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                              >
                                 <span>💬</span>
                                 {lang === 'AR' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
                              </button>
                           </div>
                        )}
                    </div>
                 )}
              </div>
           )}

           {/* Rating prompt — shown to client after work is confirmed, before they rate */}
           {user.role === UserRole.CLIENT && request.status === 'COMPLETED' && request.paymentConfirmed && !ratingSubmitted && request.assignedTechId && (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    {lang === 'AR' ? 'قيّم الفني' : 'Rate the Technician'}
                 </h3>
                 <div className="flex justify-center gap-3 mb-6">
                    {[1,2,3,4,5].map(star => (
                       <button
                          key={star}
                          onClick={() => setSelectedRating(star)}
                          className={`text-4xl transition-transform active:scale-110 ${star <= selectedRating ? 'opacity-100' : 'opacity-30'}`}
                       >
                          ⭐
                       </button>
                    ))}
                 </div>
                 <textarea
                    value={ratingFeedback}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                    placeholder={t.feedbackPlaceholder}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl h-24 outline-none focus:ring-2 focus:ring-orange-100 resize-none text-sm font-medium mb-4"
                 />
                 <button
                    onClick={handleSubmitRating}
                    disabled={!selectedRating || isUpdating}
                    className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {isUpdating ? '...' : (
                       <>
                          <span>⭐</span>
                          {lang === 'AR' ? 'إرسال التقييم' : 'Submit Rating'}
                       </>
                    )}
                 </button>
              </div>
           )}

           {/* Rating submitted success */}
           {user.role === UserRole.CLIENT && ratingSubmitted && (
              <div className="p-5 bg-green-50 rounded-2xl border border-green-100 text-center animate-fade-in">
                 <p className="text-sm font-black text-green-700">⭐ {t.ratingSaved}</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
