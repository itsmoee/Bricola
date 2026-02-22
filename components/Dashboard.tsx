
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, Language, translations, ServiceRequest, ChatMessage } from '../types';
import { db, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Geolocation } from '@capacitor/geolocation';
import { MapView } from './MapView';
import { SideMenu } from './SideMenu';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onSettings: () => void;
  onProfile: () => void;
  onUpdateProfile: (user: UserProfile) => void;
  onRequestDetails: (req: ServiceRequest) => void;
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, onLogout, onSettings, onProfile, onUpdateProfile, onRequestDetails, lang 
}) => {
  const t = translations[lang] || translations.AR;

  const getCategoryLabel = (category: string) => {
    // Check if it's one of our ServiceCategory enums
    const catLow = category.toLowerCase();
    if (t[catLow]) return t[catLow];
    return category;
  };

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [activeListTab, setActiveListTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [newJobNotify, setNewJobNotify] = useState<ServiceRequest | null>(null);
  const initialLoadRef = useRef(true);

  // Client Specific States
  const [clientViewMode, setClientViewMode] = useState<'REQUESTS' | 'BROWSE'>('REQUESTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [selectedTech, setSelectedTech] = useState<UserProfile | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnlineStatus(true);
    const handleOffline = () => setIsOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestDetails, setRequestDetails] = useState({
    serviceType: '',
    description: '',
    urgency: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    location: '',
    budget: '',
    preferredTime: '',
    photos: [] as string[]
  });

  // Chat states
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [showActiveChats, setShowActiveChats] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const handleProfileUpdate = async (field: keyof UserProfile, file: File) => {
    if (user.id === 'mock_guest') {
      alert('Mock mode: File upload simulated');
      onUpdateProfile({ ...user, [field]: URL.createObjectURL(file) });
      return;
    }
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `tech_docs/${user.id}/${field}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { [field]: url });
      onUpdateProfile({ ...user, [field]: url });
      alert(lang === 'AR' ? 'تم الرفع بنجاح!' : 'Uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!openChatId) return;
    const q = query(collection(db, 'requests', openChatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(msgs);
      setTimeout(() => chatScrollRef.current?.scrollTo(0, chatScrollRef.current.scrollHeight), 100);
    });
    return () => unsubscribe();
  }, [openChatId]);

  const handleSubmitRating = async (requestId: string, ratingValue: number) => {
    try {
      setRatingLoading(requestId);
      
      const reqRef = doc(db, 'requests', requestId);
      
      if (user.id !== 'mock_guest') {
        const snap = await getDoc(reqRef);
        const reqData = snap.data() as ServiceRequest;
        const techId = reqData.assignedTechId;

        if (techId) {
          const tRef = doc(db, 'users', techId);
          const tSnap = await getDoc(tRef);
          if (tSnap.exists()) {
            const tData = tSnap.data() as UserProfile;
            const currentCount = tData.ratingCount || 0;
            const currentAvg = tData.ratingAvg || 0;
            const newCount = currentCount + 1;
            const newAvg = Number(((currentAvg * currentCount + ratingValue) / newCount).toFixed(1));
            
            await updateDoc(tRef, {
              ratingAvg: newAvg,
              ratingCount: newCount
            });
          }
        }
        await updateDoc(reqRef, { rating: ratingValue });
      } else {
        // Mock update
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, rating: ratingValue } : r));
      }
    } catch (error) {
      console.error('Error rating:', error);
    } finally {
      setRatingLoading(null);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOnlineStatus = async () => {
    if (user.id === 'mock_guest') {
      onUpdateProfile({ ...user, isOnline: !user.isOnline });
      return;
    }
    setIsUpdatingStatus(true);
    const newStatus = !user.isOnline;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        isOnline: newStatus
      });
      onUpdateProfile({ ...user, isOnline: newStatus });
    } catch (err) {
      console.error('Error toggling online status:', err);
      alert('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateJobStatus = async (requestId: string, newStatus: string) => {
    if (user.id === 'mock_guest') return;
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, { status: newStatus });
    } catch (err) {
      console.error('Error updating job status:', err);
      alert('Failed to update job');
    }
  };

  const currentOnlineStatus = !!user.isOnline; // Ensures it's always boolean

  // Real-time listener for current user's requests
  useEffect(() => {
    if (user.role === UserRole.CLIENT) {
      if (user.id === 'mock_guest') {
        const mockTechs: UserProfile[] = [
          {
            id: 'mock_t1',
            fullName: 'علاء الدين (Aladdin)',
            email: 'aladdin@bricola.tn',
            role: UserRole.TECHNICIAN,
            status: 'APPROVED',
            location: 'تطاوين المدينة',
            skills: [t.plumber],
            specializations: [t.plumber],
            ratingAvg: 0.0,
            ratingCount: 0,
            isOnline: true,
            galleryUrls: [
               'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400',
               'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400'
            ]
          },
          {
            id: 'mock_t2',
            fullName: 'سمية النجارة (Somiya)',
            email: 'somiya@bricola.tn',
            role: UserRole.TECHNICIAN,
            status: 'APPROVED',
            location: 'غمراسن',
            skills: [t.carpenter],
            specializations: [t.carpenter],
            ratingAvg: 0.0,
            ratingCount: 0,
            isOnline: false,
            galleryUrls: [
               'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400'
            ]
          }
        ];
        setTechnicians(mockTechs);
        return;
      }
      const qTech = query(
        collection(db, 'users'), 
        where('role', '==', UserRole.TECHNICIAN),
        where('status', '==', 'APPROVED')
      );
      const unsubscribeTech = onSnapshot(qTech, (snapshot) => {
        const techs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setTechnicians(techs);
      });
      return () => unsubscribeTech();
    }
  }, [user.role]);

  useEffect(() => {
    if (user.id === 'mock_guest') {
      if (requests.length > 0) return; // Don't reset if we already have mock data (including any added/updated requests)
      const mockRequests: ServiceRequest[] = [
        {
          id: 'mock_urgent_1',
          clientId: 'client_1',
          clientName: 'كمال الماجري',
          serviceType: 'PLUMBER',
          description: 'انفجار أنبوب مياه في المطبخ بوسط المدينة، الوضع مستعجل جداً!',
          urgency: 'HIGH',
          location: 'وسط الجهة، تطاوين',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          coordinates: { lat: 32.9300, lng: 10.4500 }
        },
        {
          id: 'mock_normal_1',
          clientId: 'client_2',
          clientName: 'نزيهة بن صالح',
          serviceType: 'ELECTRICIAN',
          description: 'تغيير مفاتيح الإنارة في الحديقة الخارجية بمنطقة غمراسن.',
          urgency: 'LOW',
          location: 'غمراسن، تطاوين',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          coordinates: { lat: 32.9000, lng: 10.4200 }
        },
        {
          id: 'mock_med_1',
          clientId: 'client_3',
          clientName: 'علي بن عيسى',
          serviceType: 'AC_REPAIR',
          description: 'المكيف يصدر صوتاً غريباً بسبب الرمال، يحتاج صيانة.',
          urgency: 'MEDIUM',
          location: 'البئر الأحمر، تطاوين',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          coordinates: { lat: 32.9500, lng: 10.4800 }
        }
      ];

      if (user.role === UserRole.TECHNICIAN) {
        setRequests(mockRequests);
      }
      return;
    }

    try {
      // RESET the initial load flag whenever our listener subscription re-runs (e.g. status toggle)
      // to prevent "New Job" notifications for existing jobs when re-subscribing.
      initialLoadRef.current = true;

      // For technicians, show all available jobs (online only) OR their joined jobs
      let q;
      if (user.role === UserRole.CLIENT) {
        q = query(collection(db, 'requests'), where('clientId', '==', user.id));
      } else {
        // Find jobs either unassigned OR assigned to this technician
        q = query(collection(db, 'requests'));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (user.role === UserRole.TECHNICIAN && !initialLoadRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data() as ServiceRequest;
              const isNewJob = data.status === 'PENDING' && data.clientId !== user.id;
              const isNewInquiry = data.status === 'INQUIRY' && data.assignedTechId === user.id;
              
              if (isNewJob || isNewInquiry) {
                setNewJobNotify(data);
                // Clear after 8 seconds
                setTimeout(() => setNewJobNotify(null), 8000);
              }
            }
          });
        }
        initialLoadRef.current = false;

        let fetchedRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceRequest[];

        if (user.role === UserRole.TECHNICIAN) {
           // Filter for jobs that ARE:
           // 1. Pending AND the technician is online AND matches their skills
           // 2. OR assigned to this technician
           fetchedRequests = fetchedRequests.filter(req => {
             const isAssignedToMe = req.assignedTechId === user.id;
             const isAvailableJob = req.status === 'PENDING' && currentOnlineStatus;
             
             // Check if the service type matches any of the tech's skills
             const hasMatchingSkill = user.skills?.includes(req.serviceType as any);

             return isAssignedToMe || (isAvailableJob && hasMatchingSkill);
           });

           // Sorting for Technicians
           const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, undefined: 0 };
           fetchedRequests.sort((a, b) => {
             const urgencyA = urgencyOrder[a.urgency || 'LOW'];
             const urgencyB = urgencyOrder[b.urgency || 'LOW'];
             if (urgencyB !== urgencyA) return urgencyB - urgencyA;
             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
           });
        } else {
          fetchedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        setRequests(fetchedRequests);
      }, (e) => {
        console.error('Dashboard fetch error:', e);
        setError(e.message);
      });

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Dashboard hook error:', err);
    }
  }, [user.id, user.role, currentOnlineStatus]);

  const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, undefined: 0 };
  const sortedRequests = [...requests].sort((a, b) => {
    const urgencyA = urgencyOrder[a.urgency || 'LOW'];
    const urgencyB = urgencyOrder[b.urgency || 'LOW'];
    if (urgencyB !== urgencyA) return urgencyB - urgencyA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeJobs = sortedRequests.filter(r => 
    r.status !== 'COMPLETED' && 
    (user.role === UserRole.CLIENT || currentOnlineStatus || r.assignedTechId === user.id)
  );
  const historyJobs = sortedRequests.filter(r => r.status === 'COMPLETED');
  const displayList = activeListTab === 'ACTIVE' ? activeJobs : historyJobs;

  const initiateCreateRequest = async (serviceType: string) => {
    setRequestDetails({
      serviceType,
      description: '',
      urgency: 'MEDIUM',
      location: '',
      budget: '',
      preferredTime: '',
      photos: []
    });
    setShowRequestForm(true);

    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const lat = position.coords.latitude.toFixed(4);
      const lng = position.coords.longitude.toFixed(4);
      setRequestDetails(prev => ({
        ...prev,
        location: lang === 'AR' ? `موقعي الحالي (Lat: ${lat}, Lng: ${lng})` : `My Location (Lat: ${lat}, Lng: ${lng})`
      }));
    } catch (e) {
      console.warn('Geolocation failed on form open', e);
    }
  };

  const submitCreateRequest = async () => {
    // Limit to 2 pending/active requests
    const pendingRequests = requests.filter(r => 
        r.clientId === user.id && 
        (r.status === 'PENDING' || r.status === 'INQUIRY')
    );
    
    if (pendingRequests.length >= 2) {
        alert(lang === 'AR' 
            ? 'لا يمكنك إضافة أكثر من طلبين في حالة انتظار. يرجى إكمال أو إلغاء الطلبات الحالية.' 
            : 'You cannot have more than 2 pending requests. Please complete or cancel current ones.');
        return;
    }

    setIsSubmitting(true);
    try {
      if (user.id === 'mock_guest') {
        let mockCoords = { lat: 32.9297 + (Math.random() - 0.5) * 0.1, lng: 10.4518 + (Math.random() - 0.5) * 0.1 };
        const newMockRequest: ServiceRequest = {
          id: `mock_${Date.now()}`,
          clientId: user.id,
          clientName: user.fullName,
          serviceType: requestDetails.serviceType,
          description: requestDetails.description,
          urgency: requestDetails.urgency,
          location: requestDetails.location || "Tataouine, Tunisia",
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          coordinates: mockCoords,
          budget: requestDetails.budget,
          preferredTime: requestDetails.preferredTime,
          photos: requestDetails.photos,
          clientRating: user.ratingAvg || 0.0
        };
        
        setRequests(prev => [newMockRequest, ...prev]);
        
        setTimeout(() => {
          setIsSubmitting(false);
          setShowRequestForm(false);
          alert(lang === 'AR' ? 'تمت إضافة طلب تجريبي في تطاوين!' : 'Mock request added in Tataouine!');
        }, 1000);
        return;
      }

      let coords = null;
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch (e) {
        console.warn('Geolocation failed, continuing without coords');
      }
      
      const newRequest = {
        clientId: user.id,
        clientName: user.fullName,
        serviceType: requestDetails.serviceType,
        description: requestDetails.description,
        urgency: requestDetails.urgency,
        location: requestDetails.location || (coords ? `Tataouine (Lat: ${coords.lat.toFixed(3)}, Lng: ${coords.lng.toFixed(3)})` : 'Tataouine, Tunisia'), 
        coordinates: coords,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        budget: requestDetails.budget,
        preferredTime: requestDetails.preferredTime,
        photos: requestDetails.photos,
        clientRating: user.ratingAvg || 0.0
      };
      await addDoc(collection(db, 'requests'), newRequest);
      alert(lang === 'AR' ? 'تم إرسال طلبك بنجاح!' : 'Request sent successfully!');
      setShowRequestForm(false);
      setRequestDetails({
         serviceType: '',
         description: '',
         urgency: 'MEDIUM',
         location: '',
         budget: '',
         preferredTime: '',
         photos: []
      });
    } catch (err) {
      console.error(err);
      alert('Error creating request');
    } finally {
      if (user.id !== 'mock_guest') setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!openChatId || !newMessageText.trim()) return;
    try {
      const msgData = {
        senderId: user.id,
        senderName: user.fullName,
        text: newMessageText,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'requests', openChatId, 'messages'), msgData);
      setNewMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitiateChat = async (tech: UserProfile) => {
    if (user.role !== UserRole.CLIENT) return;
    
    // Check if there's already an inquiry or active request with this tech
    const existing = requests.find(r => 
      r.assignedTechId === tech.id && 
      (r.status === 'INQUIRY' || r.status === 'PENDING' || r.status === 'ACCEPTED') &&
      r.clientId === user.id
    );

    if (existing) {
      setOpenChatId(existing.id);
      setSelectedTech(null);
      return;
    }

    // Limit to 2 pending/active requests
    const pendingTotal = requests.filter(r => 
        r.clientId === user.id && 
        (r.status === 'PENDING' || r.status === 'INQUIRY')
    ).length;

    if (pendingTotal >= 2) {
       alert(lang === 'AR' 
           ? 'لديك بالفعل طلبان قيد المعالجة. يرجى المتابعة معهم قبل فتح محادثة جديدة.' 
           : 'You already have 2 pending requests. Please follow up with them before opening a new inquiry.');
       return;
    }

    // Create a new inquiry request
    try {
      if (user.id === 'mock_guest') {
        const newInquiry: ServiceRequest = {
          id: `inquiry_${Date.now()}`,
          clientId: user.id,
          clientName: user.fullName,
          serviceType: tech.skills?.[0] || 'خدمة',
          description: lang === 'AR' ? 'استفسار من الحريف' : 'Inquiry from client',
          location: user.location || 'Tunisia',
          status: 'INQUIRY',
          assignedTechId: tech.id,
          createdAt: new Date().toISOString()
        };
        setRequests(prev => [newInquiry, ...prev]);
        setOpenChatId(newInquiry.id);
      } else {
        const docRef = await addDoc(collection(db, 'requests'), {
          clientId: user.id,
          clientName: user.fullName,
          serviceType: tech.skills?.[0] || 'خدمة',
          description: lang === 'AR' ? 'استفسار من الحريف' : 'Inquiry from client',
          location: user.location || 'Tunisia',
          status: 'INQUIRY',
          assignedTechId: tech.id,
          createdAt: serverTimestamp()
        });
        setOpenChatId(docRef.id);
      }
      setSelectedTech(null);
    } catch (err) {
      console.error(err);
      alert('Failed to start chat');
    }
  };

  const [showQuoteInput, setShowQuoteInput] = useState<string | null>(null);
  const [estimatedQuote, setEstimatedQuote] = useState('');

  const handleAcceptJob = async (requestId: string) => {
    if (user.id === 'mock_guest') {
       setRequests(prev => prev.map(r => r.id === requestId ? { 
         ...r, 
         status: 'ACCEPTED', 
         assignedTechId: user.id, 
         assignedTechName: user.fullName,
         quote: estimatedQuote || undefined,
         quoteStatus: 'PROPOSED'
       } : r));
       setShowQuoteInput(null);
       setEstimatedQuote('');
       alert(lang === 'AR' ? 'تم تقديم عرض السعر! بانتظار موافقة الحريف.' : 'Quote proposed! Waiting for client approval.');
       return;
    }
    try {
       const requestRef = doc(db, 'requests', requestId);
       await updateDoc(requestRef, {
         status: 'ACCEPTED',
         assignedTechId: user.id,
         assignedTechName: user.fullName,
         quote: estimatedQuote || null,
         quoteStatus: 'PROPOSED'
       });
       setShowQuoteInput(null);
       setEstimatedQuote('');
       alert(lang === 'AR' ? 'تم تقديم عرض السعر! بانتظار موافقة الحريف.' : 'Quote proposed! Waiting for client approval.');
    } catch (err) {
      console.error(err);
      alert('Error accepting job');
    }
  };

  const handleCompleteJob = async (requestId: string) => {
    if (user.id === 'mock_guest') {
       setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'COMPLETED' } : r));
       alert(lang === 'AR' ? 'تم إكمال المهمة بنجاح!' : 'Job completed successfully!');
       return;
    }
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        status: 'COMPLETED'
      });
      alert(lang === 'AR' ? 'تم إكمال المهمة بنجاح!' : 'Job completed successfully!');
    } catch (err) {
      console.error(err);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col p-6 animate-fade-in relative">
      <SideMenu 
        user={user} 
        lang={lang} 
        isOpen={isSideMenuOpen} 
        onClose={() => setIsSideMenuOpen(false)} 
        onNavigate={(view) => {
            if (view === 'PROFILE') onProfile();
            if (view === 'SETTINGS') onSettings();
        }} 
        onLogout={onLogout} 
        onOpenChat={() => setShowActiveChats(true)}
      />

      {isSubmitting && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* New Job Notification Pop-up */}
      {newJobNotify && (
        <div className={`fixed top-24 left-4 right-4 ${newJobNotify.status === 'INQUIRY' ? 'bg-purple-600 shadow-purple-200' : 'bg-orange-500 shadow-orange-200'} text-white p-5 rounded-3xl shadow-2xl z-[150] flex items-center justify-between border-2 border-white/20 backdrop-blur-md`}>
          <div className="flex items-center gap-4">
             <span className="text-3xl drop-shadow-lg">{newJobNotify.status === 'INQUIRY' ? '💬' : '🛠️'}</span>
             <div>
               <p className="font-black text-[10px] uppercase tracking-widest opacity-80">
                 {newJobNotify.status === 'INQUIRY' ? (lang === 'AR' ? 'استفسار جديد من حريف!' : 'New Direct Inquiry!') : (lang === 'AR' ? 'طلب عمل متاح الآن!' : 'New Job Opportunity!')}
               </p>
               <p className="font-bold text-base leading-tight">
                 {newJobNotify.serviceType} - {newJobNotify.clientName}
               </p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                onRequestDetails(newJobNotify);
                setNewJobNotify(null);
              }}
              className="bg-white text-gray-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all"
            >
              {lang === 'AR' ? 'فتح' : 'Open'}
            </button>
            <button 
              onClick={() => setNewJobNotify(null)}
              className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl font-bold hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Request Details Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-800">
                {lang === 'AR' ? `طلب ${requestDetails.serviceType}` : `${requestDetails.serviceType} Request`}
              </h3>
              <button 
                onClick={() => setShowRequestForm(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {lang === 'AR' ? 'وصف المشكلة' : 'Problem Description'}
                </label>
                <textarea 
                  value={requestDetails.description}
                  onChange={(e) => setRequestDetails({...requestDetails, description: e.target.value})}
                  placeholder={lang === 'AR' ? 'اشرح ما تحتاجه بالتفصيل...' : 'Explain what you need in detail...'}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl h-32 outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {lang === 'AR' ? 'مستوى الاستعجال' : 'Urgency Level'}
                </label>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setRequestDetails({...requestDetails, urgency: level})}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                        requestDetails.urgency === level 
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {level === 'LOW' ? (lang === 'AR' ? 'عادي' : 'Low') : 
                       level === 'MEDIUM' ? (lang === 'AR' ? 'متوسط' : 'Medium') : 
                       (lang === 'AR' ? 'عاجل جداً' : 'Urgent')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {lang === 'AR' ? 'العنوان / الموقع' : 'Location / Address'}
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={requestDetails.location}
                    onChange={(e) => setRequestDetails({...requestDetails, location: e.target.value})}
                    placeholder={lang === 'AR' ? 'مثال: حي النصر، تونس' : 'e.g. Ennasr, Tunis'}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">📍</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {lang === 'AR' ? 'الميزانية (اختياري)' : 'Budget (Optional)'}
                  </label>
                  <input 
                    type="number"
                    value={requestDetails.budget}
                    onChange={(e) => setRequestDetails({...requestDetails, budget: e.target.value})}
                    placeholder="e.g. 50 DT"
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    {lang === 'AR' ? 'الوقت المفضل' : 'Preferred Time'}
                  </label>
                  <input 
                    type="datetime-local"
                    value={requestDetails.preferredTime}
                    onChange={(e) => setRequestDetails({...requestDetails, preferredTime: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {lang === 'AR' ? 'صور توضيحية' : 'Photos'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <label className="w-20 h-20 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-all shrink-0">
                    <span className="text-xl">📸</span>
                    <span className="text-[8px] font-black uppercase text-gray-400 mt-1">{lang === 'AR' ? 'إضافة' : 'Add'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setRequestDetails(prev => ({
                              ...prev,
                              photos: [...prev.photos, reader.result as string]
                            }));
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                    />
                  </label>
                  {requestDetails.photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 shrink-0">
                      <img src={p} className="w-full h-full object-cover rounded-2xl" alt="" />
                      <button 
                        onClick={() => setRequestDetails(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-lg"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={submitCreateRequest}
                disabled={isSubmitting || !requestDetails.description.trim()}
                className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 disabled:opacity-50 active:scale-95"
              >
                {lang === 'AR' ? 'تأكيد الطلب الآن' : 'Confirm Request Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Chats List for Technician */}
      {showActiveChats && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in">
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black">{lang === 'AR' ? 'المحادثات الأخيرة' : 'Recent Chats'}</h3>
                 <button onClick={() => setShowActiveChats(false)} className="text-white/60 hover:text-white text-xl">✕</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                 {requests.filter(r => 
                    r.clientId === user.id || 
                    r.assignedTechId === user.id || 
                    (r.status === 'INQUIRY' && (r.assignedTechId === user.id || r.clientId === user.id))
                 ).length === 0 ? (
                    <div className="py-10 text-center opacity-50 font-bold text-sm">
                       {lang === 'AR' ? 'لا توجد محادثات نشطة حالياً.' : 'No active chats found.'}
                    </div>
                 ) : (
                    requests.filter(r => 
                        r.clientId === user.id || 
                        r.assignedTechId === user.id || 
                        (r.status === 'INQUIRY' && (r.assignedTechId === user.id || r.clientId === user.id))
                    ).map(chat => (
                       <button 
                         key={chat.id}
                         onClick={() => { setOpenChatId(chat.id); setShowActiveChats(false); }}
                         className="w-full p-4 bg-gray-50 hover:bg-orange-50 rounded-2xl flex items-center gap-4 transition-all group"
                       >
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:bg-orange-100">
                             {chat.status === 'INQUIRY' ? '❓' : '🛠️'}
                          </div>
                          <div className={`flex-1 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                             <p className="font-black text-gray-800 text-sm">
                                {user.role === 'CLIENT' ? (chat.assignedTechId ? 'فني (Technician)' : 'في انتظار الرد') : chat.clientName}
                             </p>
                             <p className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">{chat.serviceType} - {chat.status}</p>
                          </div>
                          <span className="text-xs text-orange-500 font-bold">💬</span>
                       </button>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6 sticky top-0 bg-white/80 backdrop-blur-md pt-4 pb-4 z-40">
        <button 
          onClick={() => setIsSideMenuOpen(true)}
          className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-sm hover:bg-orange-50 hover:text-orange-500 transition-all"
        >
          ☰
        </button>
        <div className="flex flex-col items-center">
           <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnlineStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                {isOnlineStatus ? (lang === 'AR' ? 'متصل' : 'Online') : (lang === 'AR' ? 'غير متصل (يعمل محلياً)' : 'Offline (Local Mode)')}
              </p>
           </div>
           <h2 className="text-sm font-black text-gray-800 tracking-tighter">B R I C O L A</h2>
        </div>
        <div className={`p-2 rounded-2xl bg-gray-50 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
            {lang === 'AR' ? 'مرحباً' : 'Welcome'}
          </p>
          <h2 className="text-[10px] font-black text-orange-500 truncate max-w-[80px]">{user.fullName.split(' ')[0]}</h2>
        </div>
      </header>

      {/* عرض الإشعارات الأخيرة (محاكاة) */}
      {user.notifications && user.notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {user.notifications.slice(-1).map(notif => (
            <div key={notif.id} className="bg-slate-800 text-white p-4 rounded-2xl shadow-lg border-l-4 border-orange-500">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs">🔔 {notif.title}</span>
                <span className="text-[10px] opacity-60">{notif.createdAt}</span>
              </div>
              <p className="text-xs opacity-90">{notif.body}</p>
            </div>
          ))}
        </div>
      )}

      {user.role === UserRole.CLIENT ? (
        <div className="space-y-6">
          {/* Enhanced Promo/Hero Section */}
          <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl group active:scale-95 transition-all">
             <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="bg-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                     {lang === 'AR' ? 'جديد' : 'NEW'}
                  </div>
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-1 leading-tight">
                    {lang === 'AR' ? 'احصل على 20% خصم' : 'Get 20% Off'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    {lang === 'AR' ? 'على أول طلب سباكة اليوم!' : 'On your first plumbing request today!'}
                  </p>
                </div>
                <button 
                  onClick={() => initiateCreateRequest('PLUMBER')}
                  className="w-fit bg-white text-slate-900 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-xl"
                >
                  {lang === 'AR' ? 'احجز الآن' : 'BOOK NOW'}
                </button>
             </div>
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-10 -mt-10" />
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3">
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col items-center">
                <span className="text-lg mb-1">📋</span>
                <span className="text-sm font-black text-gray-800">{activeJobs.length}</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase">{lang === 'AR' ? 'نشطة' : 'Active'}</span>
             </div>
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col items-center">
                <span className="text-lg mb-1">⭐</span>
                <span className="text-sm font-black text-gray-800">{user.ratingAvg?.toFixed(1) || '0.0'}</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase">{lang === 'AR' ? 'تقييمك' : 'Rating'}</span>
             </div>
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col items-center">
                <span className="text-lg mb-1">🎁</span>
                <span className="text-sm font-black text-gray-800">120</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase">{lang === 'AR' ? 'نقاط' : 'Points'}</span>
             </div>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-[2rem] shadow-sm">
            <button 
              onClick={() => setClientViewMode('REQUESTS')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${clientViewMode === 'REQUESTS' ? 'bg-white text-orange-500 shadow-md' : 'text-gray-400'}`}
            >
              📋 {lang === 'AR' ? 'طلباتي' : 'My Requests'}
            </button>
            <button 
              onClick={() => setClientViewMode('BROWSE')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${clientViewMode === 'BROWSE' ? 'bg-white text-orange-500 shadow-md' : 'text-gray-400'}`}
            >
              🔎 {lang === 'AR' ? 'تصفح الفنيين' : 'Browse Pros'}
            </button>
          </div>

          {clientViewMode === 'BROWSE' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="relative mb-4 group shadow-lg shadow-orange-100/20 rounded-3xl group">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'AR' ? 'ابحث بالاسم أو المهنة...' : 'Search by name or skill...'}
                  className="w-full p-5 pr-14 bg-white rounded-3xl border-2 border-transparent focus:border-orange-500 outline-none text-right placeholder-gray-300 font-bold transition-all shadow-sm group-hover:shadow-md"
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl grayscale pointer-events-none group-hover:scale-110 transition-transform">🔍</span>
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-orange-200 pointer-events-none tracking-widest">
                  {lang === 'AR' ? 'بحث' : 'SEARCH'}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[t.plumber, t.electrician, t.ac_repair, t.painter, t.carpenter, t.mason].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSearchQuery(prev => prev === cat ? '' : cat)}
                    className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black whitespace-nowrap transition-all flex items-center gap-2 ${
                      searchQuery.includes(cat) ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white border-2 border-gray-100 text-gray-500 shadow-sm hover:border-orange-200'
                    }`}
                  >
                    <span className="text-sm">
                      {cat === t.plumber && '🚰'}
                      {cat === t.electrician && '⚡'}
                      {cat === t.ac_repair && '❄️'}
                      {cat === t.painter && '🎨'}
                      {cat === t.carpenter && '🪚'}
                      {cat === t.mason && '🧱'}
                    </span>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 pb-10">
                {technicians
                  .filter(tech => 
                    tech.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (tech.skills?.join(' ') || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (tech.specializations?.join(' ') || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tech.id.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-gray-100 rounded-3xl text-center text-gray-300">
                      <p className="font-bold">{lang === 'AR' ? 'لم يتم العثور على فنيين يطابقون بحثك.' : 'No technicians found matching your search.'}</p>
                    </div>
                  ) : (
                    technicians
                    .filter(tech => 
                      tech.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (tech.skills?.join(' ') || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (tech.specializations?.join(' ') || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      tech.id.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(tech => (
                      <div key={tech.id} className="bg-white border border-gray-50 p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex gap-4 items-center">
                          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl relative overflow-hidden">
                             {tech.profilePictureUrl ? (
                               <img src={tech.profilePictureUrl} alt={tech.fullName} className="w-full h-full object-cover" />
                             ) : '👤'}
                             {tech.isOnline && (
                               <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                             )}
                          </div>
                          <div className="flex-1">
                             <h4 className="font-bold text-gray-800 text-lg">{tech.fullName}</h4>
                             <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">📍 {tech.location || 'غير محدد'}</p>
                             <div className="flex gap-1 flex-wrap">
                               {(tech.skills || []).slice(0, 3).map(s => (
                                 <span key={s} className="px-2 py-0.5 bg-orange-50 text-orange-500 text-[8px] font-black rounded-lg">{s}</span>
                               ))}
                             </div>
                          </div>
                          <button 
                            onClick={() => setSelectedTech(tech)}
                            className="p-3 bg-gray-50 rounded-2xl hover:bg-orange-50 transition-colors"
                          >
                            <span className="text-xl">👉</span>
                          </button>
                        </div>
                        {tech.ratingAvg !== undefined && (
                           <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs font-black text-orange-500">⭐ {(tech.ratingAvg || 0).toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400">({tech.ratingCount || 0})</span>
                           </div>
                        )}
                      </div>
                    ))
                  )
                }
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-2">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{lang === 'AR' ? 'تصفح الخدمات' : 'EXPLORE SERVICES'}</h4>
                 <div className="flex gap-1.5">
                    <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
                    <div className="w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-150" />
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { id: 'PLUMBER', label: t.plumber, icon: '🚰', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-300' },
                  { id: 'ELECTRICIAN', label: t.electrician, icon: '⚡', bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-300' },
                  { id: 'AC_REPAIR', label: t.ac_repair, icon: '❄️', bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-300' },
                  { id: 'PAINTER', label: t.painter, icon: '🎨', bg: 'bg-pink-50', text: 'text-pink-600', dot: 'bg-pink-300' },
                  { id: 'CARPENTER', label: t.carpenter, icon: '🪑', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-300' },
                  { id: 'MASON', label: t.mason, icon: '🧱', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
                ].map((service) => (
                  <button 
                    key={service.id}
                    onClick={() => initiateCreateRequest(service.id)}
                    className="relative overflow-hidden aspect-square bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 flex flex-col items-center justify-center gap-3 group hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-200/40 active:scale-95 transition-all shadow-sm"
                  >
                    <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-125 transition-transform duration-500 group-hover:rotate-6 shadow-inner`}>
                      {service.icon}
                    </div>
                    <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest group-hover:text-orange-600 transition-colors">
                      {service.label}
                    </span>
                    <div className={`absolute top-4 right-4 w-2 h-2 ${service.dot} rounded-full opacity-20 group-hover:scale-150 transition-transform`} />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500/0 group-hover:bg-orange-500/10 rounded-full transition-all" />
                  </button>
                ))}
              </div>

              <div className="mt-10 space-y-6">
                <div className="flex bg-gray-100 p-1.5 rounded-[2rem] mb-2 shadow-inner">
                  <button 
                    onClick={() => setActiveListTab('ACTIVE')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeListTab === 'ACTIVE' ? 'bg-white text-orange-500 shadow-md' : 'text-gray-400'}`}
                  >
                    {t.activeRequests} ({activeJobs.length})
                  </button>
                  <button 
                    onClick={() => setActiveListTab('HISTORY')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeListTab === 'HISTORY' ? 'bg-white text-orange-500 shadow-md' : 'text-gray-400'}`}
                  >
                    {t.history} ({historyJobs.length})
                  </button>
                </div>

            {displayList.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400 text-sm">
                {activeListTab === 'ACTIVE' ? t.noActiveRequests : t.noHistory}
              </div>
            ) : (
              displayList.map(req => (
                <div 
                  key={req.id} 
                  onClick={() => onRequestDetails(req)}
                  className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col group hover:bg-orange-50/10 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase">#{req.id.slice(-4).toUpperCase()}</span>
                        {req.urgency && (
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                            req.urgency === 'HIGH' ? 'bg-red-500 text-white' : 
                            req.urgency === 'MEDIUM' ? 'bg-yellow-500 text-white' : 
                            'bg-blue-500 text-white'
                          }`}>
                            {req.urgency === 'HIGH' ? (lang === 'AR' ? 'عاجل' : 'URGENT') : 
                             req.urgency === 'MEDIUM' ? (lang === 'AR' ? 'متوسط' : 'MEDIUM') : 
                             (lang === 'AR' ? 'عادي' : 'LOW')}
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-gray-800">{getCategoryLabel(req.serviceType)}</h5>
                      <p className="text-[10px] text-gray-400 font-bold mb-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                      
                      {req.description && (
                        <p className="text-[11px] text-gray-600 font-medium italic mb-2 line-clamp-2">
                           "{req.description}"
                        </p>
                      )}
                      
                      {req.assignedTechName && <p className="text-[10px] text-blue-500 font-black tracking-widest uppercase mt-2">🛠️ {req.assignedTechName}</p>}
                      
                      {req.quote && (
                        <div className="mt-2 space-y-3">
                          <div className={`p-3 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
                            req.quoteStatus === 'ACCEPTED' ? 'bg-green-50 border-green-100' :
                            req.quoteStatus === 'REJECTED' ? 'bg-red-50 border-red-100' :
                            'bg-blue-50 border-blue-100'
                          }`}>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {req.quoteStatus === 'ACCEPTED' ? (lang === 'AR' ? 'السعر المتفق عليه' : 'AGREED PRICE') :
                                 req.quoteStatus === 'REJECTED' ? (lang === 'AR' ? 'السعر المرفوض' : 'REJECTED PRICE') :
                                 (lang === 'AR' ? 'عرض السعر المقترح' : 'PROPOSED QUOTE')}
                              </span>
                              <span className={`text-sm font-black ${
                                req.quoteStatus === 'ACCEPTED' ? 'text-green-700' :
                                req.quoteStatus === 'REJECTED' ? 'text-red-700' :
                                'text-blue-700'
                              }`}>{req.quote} DT</span>
                            </div>
                            <div className="text-[10px] font-bold">
                              {req.quoteStatus === 'ACCEPTED' ? '✅' : req.quoteStatus === 'REJECTED' ? '❌' : '⏳'}
                            </div>
                          </div>

                          {req.status === 'ACCEPTED' && req.quoteStatus === 'PROPOSED' && (
                            <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                              <button 
                                onClick={async () => {
                                   if (user.id !== 'mock_guest') {
                                      await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'ACCEPTED' });
                                   } else {
                                      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, quoteStatus: 'ACCEPTED' } : r));
                                   }
                                }}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-green-100 active:scale-95 transition-all"
                              >
                                {lang === 'AR' ? 'قبول السعر' : 'Accept'}
                              </button>
                               <button 
                                onClick={async () => {
                                   const counter = prompt(lang === 'AR' ? 'أدخل عرضك المالي (د.ت):' : 'Enter your counter offer (DT):');
                                   if (counter) {
                                      if (user.id !== 'mock_guest') {
                                         await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'COUNTERED', counterQuote: counter });
                                      } else {
                                         setRequests(prev => prev.map(r => r.id === req.id ? { ...r, quoteStatus: 'COUNTERED', counterQuote: counter } : r));
                                      }
                                   }
                                }}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black shadow-sm active:scale-95 transition-all"
                              >
                                {lang === 'AR' ? 'تفاوض' : 'Counter'}
                              </button>
                              <button 
                                onClick={async () => {
                                   if (user.id !== 'mock_guest') {
                                      await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'REJECTED' });
                                   } else {
                                      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, quoteStatus: 'REJECTED' } : r));
                                   }
                                }}
                                className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black shadow-sm active:scale-95 transition-all"
                              >
                                {lang === 'AR' ? 'رفض' : 'Reject'}
                              </button>
                            </div>
                          )}

                          {req.quoteStatus === 'COUNTERED' && (
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl text-[10px]">
                               <p className="font-bold text-orange-600 mb-1">{lang === 'AR' ? 'عرضك المقابل:' : 'Your Counter Offer:'}</p>
                               <p className="font-black text-orange-800 text-xs">{req.counterQuote} DT</p>
                               <p className="mt-1 text-gray-400 italic">{lang === 'AR' ? 'بانتظار رد الفني...' : 'Waiting for tech'}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider h-fit ${
                      req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'INQUIRY' ? 'bg-purple-100 text-purple-700' :
                      req.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {req.status}
                    </div>
                  </div>

                  {activeListTab === 'ACTIVE' && (req.status === 'ACCEPTED' || req.status === 'INQUIRY') && (
                    <div className="mt-3 flex gap-2">
                       <button 
                        onClick={() => setOpenChatId(req.id)}
                        className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-extra-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                      >
                        💬 {lang === 'AR' ? 'المحادثة' : 'Chat'}
                      </button>
                      {req.status === 'ACCEPTED' && (
                        <a 
                          href="tel:21612345678" // Simulation phone number
                          className="flex-1 py-3 bg-green-50 text-green-600 rounded-xl text-xs font-extra-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                        >
                          📞 {lang === 'AR' ? 'اتصال مباشر' : 'Direct Call'}
                        </a>
                      )}
                    </div>
                  )}

                  {activeListTab === 'HISTORY' && !req.rating && (
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-tight">
                        {t.rateService}
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            disabled={ratingLoading === req.id}
                            onClick={() => handleSubmitRating(req.id, star)}
                            className="text-2xl hover:scale-125 transition-transform active:scale-95"
                          >
                            ☆
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeListTab === 'HISTORY' && req.rating && (
                    <div className="mt-3 pt-2 border-t border-gray-50 flex items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{lang === 'AR' ? 'تقييمك:' : 'Your rating:'}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className="text-sm">{s <= req.rating ? '⭐' : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="space-y-6">
          {/* شاشة حالة الحساب للفني */}
          {user.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-3xl text-center">
              <span className="text-4xl mb-4 block">⏳</span>
              <h3 className="text-xl font-bold text-yellow-800 mb-2">{t.accountPending}</h3>
              <p className="text-sm text-yellow-600">{t.accountPendingDesc}</p>
            </div>
          )}

          {user.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-3xl text-center">
              <span className="text-4xl mb-4 block">❌</span>
              <h3 className="text-xl font-bold text-red-800 mb-2">{t.accountRejected}</h3>
              <p className="text-sm text-red-600">{t.accountRejectedDesc}</p>
            </div>
          )}

          {user.status === 'APPROVED' && (
            <>
              <div className={`${currentOnlineStatus ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-700 shadow-slate-100'} p-6 rounded-3xl text-white shadow-xl transition-all duration-300`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">
                    {currentOnlineStatus ? t.online : t.offline}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={toggleOnlineStatus}
                      disabled={isUpdatingStatus}
                      className={`w-14 h-8 rounded-full relative shadow-inner transition-all duration-300 focus:outline-none flex items-center px-1 ${currentOnlineStatus ? 'bg-green-500' : 'bg-slate-400'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${currentOnlineStatus ? (lang === 'AR' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <p className="opacity-90">
                  {currentOnlineStatus ? t.accountApprovedDesc : (lang === 'AR' ? 'قم بالتفعيل لبدء استقبال الطلبات.' : 'Activate to start receiving requests.')}
                </p>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-xl mt-8 mb-4">
                <button 
                  onClick={() => setActiveListTab('ACTIVE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeListTab === 'ACTIVE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                  {t.activeRequests} ({activeJobs.length})
                </button>
                <button 
                  onClick={() => setActiveListTab('HISTORY')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeListTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                >
                  {t.history} ({historyJobs.length})
                </button>
              </div>

              {activeListTab === 'ACTIVE' && (
                <div className="flex justify-between items-center mb-4">
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
                    {['ALL', t.plumber, t.electrician, t.ac_repair].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTechFilter(cat)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap transition-all ${
                          techFilter === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {cat === 'ALL' ? (lang === 'AR' ? 'الكل' : 'All') : cat}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowMap(!showMap)}
                    className={`p-2 rounded-xl border-2 transition-all ${showMap ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-blue-600 border-blue-100'}`}
                  >
                    {showMap ? '📋' : '📍'}
                  </button>
                </div>
              )}

              {showMap && activeListTab === 'ACTIVE' ? (
                <div className="h-[400px] mb-6 animate-fade-in relative z-10">
                   <MapView 
                     requests={displayList.filter(r => techFilter === 'ALL' || r.serviceType === techFilter)} 
                     onSelectRequest={(req) => {
                        // For simplicity, just alert for now or find the card
                        setTechFilter(req.serviceType);
                        setShowMap(false);
                     }}
                     lang={lang}
                   />
                </div>
              ) : (
                <div className="space-y-4 pb-10 flex-1 overflow-y-auto">
                {displayList.filter(r => techFilter === 'ALL' || r.serviceType === techFilter).length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl text-center text-gray-400">
                    <p className="mb-2">
                      {activeListTab === 'ACTIVE' ? (currentOnlineStatus ? t.noActiveRequests : (lang === 'AR' ? 'افتح الاتصال لرؤية الطلبات' : 'Go online to see requests')) : t.noHistory}
                    </p>
                  </div>
                ) : (
                  displayList
                  .filter(r => techFilter === 'ALL' || r.serviceType === techFilter)
                  .map(req => (
                    <div 
                      key={req.id} 
                      onClick={() => onRequestDetails(req)}
                      className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm space-y-4 relative overflow-hidden cursor-pointer hover:bg-blue-50/10 transition-colors group"
                    >
                      {req.status === 'PENDING' && (
                        <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
                      )}
                      
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase">#{req.id.slice(-4)}</span>
                            {req.urgency && (
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                req.urgency === 'HIGH' ? 'bg-red-500 text-white' : 
                                req.urgency === 'MEDIUM' ? 'bg-yellow-500 text-white' : 
                                'bg-blue-500 text-white'
                              }`}>
                                {req.urgency === 'HIGH' ? (lang === 'AR' ? 'عاجل' : 'URGENT') : 
                                 req.urgency === 'MEDIUM' ? (lang === 'AR' ? 'متوسط' : 'MEDIUM') : 
                                 (lang === 'AR' ? 'عادي' : 'LOW')}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-800 text-lg">{getCategoryLabel(req.serviceType)}</h4>
                          <p className="text-xs text-gray-400 font-bold mb-1">📍 {req.location}</p>
                          <p className="text-xs text-slate-500 font-bold">👤 {req.clientName}</p>
                          
                          {req.description && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 font-medium border-l-2 border-blue-500 italic">
                              "{req.description}"
                            </div>
                          )}
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider h-fit ${
                          req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'INQUIRY' ? 'bg-purple-100 text-purple-700' :
                          req.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {req.status}
                        </div>
                      </div>

                      {activeListTab === 'ACTIVE' && (
                        <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">
                          {req.status === 'PENDING' ? (
                            showQuoteInput === req.id ? (
                               <div 
                                 onClick={(e) => e.stopPropagation()}
                                 className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-slide-up"
                               >
                                 <label className="text-[10px] font-black text-blue-600 block uppercase tracking-widest">{lang === 'AR' ? 'عرض السعر التقريبي (د.ت)' : 'Estimated Quote (DT)'}</label>
                                 <input 
                                   type="number"
                                   value={estimatedQuote}
                                   onChange={(e) => setEstimatedQuote(e.target.value)}
                                   placeholder="e.g. 50"
                                   className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                                 />
                                 <div className="flex gap-2">
                                   <button 
                                      onClick={() => setShowQuoteInput(null)}
                                      className="flex-1 py-3 bg-white border border-gray-200 text-gray-400 rounded-xl text-xs font-bold shadow-sm"
                                   >
                                      {lang === 'AR' ? 'إلغاء' : 'Cancel'}
                                   </button>
                                   <button 
                                      onClick={() => handleAcceptJob(req.id)}
                                      className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
                                   >
                                      {lang === 'AR' ? 'تأكيد وقبول' : 'Confirm & Accept'}
                                   </button>
                                 </div>
                               </div>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowQuoteInput(req.id);
                                }}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 transition-transform"
                               >
                                <span className="text-lg">🛠️</span>
                                {lang === 'AR' ? 'قبول وإرسال عرض' : 'Accept & Send Quote'}
                              </button>
                            )
                          ) : req.status === 'INQUIRY' ? (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-col gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 animate-slide-up"
                            >
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest text-center">
                                {lang === 'AR' ? 'استفسار من حريف' : 'Client Inquiry'}
                              </p>
                              {showQuoteInput === req.id ? (
                                 <div className="space-y-3">
                                   <input 
                                     type="number"
                                     value={estimatedQuote}
                                     onChange={(e) => setEstimatedQuote(e.target.value)}
                                     placeholder={lang === 'AR' ? 'أدخل سعرك المقترح...' : 'Enter proposed price...'}
                                     className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none"
                                   />
                                   <div className="flex gap-2">
                                     <button onClick={() => setShowQuoteInput(null)} className="flex-1 py-3 text-xs font-bold text-gray-400">{lang === 'AR' ? 'إلغاء' : 'Cancel'}</button>
                                     <button onClick={() => handleAcceptJob(req.id)} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200">{lang === 'AR' ? 'إرسال السعر والقبول' : 'Send & Accept'}</button>
                                   </div>
                                 </div>
                              ) : (
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setOpenChatId(req.id);
                                     }}
                                     className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                   >
                                     💬 {lang === 'AR' ? 'محادثة' : 'Chat'}
                                   </button>
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setShowQuoteInput(req.id);
                                     }}
                                     className="flex-1 py-3 bg-white border border-purple-200 text-purple-600 rounded-xl text-xs font-black shadow-sm"
                                   >
                                     💰 {lang === 'AR' ? 'عرض سعر' : 'Price Offer'}
                                   </button>
                                 </div>
                              )}
                            </div>
                          ) : req.assignedTechId === user.id && (
                            <div className="flex flex-col gap-3 pt-2 border-t border-gray-50">
                               {req.quoteStatus === 'COUNTERED' ? (
                                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-3 shadow-sm">
                                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-orange-600 tracking-widest">
                                        <span>{lang === 'AR' ? 'عرض مقابل جديد' : 'New Counter Offer!'}</span>
                                        <span className="text-xl">💰</span>
                                     </div>
                                     <p className="text-sm font-black text-orange-800 text-center">{req.counterQuote} DT</p>
                                     <div className="flex gap-2">
                                        <button 
                                          onClick={async () => {
                                             if (user.id !== 'mock_guest') {
                                                await updateDoc(doc(db, 'requests', req.id), { quote: req.counterQuote, quoteStatus: 'ACCEPTED' });
                                             } else {
                                                setRequests(prev => prev.map(r => r.id === req.id ? { ...r, quote: req.counterQuote, quoteStatus: 'ACCEPTED' } : r));
                                             }
                                          }}
                                          className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-orange-100 active:scale-95 transition-all"
                                        >
                                          {lang === 'AR' ? 'قبول العرض الجديد' : 'Accept Counter'}
                                        </button>
                                        <button 
                                          onClick={async () => {
                                             if (user.id !== 'mock_guest') {
                                                await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'REJECTED' });
                                             } else {
                                                setRequests(prev => prev.map(r => r.id === req.id ? { ...r, quoteStatus: 'REJECTED' } : r));
                                             }
                                          }}
                                          className="flex-1 py-3 bg-white border border-orange-200 text-orange-600 rounded-xl text-[10px] font-black shadow-sm active:scale-95 transition-all"
                                        >
                                          {lang === 'AR' ? 'رفض' : 'Reject'}
                                        </button>
                                     </div>
                                  </div>
                               ) : req.quoteStatus === 'ACCEPTED' ? (
                                  <div className="p-3 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between text-green-700">
                                     <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'AR' ? 'تم قبول السعر' : 'QUOTE ACCEPTED!'}</span>
                                     <span className="font-black text-sm">{req.quote} DT</span>
                                  </div>
                               ) : (
                                  <div className="p-3 bg-blue-50 border border-blue-50 rounded-2xl text-[10px] font-bold text-blue-500 text-center tracking-widest uppercase">
                                     {lang === 'AR' ? 'بانتظار رد الحريف على عرضك' : 'Waiting for client to respond'}
                                  </div>
                               )}

                              <div className="flex gap-2">
                                {/* Chat & Done buttons */}
                                <button 
                                  onClick={() => setOpenChatId(req.id)}
                                  className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
                                >
                                  💬 {lang === 'AR' ? 'المحادثة' : 'Chat'}
                                </button>
                                <button 
                                  onClick={() => handleUpdateJobStatus(req.id, 'COMPLETED')}
                                  className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-50 active:scale-95 transition-all"
                                >
                                  {lang === 'AR' ? 'إتمام' : 'Done'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    )}

    {openChatId && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col pt-10">
        <div className="flex-1 bg-white rounded-t-[3rem] flex flex-col shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <button 
                onClick={() => setOpenChatId(null)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 font-bold"
              >
                ✕
              </button>
              <div className="text-center">
                <h3 className="font-bold text-gray-800">{lang === 'AR' ? 'المحادثة المباشرة' : 'Live Chat'}</h3>
                <p className="text-[10px] text-green-500 font-black tracking-widest uppercase">● Online</p>
              </div>
              <div className="w-10" />
            </header>

            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50">
                  <div className="text-4xl">💬</div>
                  <p className="text-xs font-bold uppercase tracking-widest">{lang === 'AR' ? 'ابدأ المحادثة الآن' : 'Start chatting now'}</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm ${
                      msg.senderId === user.id 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] font-black text-gray-300 mt-1 uppercase tracking-tighter">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <footer className="p-4 bg-white border-t border-gray-100 pb-10">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={lang === 'AR' ? 'اكتب رسالتك...' : 'Type message...'}
                  className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100"
                >
                  ➤
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {selectedTech && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col pt-20 animate-fade-in no-scrollbar overflow-y-auto">
           <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-[210]">
             <button 
               onClick={() => setSelectedTech(null)}
               className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-all font-bold"
             >
               ✕
             </button>
             <h3 className="font-bold text-white text-lg">{lang === 'AR' ? 'ملف الفني' : 'Tech Profile'}</h3>
             <div className="w-12" />
           </header>

           <div className="bg-white rounded-t-[3rem] min-h-[85vh] p-8 space-y-8 pb-32">
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="w-24 h-24 bg-orange-100 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl shadow-orange-100 overflow-hidden">
                    {selectedTech.profilePictureUrl ? (
                      <img src={selectedTech.profilePictureUrl} alt={selectedTech.fullName} className="w-full h-full object-cover" />
                    ) : '👤'}
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-gray-800">{selectedTech.fullName}</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">📍 {selectedTech.location || 'Tunisia'}</p>
                    {selectedTech.isOnline && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        {lang === 'AR' ? 'متصل الآن' : 'Online'}
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex gap-4 p-4 bg-gray-50 rounded-3xl text-center">
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{lang === 'AR' ? 'التقييم' : 'Rating'}</p>
                    <p className="text-xl font-black text-orange-500">⭐ {selectedTech.ratingAvg || '0.0'}</p>
                 </div>
                 <div className="w-px bg-gray-200" />
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{lang === 'AR' ? 'إجمالي الأعمال' : 'Work Done'}</p>
                    <p className="text-xl font-black text-blue-500">+{selectedTech.ratingCount || 0}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">{lang === 'AR' ? 'معرض الأعمال' : 'Portfolio Gallery'}</h4>
                 <div className="grid grid-cols-2 gap-3">
                    {selectedTech.galleryUrls && selectedTech.galleryUrls.length > 0 ? (
                      selectedTech.galleryUrls.map((url, i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:scale-105 active:scale-95 transition-all">
                           <img src={url} alt={`portfolio-${i}`} className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 p-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-4 text-gray-300">
                         <span className="text-4xl grayscale opacity-50">🖼️</span>
                         <p className="text-xs font-bold uppercase tracking-widest text-center">{lang === 'AR' ? 'لا توجد صور لمعرض الأعمال بعد.' : 'No portfolio images yet.'}</p>
                      </div>
                    )}
                 </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-50 flex gap-4 z-[220]">
                 <button 
                  onClick={() => handleInitiateChat(selectedTech)}
                  className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-50 active:scale-95 transition-all"
                 >
                   💬
                 </button>
                 <button 
                  onClick={() => {
                    initiateCreateRequest(selectedTech.skills?.[0] || 'خدمة');
                    setSelectedTech(null);
                  }}
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   <span>🛠️</span>
                   {lang === 'AR' ? 'اطلب الخدمة الآن' : 'Request Service'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
