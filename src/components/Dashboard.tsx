import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logEvent } from 'firebase/analytics';
import { fetchAndActivate, getBoolean } from 'firebase/remote-config';
import { analytics, db, storage, remoteConfig } from '../firebase';
import {
  ChatMessage,
  Language,
  ServiceRequest,
  UserProfile,
  UserRole,
  translations
} from '../types';
import { SideMenu } from './SideMenu';
import { MapView } from './MapView';
import { getTechnicianBadge } from '../utils/badgeUtils';
import { useRemoteConfig } from '../utils/remoteConfigService';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onSettings: () => void;
  onProfile: () => void;
  onOnboarding: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onRequestDetails: (request: ServiceRequest) => void;
  lang: Language;
}

const SERVICE_OPTIONS = ['PLUMBER', 'ELECTRICIAN', 'AC_REPAIR', 'PAINTER', 'CARPENTER', 'MASON'] as const;

const toIsoDate = (raw: any): string => {
  if (!raw) {
    return new Date().toISOString();
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (raw?.toDate) {
    return raw.toDate().toISOString();
  }
  return new Date().toISOString();
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onLogout,
  onSettings,
  onProfile,
  onOnboarding,
  onUpdateProfile,
  onRequestDetails,
  lang
}) => {
  const t = translations[lang] || translations.AR;
  const { browseSortDefault } = useRemoteConfig();
  const isArabic = lang === 'AR';

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [activeListTab, setActiveListTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [clientViewMode, setClientViewMode] = useState<'REQUESTS' | 'BROWSE'>('REQUESTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [showMap, setShowMap] = useState(false);

  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showActiveChats, setShowActiveChats] = useState(false);
  const [selectedTech, setSelectedTech] = useState<UserProfile | null>(null);
  const [newJobNotify, setNewJobNotify] = useState<ServiceRequest | null>(null);

  const [isOnlineStatus, setIsOnlineStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);

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
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOtherUser, setChatOtherUser] = useState<UserProfile | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendMessageError, setSendMessageError] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [quoteModalRequestId, setQuoteModalRequestId] = useState<string | null>(null);
  const [estimatedQuote, setEstimatedQuote] = useState('');
  const [counterRequestId, setCounterRequestId] = useState<string | null>(null);
  const [counterQuote, setCounterQuote] = useState('');

  const [promoEnabled, setPromoEnabled] = useState(false);
  const initialLoadRef = useRef(true);

  const handleProfileUpdate = async (field: keyof UserProfile, uri: string) => {
    if (user.id === 'mock_guest') {
      Alert.alert('Mock mode', 'File upload simulated');
      onUpdateProfile({ ...user, [field]: uri });
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `tech_docs/${user.id}/${String(field)}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { [field]: url });
      onUpdateProfile({ ...user, [field]: url });
      Alert.alert('', t.uploadSuccess);
    } catch {
      Alert.alert('', lang === 'AR' ? 'فشل الرفع. يرجى المحاولة مجدداً.' : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryLabel = useCallback(
    (category: string) => {
      const key = category.toLowerCase() as keyof typeof t;
      const translated = t[key];
      return typeof translated === 'string' ? translated : category;
    },
    [t]
  );

  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setIsOnlineStatus(Boolean(state.isConnected));
    });
    return () => sub();
  }, []);

  useEffect(() => {
    const loadPromo = async () => {
      try {
        await fetchAndActivate(remoteConfig);
        setPromoEnabled(getBoolean(remoteConfig, 'ramadan_promo_enabled'));
      } catch {
        setPromoEnabled(false);
      }
    };
    void loadPromo();
  }, []);

  useEffect(() => {
    if (user.role !== UserRole.CLIENT) {
      return;
    }

    if (user.id === 'mock_guest') {
      setTechnicians([
        {
          id: 'mock_t1',
          fullName: 'علاء الدين (Aladdin)',
          email: 'aladdin@bricola.tn',
          role: UserRole.TECHNICIAN,
          status: 'APPROVED',
          location: 'تطاوين المدينة',
          skills: [t.plumber],
          specializations: [t.plumber],
          ratingAvg: 4.8,
          ratingCount: 28,
          isOnline: true,
          galleryUrls: ['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400']
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
          ratingAvg: 4.5,
          ratingCount: 12,
          isOnline: false,
          galleryUrls: ['https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400']
        }
      ]);
      return;
    }

    const qTech = query(
      collection(db, 'users'),
      where('role', '==', UserRole.TECHNICIAN),
      where('status', '==', 'APPROVED')
    );
    const unsubscribe = onSnapshot(qTech, snapshot => {
      const all = snapshot.docs.map(s => ({ id: s.id, ...s.data() } as UserProfile));
      setTechnicians(all);
    });
    return () => unsubscribe();
  }, [t.carpenter, t.plumber, user.id, user.role]);

  useEffect(() => {
    if (user.id === 'mock_guest') {
      if (requests.length > 0) {
        return;
      }
      const seeded: ServiceRequest[] = [
        {
          id: 'mock_urgent_1',
          clientId: 'client_1',
          clientName: 'كمال الماجري',
          serviceType: 'PLUMBER',
          description: 'انفجار أنبوب مياه في المطبخ.',
          urgency: 'HIGH',
          location: 'وسط الجهة، تطاوين',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          coordinates: { lat: 32.93, lng: 10.45 }
        },
        {
          id: 'mock_med_1',
          clientId: 'client_3',
          clientName: 'علي بن عيسى',
          serviceType: 'AC_REPAIR',
          description: 'المكيف يحتاج صيانة.',
          urgency: 'MEDIUM',
          location: 'البئر الأحمر، تطاوين',
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          coordinates: { lat: 32.95, lng: 10.48 }
        }
      ];
      setRequests(user.role === UserRole.TECHNICIAN ? seeded : []);
      return;
    }

    initialLoadRef.current = true;

    const qReq =
      user.role === UserRole.CLIENT
        ? query(collection(db, 'requests'), where('clientId', '==', user.id))
        : query(collection(db, 'requests'));

    const unsubscribe = onSnapshot(qReq, snapshot => {
      if (user.role === UserRole.TECHNICIAN && !initialLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type !== 'added') {
            return;
          }
          const incoming = { id: change.doc.id, ...change.doc.data() } as ServiceRequest;
          const isNewJob = incoming.status === 'PENDING' && incoming.clientId !== user.id;
          const isNewInquiry = incoming.status === 'INQUIRY' && incoming.assignedTechId === user.id;
          if (isNewJob || isNewInquiry) {
            setNewJobNotify(incoming);
            setTimeout(() => setNewJobNotify(null), 7000);
          }
        });
      }
      initialLoadRef.current = false;

      let rows = snapshot.docs.map(s => ({
        id: s.id,
        ...(s.data() as Omit<ServiceRequest, 'id'>),
        createdAt: toIsoDate((s.data() as any).createdAt)
      })) as ServiceRequest[];

      if (user.role === UserRole.TECHNICIAN) {
        rows = rows.filter(req => {
          const isMine = req.assignedTechId === user.id;
          const isAvailable = req.status === 'PENDING' && Boolean(user.isOnline);
          const skillMatch = (user.skills || []).includes(req.serviceType);
          return isMine || (isAvailable && skillMatch);
        });
      }

      setRequests(rows);
    });

    return () => unsubscribe();
  }, [requests.length, user.id, user.isOnline, user.role, user.skills]);

  useEffect(() => {
    if (!openChatId) {
      setChatMessages([]);
      setChatOtherUser(null);
      return;
    }

    const req = requests.find(r => r.id === openChatId);
    const otherId =
      user.role === UserRole.CLIENT
        ? req?.assignedTechId
        : req?.clientId;

    if (otherId && otherId !== 'mock_guest') {
      void getDoc(doc(db, 'users', otherId)).then(snap => {
        if (snap.exists()) {
          setChatOtherUser({ ...(snap.data() as UserProfile), id: snap.id });
        }
      });
    } else if (req) {
      setChatOtherUser({
        id: otherId || 'chat_peer',
        role: user.role === UserRole.CLIENT ? UserRole.TECHNICIAN : UserRole.CLIENT,
        email: '',
        fullName: user.role === UserRole.CLIENT ? req.assignedTechName || 'Technician' : req.clientName
      });
    }

    const qMsg = query(
      collection(db, 'requests', openChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(qMsg, snap => {
      const msgs = snap.docs.map(s => ({ id: s.id, ...(s.data() as Omit<ChatMessage, 'id'>), timestamp: toIsoDate((s.data() as any).timestamp) }));
      setChatMessages(msgs);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsubscribe();
  }, [openChatId, requests, user.role]);

  const sortedTechnicians = useMemo(() => {
    if (browseSortDefault === 'proximity') {
      return [...technicians].sort((a, b) => {
        if (a.isOnline && !b.isOnline) {
          return -1;
        }
        if (!a.isOnline && b.isOnline) {
          return 1;
        }
        return (a.fullName || '').localeCompare(b.fullName || '');
      });
    }
    return [...technicians].sort((a, b) => {
      const d = (b.ratingAvg || 0) - (a.ratingAvg || 0);
      if (d !== 0) {
        return d;
      }
      return (b.ratingCount || 0) - (a.ratingCount || 0);
    });
  }, [browseSortDefault, technicians]);

  const urgencyRank = useMemo(() => ({ HIGH: 3, MEDIUM: 2, LOW: 1, undefined: 0 }), []);
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const ua = urgencyRank[a.urgency || 'LOW'];
        const ub = urgencyRank[b.urgency || 'LOW'];
        if (ub !== ua) {
          return ub - ua;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [requests, urgencyRank]
  );

  const activeJobs = useMemo(
    () => sortedRequests.filter(r => (r.status !== 'COMPLETED' || r.paymentConfirmed === false) && (user.role === UserRole.CLIENT || Boolean(user.isOnline) || r.assignedTechId === user.id)),
    [sortedRequests, user.id, user.isOnline, user.role]
  );
  const historyJobs = useMemo(() => sortedRequests.filter(r => r.status === 'COMPLETED' && r.paymentConfirmed !== false), [sortedRequests]);
  const displayList = activeListTab === 'ACTIVE' ? activeJobs : historyJobs;

  const visibleList = useMemo(
    () => displayList.filter(r => techFilter === 'ALL' || r.serviceType === techFilter),
    [displayList, techFilter]
  );

  const openChatCandidates = useMemo(
    () =>
      requests.filter(
        r =>
          r.clientId === user.id ||
          r.assignedTechId === user.id ||
          (r.status === 'INQUIRY' && (r.assignedTechId === user.id || r.clientId === user.id))
      ),
    [requests, user.id]
  );

  const getCurrentLocation = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setCurrentCoords(nextCoords);
    setRequestDetails(prev => ({
      ...prev,
      location: isArabic
        ? `موقعي الحالي (${nextCoords.lat.toFixed(3)}, ${nextCoords.lng.toFixed(3)})`
        : `My current location (${nextCoords.lat.toFixed(3)}, ${nextCoords.lng.toFixed(3)})`
    }));
  }, [isArabic]);

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
    setCurrentCoords(null);
    setShowRequestForm(true);
    try {
      await getCurrentLocation();
    } catch {
      // Location is optional.
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
      allowsMultipleSelection: false
    });
    if (result.canceled) {
      return;
    }
    const first = result.assets[0];
    const value = first.base64 ? `data:image/jpeg;base64,${first.base64}` : first.uri;
    setRequestDetails(prev => ({ ...prev, photos: [...prev.photos, value] }));
  };

  const submitCreateRequest = async () => {
    const pending = requests.filter(r => r.clientId === user.id && (r.status === 'PENDING' || r.status === 'INQUIRY'));
    if (pending.length >= 2) {
      Alert.alert(
        isArabic ? 'حدّ الطلبات' : 'Request limit',
        isArabic ? 'لا يمكنك إضافة أكثر من طلبين قيد المعالجة.' : 'You cannot have more than 2 pending requests.'
      );
      return;
    }
    if (!requestDetails.description.trim()) {
      Alert.alert(isArabic ? 'وصف مطلوب' : 'Description required');
      return;
    }

    setIsSubmitting(true);
    analytics.then(a => a && logEvent(a, 'create_request_start', { service: requestDetails.serviceType }));

    try {
      if (user.id === 'mock_guest') {
        const mockReq: ServiceRequest = {
          id: `mock_${Date.now()}`,
          clientId: user.id,
          clientName: user.fullName,
          serviceType: requestDetails.serviceType,
          description: requestDetails.description,
          urgency: requestDetails.urgency,
          location: requestDetails.location || 'Tataouine, Tunisia',
          coordinates:
            currentCoords || {
              lat: 32.9297 + (Math.random() - 0.5) * 0.1,
              lng: 10.4518 + (Math.random() - 0.5) * 0.1
            },
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          budget: requestDetails.budget,
          preferredTime: requestDetails.preferredTime,
          photos: requestDetails.photos,
          clientRating: user.ratingAvg || 0
        };
        setRequests(prev => [mockReq, ...prev]);
      } else {
        await addDoc(collection(db, 'requests'), {
          clientId: user.id,
          clientName: user.fullName,
          serviceType: requestDetails.serviceType,
          description: requestDetails.description,
          urgency: requestDetails.urgency,
          location: requestDetails.location || 'Tataouine, Tunisia',
          coordinates: currentCoords,
          status: 'PENDING',
          createdAt: serverTimestamp(),
          budget: requestDetails.budget,
          preferredTime: requestDetails.preferredTime,
          photos: requestDetails.photos,
          clientRating: user.ratingAvg || 0
        });
      }

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
      analytics.then(a => a && logEvent(a, 'create_request_success', { service: requestDetails.serviceType }));
      Alert.alert(isArabic ? 'تم' : 'Success', isArabic ? 'تم إرسال الطلب بنجاح' : 'Request sent successfully');
    } catch {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'تعذر إنشاء الطلب' : 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!openChatId || !newMessageText.trim()) {
      return;
    }
    setIsSendingMessage(true);
    setSendMessageError(null);
    try {
      await addDoc(collection(db, 'requests', openChatId, 'messages'), {
        senderId: user.id,
        senderName: user.fullName,
        text: newMessageText,
        timestamp: serverTimestamp()
      });
      setNewMessageText('');
    } catch {
      setSendMessageError(t.errorSendingMessage);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSubmitRating = async (requestId: string, ratingValue: number) => {
    setRatingLoading(requestId);
    try {
      const reqRef = doc(db, 'requests', requestId);
      if (user.id !== 'mock_guest') {
        const reqSnap = await getDoc(reqRef);
        const reqData = reqSnap.data() as ServiceRequest | undefined;
        if (reqData?.assignedTechId) {
          const techRef = doc(db, 'users', reqData.assignedTechId);
          const techSnap = await getDoc(techRef);
          if (techSnap.exists()) {
            const current = techSnap.data() as UserProfile;
            const oldCount = current.ratingCount || 0;
            const oldAvg = current.ratingAvg || 0;
            const newCount = oldCount + 1;
            const newAvg = Number(((oldAvg * oldCount + ratingValue) / newCount).toFixed(1));
            await updateDoc(techRef, { ratingAvg: newAvg, ratingCount: newCount });
          }
        }
        await updateDoc(reqRef, { rating: ratingValue });
      } else {
        setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, rating: ratingValue } : r)));
      }
    } catch {
      Alert.alert(isArabic ? 'تعذر حفظ التقييم' : 'Failed to save rating');
    } finally {
      setRatingLoading(null);
    }
  };

  const toggleOnlineStatus = async () => {
    const next = !Boolean(user.isOnline);
    if (user.id === 'mock_guest') {
      onUpdateProfile({ ...user, isOnline: next });
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { isOnline: next });
      onUpdateProfile({ ...user, isOnline: next });
    } catch {
      Alert.alert(isArabic ? 'تعذر تحديث الحالة' : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAcceptJob = async (requestId: string) => {
    const payload: Partial<ServiceRequest> = {
      status: 'ACCEPTED',
      assignedTechId: user.id,
      assignedTechName: user.fullName,
      quote: estimatedQuote || undefined,
      quoteStatus: estimatedQuote ? 'PROPOSED' : undefined
    };

    try {
      if (user.id === 'mock_guest') {
        setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, ...payload } : r)));
      } else {
        await updateDoc(doc(db, 'requests', requestId), payload);
      }
      setQuoteModalRequestId(null);
      setEstimatedQuote('');
    } catch {
      Alert.alert(isArabic ? 'تعذر قبول المهمة' : 'Failed to accept job');
    }
  };

  const handleUpdateJobStatus = async (requestId: string, status: ServiceRequest['status']) => {
    try {
      if (user.id === 'mock_guest') {
        setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status } : r)));
      } else {
        await updateDoc(doc(db, 'requests', requestId), { status });
      }
    } catch {
      Alert.alert(t.errorCompletingJob);
    }
  };

  const handleCompleteJob = async (requestId: string) => {
    if (user.id === 'mock_guest') {
      setRequests(prev => prev.map(r => (r.id === requestId ? { ...r, status: 'COMPLETED' } : r)));
      Alert.alert('', isArabic ? 'تم إكمال المهمة بنجاح!' : 'Job completed successfully!');
      return;
    }
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, { status: 'COMPLETED' });
      Alert.alert('', isArabic ? 'تم إكمال المهمة بنجاح!' : 'Job completed successfully!');
    } catch {
      Alert.alert(t.errorCompletingJob);
    }
  };

  const handleInitiateChat = async (tech: UserProfile) => {
    const existing = requests.find(
      r =>
        r.assignedTechId === tech.id &&
        r.clientId === user.id &&
        (r.status === 'INQUIRY' || r.status === 'PENDING' || r.status === 'ACCEPTED')
    );
    if (existing) {
      setOpenChatId(existing.id);
      setSelectedTech(null);
      return;
    }

    const pending = requests.filter(r => r.clientId === user.id && (r.status === 'PENDING' || r.status === 'INQUIRY'));
    if (pending.length >= 2) {
      Alert.alert(
        isArabic ? 'حدّ الطلبات' : 'Request limit',
        isArabic
          ? 'لديك بالفعل طلبان قيد المعالجة.'
          : 'You already have 2 pending requests.'
      );
      return;
    }

    try {
      if (user.id === 'mock_guest') {
        const req: ServiceRequest = {
          id: `inquiry_${Date.now()}`,
          clientId: user.id,
          clientName: user.fullName,
          serviceType: tech.skills?.[0] || 'Service',
          description: isArabic ? 'استفسار من الحريف' : 'Inquiry from client',
          location: user.location || 'Tunisia',
          status: 'INQUIRY',
          assignedTechId: tech.id,
          createdAt: new Date().toISOString()
        };
        setRequests(prev => [req, ...prev]);
        setOpenChatId(req.id);
      } else {
        const ref = await addDoc(collection(db, 'requests'), {
          clientId: user.id,
          clientName: user.fullName,
          serviceType: tech.skills?.[0] || 'Service',
          description: isArabic ? 'استفسار من الحريف' : 'Inquiry from client',
          location: user.location || 'Tunisia',
          status: 'INQUIRY',
          assignedTechId: tech.id,
          createdAt: serverTimestamp()
        });
        setOpenChatId(ref.id);
      }
      setSelectedTech(null);
    } catch {
      Alert.alert(t.errorStartingChat);
    }
  };

  const filteredTechnicians = sortedTechnicians.filter(tech => {
    const haystack = `${tech.fullName} ${(tech.skills || []).join(' ')} ${(tech.specializations || []).join(' ')} ${tech.id}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <SideMenu
        user={user}
        lang={lang}
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        onNavigate={view => {
          if (view === 'PROFILE') {
            onProfile();
          }
          if (view === 'SETTINGS') {
            onSettings();
          }
        }}
        onLogout={onLogout}
        onOpenChat={() => setShowActiveChats(true)}
      />

      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => setIsSideMenuOpen(true)}>
          <Text style={styles.iconBtnText}>☰</Text>
        </Pressable>
        <View style={styles.centerHead}>
          <Text style={styles.appName}>BRICOLA</Text>
          <Text style={styles.statusText}>{isOnlineStatus ? (isArabic ? 'متصل' : 'Online') : isArabic ? 'غير متصل' : 'Offline'}</Text>
        </View>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeName}>{user.fullName.split(' ')[0]}</Text>
        </View>
      </View>

      {user.onboardingComplete !== true ? (
        <View style={styles.incompleteBanner}>
          <Text style={styles.incompleteText}>{t.incompleteProfile}</Text>
          <Pressable style={styles.bannerBtn} onPress={onOnboarding}>
            <Text style={styles.bannerBtnText}>{t.finishSetup}</Text>
          </Pressable>
        </View>
      ) : null}

      {newJobNotify ? (
        <View style={styles.notifyCard}>
          <Text style={styles.notifyTitle}>{newJobNotify.status === 'INQUIRY' ? (isArabic ? 'استفسار جديد' : 'New inquiry') : isArabic ? 'طلب جديد' : 'New job'}</Text>
          <Text style={styles.notifyBody}>{newJobNotify.serviceType} - {newJobNotify.clientName}</Text>
          <Pressable
            onPress={() => {
              onRequestDetails(newJobNotify);
              setNewJobNotify(null);
            }}
          >
            <Text style={styles.notifyAction}>{isArabic ? 'فتح' : 'Open'}</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(user.notifications || []).slice(-1).map(notif => (
          <View key={notif.id} style={styles.notifRow}>
            <Text style={styles.notifTitle}>🔔 {notif.title}</Text>
            <Text style={styles.notifBody}>{notif.body}</Text>
          </View>
        ))}

        {user.role === UserRole.CLIENT ? (
          <>
            {promoEnabled ? (
              <View style={styles.promoCard}>
                <Text style={styles.promoTitle}>{isArabic ? 'عرض رمضان' : 'Ramadan Special'}</Text>
                <Text style={styles.promoText}>{isArabic ? 'خصم 30% على الصيانة' : '30% off on maintenance'}</Text>
              </View>
            ) : null}

            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, clientViewMode === 'REQUESTS' && styles.toggleBtnActive]}
                onPress={() => setClientViewMode('REQUESTS')}
              >
                <Text style={[styles.toggleText, clientViewMode === 'REQUESTS' && styles.toggleTextActive]}>{isArabic ? 'طلباتي' : 'My Requests'}</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, clientViewMode === 'BROWSE' && styles.toggleBtnActive]}
                onPress={() => setClientViewMode('BROWSE')}
              >
                <Text style={[styles.toggleText, clientViewMode === 'BROWSE' && styles.toggleTextActive]}>{isArabic ? 'تصفح الفنيين' : 'Browse Pros'}</Text>
              </Pressable>
            </View>

            {clientViewMode === 'BROWSE' ? (
              <>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholder={isArabic ? 'ابحث بالاسم أو المهنة' : 'Search by name or skill'}
                  textAlign={isArabic ? 'right' : 'left'}
                />

                {filteredTechnicians.map(tech => {
                  const badge = getTechnicianBadge(tech);
                  return (
                    <Pressable key={tech.id} style={styles.techCard} onPress={() => setSelectedTech(tech)}>
                      <View style={styles.techTop}>
                        <View>
                          <Text style={styles.techName}>{tech.fullName}</Text>
                          <Text style={styles.techMeta}>📍 {tech.location || 'Tunisia'}</Text>
                        </View>
                        <Text style={styles.techRate}>⭐ {(tech.ratingAvg || 0).toFixed(1)}</Text>
                      </View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badgePill, { backgroundColor: badge.bgColor }]}>
                          <Text style={[styles.badgeText, { color: badge.color }]}>
                            {isArabic ? badge.label.AR : badge.label.EN}
                          </Text>
                        </View>
                        <Pressable style={styles.smallAction} onPress={() => void handleInitiateChat(tech)}>
                          <Text style={styles.smallActionText}>{isArabic ? 'محادثة' : 'Chat'}</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : (
              <>
                <View style={styles.servicesGrid}>
                  {SERVICE_OPTIONS.map(service => (
                    <Pressable key={service} style={styles.serviceChip} onPress={() => void initiateCreateRequest(service)}>
                      <Text style={styles.serviceChipText}>{getCategoryLabel(service)}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.toggleRow}>
                  <Pressable
                    style={[styles.toggleBtn, activeListTab === 'ACTIVE' && styles.toggleBtnActive]}
                    onPress={() => setActiveListTab('ACTIVE')}
                  >
                    <Text style={[styles.toggleText, activeListTab === 'ACTIVE' && styles.toggleTextActive]}>{t.activeRequests} ({activeJobs.length})</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleBtn, activeListTab === 'HISTORY' && styles.toggleBtnActive]}
                    onPress={() => setActiveListTab('HISTORY')}
                  >
                    <Text style={[styles.toggleText, activeListTab === 'HISTORY' && styles.toggleTextActive]}>{t.history} ({historyJobs.length})</Text>
                  </Pressable>
                </View>

                {displayList.map(req => (
                  <Pressable key={req.id} style={styles.requestCard} onPress={() => onRequestDetails(req)}>
                    <View style={styles.reqHead}>
                      <Text style={styles.reqTitle}>{getCategoryLabel(req.serviceType)}</Text>
                      <Text style={styles.reqStatus}>{req.status}</Text>
                    </View>
                    <Text style={styles.reqMeta}>#{req.id.slice(-4).toUpperCase()} • {new Date(req.createdAt).toLocaleDateString()}</Text>
                    <Text style={styles.reqMeta}>{req.location}</Text>
                    {req.description ? <Text style={styles.reqDesc}>{req.description}</Text> : null}

                    {req.quote && req.quoteStatus ? (
                      <View style={styles.quoteBox}>
                        <Text style={styles.quoteBoxTitle}>{isArabic ? 'عرض السعر' : 'Quote'}</Text>
                        <Text style={styles.quoteBoxValue}>{req.quote} DT ({req.quoteStatus})</Text>
                      </View>
                    ) : null}

                    {req.status === 'ACCEPTED' && req.quoteStatus === 'PROPOSED' ? (
                      <View style={styles.rowActions}>
                        <Pressable
                          style={styles.primaryAction}
                          onPress={async () => {
                            if (user.id === 'mock_guest') {
                              setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, quoteStatus: 'ACCEPTED' } : r)));
                              return;
                            }
                            await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'ACCEPTED' });
                          }}
                        >
                          <Text style={styles.primaryActionText}>{isArabic ? 'قبول' : 'Accept'}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.ghostAction}
                          onPress={() => {
                            setCounterRequestId(req.id);
                            setCounterQuote(req.counterQuote || '');
                          }}
                        >
                          <Text style={styles.ghostActionText}>{isArabic ? 'تفاوض' : 'Counter'}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.dangerAction}
                          onPress={async () => {
                            if (user.id === 'mock_guest') {
                              setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, quoteStatus: 'REJECTED' } : r)));
                              return;
                            }
                            await updateDoc(doc(db, 'requests', req.id), { quoteStatus: 'REJECTED' });
                          }}
                        >
                          <Text style={styles.dangerActionText}>{isArabic ? 'رفض' : 'Reject'}</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {activeListTab === 'ACTIVE' && (req.status === 'ACCEPTED' || req.status === 'INQUIRY') ? (
                      <Pressable style={styles.chatBtn} onPress={() => setOpenChatId(req.id)}>
                        <Text style={styles.chatBtnText}>{isArabic ? 'فتح المحادثة' : 'Open Chat'}</Text>
                      </Pressable>
                    ) : null}

                    {activeListTab === 'HISTORY' && !req.rating ? (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Pressable key={star} onPress={() => void handleSubmitRating(req.id, star)} disabled={ratingLoading === req.id}>
                            <Text style={styles.star}>{star <= (req.rating || 0) ? '⭐' : '☆'}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {user.status === 'PENDING' ? (
              <View style={styles.statusCardPending}>
                <Text style={styles.statusTitle}>{t.accountPending}</Text>
                <Text style={styles.statusDesc}>{t.accountPendingDesc}</Text>
              </View>
            ) : null}
            {user.status === 'REJECTED' ? (
              <View style={styles.statusCardRejected}>
                <Text style={styles.statusTitle}>{t.accountRejected}</Text>
                <Text style={styles.statusDesc}>{t.accountRejectedDesc}</Text>
              </View>
            ) : null}

            {user.status === 'APPROVED' ? (
              <>
                <View style={styles.onlineCard}>
                  <View>
                    <Text style={styles.onlineTitle}>{Boolean(user.isOnline) ? t.online : t.offline}</Text>
                    <Text style={styles.onlineDesc}>
                      {Boolean(user.isOnline)
                        ? t.accountApprovedDesc
                        : isArabic
                        ? 'قم بالتفعيل لبدء استقبال الطلبات.'
                        : 'Activate to receive requests.'}
                    </Text>
                  </View>
                  <Switch value={Boolean(user.isOnline)} onValueChange={() => void toggleOnlineStatus()} disabled={isUpdatingStatus} />
                </View>

                <View style={styles.toggleRow}>
                  <Pressable style={[styles.toggleBtn, activeListTab === 'ACTIVE' && styles.toggleBtnActive]} onPress={() => setActiveListTab('ACTIVE')}>
                    <Text style={[styles.toggleText, activeListTab === 'ACTIVE' && styles.toggleTextActive]}>{t.activeRequests} ({activeJobs.length})</Text>
                  </Pressable>
                  <Pressable style={[styles.toggleBtn, activeListTab === 'HISTORY' && styles.toggleBtnActive]} onPress={() => setActiveListTab('HISTORY')}>
                    <Text style={[styles.toggleText, activeListTab === 'HISTORY' && styles.toggleTextActive]}>{t.history} ({historyJobs.length})</Text>
                  </Pressable>
                </View>

                {activeListTab === 'ACTIVE' ? (
                  <View style={styles.techFilterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.techFilterScroll}>
                      <Pressable style={[styles.techFilterChip, techFilter === 'ALL' && styles.techFilterChipActive]} onPress={() => setTechFilter('ALL')}>
                        <Text style={[styles.techFilterText, techFilter === 'ALL' && styles.techFilterTextActive]}>{isArabic ? 'الكل' : 'All'}</Text>
                      </Pressable>
                      {SERVICE_OPTIONS.slice(0, 4).map(opt => (
                        <Pressable key={opt} style={[styles.techFilterChip, techFilter === opt && styles.techFilterChipActive]} onPress={() => setTechFilter(opt)}>
                          <Text style={[styles.techFilterText, techFilter === opt && styles.techFilterTextActive]}>{getCategoryLabel(opt)}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Pressable style={styles.mapToggle} onPress={() => setShowMap(prev => !prev)}>
                      <Text style={styles.mapToggleText}>{showMap ? '📋' : '📍'}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {showMap && activeListTab === 'ACTIVE' ? (
                  <MapView
                    requests={visibleList}
                    onSelectRequest={req => {
                      setShowMap(false);
                      onRequestDetails(req);
                    }}
                    lang={lang}
                  />
                ) : (
                  visibleList.map(req => (
                    <Pressable key={req.id} style={styles.requestCard} onPress={() => onRequestDetails(req)}>
                      <View style={styles.reqHead}>
                        <Text style={styles.reqTitle}>{getCategoryLabel(req.serviceType)}</Text>
                        <Text style={styles.reqStatus}>{req.status}</Text>
                      </View>
                      <Text style={styles.reqMeta}>{req.clientName} • {req.location}</Text>
                      {req.description ? <Text style={styles.reqDesc}>{req.description}</Text> : null}

                      {req.status === 'PENDING' || req.status === 'INQUIRY' ? (
                        <Pressable
                          style={styles.primaryAction}
                          onPress={() => {
                            setQuoteModalRequestId(req.id);
                            setEstimatedQuote(req.quote || '');
                          }}
                        >
                          <Text style={styles.primaryActionText}>{isArabic ? 'قبول وإرسال عرض' : 'Accept & Send Quote'}</Text>
                        </Pressable>
                      ) : null}

                      {req.assignedTechId === user.id ? (
                        <View style={styles.rowActions}>
                          <Pressable style={styles.chatBtn} onPress={() => setOpenChatId(req.id)}>
                            <Text style={styles.chatBtnText}>{isArabic ? 'محادثة' : 'Chat'}</Text>
                          </Pressable>
                          <Pressable style={styles.doneBtn} onPress={() => void handleUpdateJobStatus(req.id, 'COMPLETED')}>
                            <Text style={styles.doneBtnText}>{isArabic ? 'إتمام' : 'Done'}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={showRequestForm} animationType="slide" transparent onRequestClose={() => setShowRequestForm(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{isArabic ? 'طلب خدمة' : 'Service Request'}: {getCategoryLabel(requestDetails.serviceType || 'service')}</Text>

              <TextInput
                style={styles.input}
                value={requestDetails.description}
                onChangeText={value => setRequestDetails(prev => ({ ...prev, description: value }))}
                placeholder={isArabic ? 'اشرح المشكلة بالتفصيل' : 'Describe the issue'}
                multiline
                textAlign={isArabic ? 'right' : 'left'}
              />

              <View style={styles.urgencyRow}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => (
                  <Pressable
                    key={level}
                    style={[styles.urgencyChip, requestDetails.urgency === level && styles.urgencyChipActive]}
                    onPress={() => setRequestDetails(prev => ({ ...prev, urgency: level }))}
                  >
                    <Text style={[styles.urgencyChipText, requestDetails.urgency === level && styles.urgencyChipTextActive]}>{level}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={requestDetails.location}
                onChangeText={value => setRequestDetails(prev => ({ ...prev, location: value }))}
                placeholder={isArabic ? 'الموقع' : 'Location'}
                textAlign={isArabic ? 'right' : 'left'}
              />

              <View style={styles.rowActions}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  value={requestDetails.budget}
                  onChangeText={value => setRequestDetails(prev => ({ ...prev, budget: value }))}
                  placeholder={isArabic ? 'الميزانية' : 'Budget'}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  value={requestDetails.preferredTime}
                  onChangeText={value => setRequestDetails(prev => ({ ...prev, preferredTime: value }))}
                  placeholder={isArabic ? 'الوقت المفضل' : 'Preferred time'}
                />
              </View>

              <View style={styles.rowActions}>
                <Pressable style={styles.ghostAction} onPress={() => void pickPhoto()}>
                  <Text style={styles.ghostActionText}>{isArabic ? 'إضافة صورة' : 'Add Photo'}</Text>
                </Pressable>
                <Pressable style={styles.ghostAction} onPress={() => void getCurrentLocation()}>
                  <Text style={styles.ghostActionText}>{isArabic ? 'تحديث الموقع' : 'Refresh location'}</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {requestDetails.photos.map((photo, idx) => (
                  <View key={`${photo}_${idx}`} style={styles.photoWrap}>
                    <Image source={{ uri: photo }} style={styles.photo} />
                    <Pressable
                      style={styles.photoRemove}
                      onPress={() =>
                        setRequestDetails(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))
                      }
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>

              <Pressable style={styles.primaryAction} onPress={() => void submitCreateRequest()} disabled={isSubmitting}>
                <Text style={styles.primaryActionText}>{isSubmitting ? '...' : isArabic ? 'تأكيد الطلب' : 'Confirm Request'}</Text>
              </Pressable>

              <Pressable style={styles.ghostAction} onPress={() => setShowRequestForm(false)}>
                <Text style={styles.ghostActionText}>{isArabic ? 'إغلاق' : 'Close'}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={Boolean(openChatId)} animationType="slide" transparent onRequestClose={() => setOpenChatId(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatModalCard}>
            <View style={styles.chatHeader}>
              <Pressable style={styles.iconBtn} onPress={() => setOpenChatId(null)}>
                <Text style={styles.iconBtnText}>✕</Text>
              </Pressable>
              <View>
                <Text style={styles.chatTitle}>{isArabic ? 'المحادثة' : 'Live Chat'}</Text>
                <Text style={styles.chatPeer}>{chatOtherUser?.fullName || '...'}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView ref={chatScrollRef} contentContainerStyle={styles.chatMessagesWrap}>
              {chatMessages.length === 0 ? (
                <Text style={styles.emptyText}>{isArabic ? 'ابدأ المحادثة الآن' : 'Start chatting now'}</Text>
              ) : (
                chatMessages.map(msg => (
                  <View key={msg.id} style={[styles.messageBubble, msg.senderId === user.id ? styles.myMsg : styles.otherMsg]}>
                    <Text style={[styles.messageText, msg.senderId === user.id ? styles.myMsgText : styles.otherMsgText]}>{msg.text}</Text>
                    <Text style={styles.messageTime}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {sendMessageError ? (
              <Text style={styles.sendErrorText}>{sendMessageError}</Text>
            ) : null}

            <View style={styles.chatInputRow}>
              <TextInput
                value={newMessageText}
                onChangeText={setNewMessageText}
                style={styles.chatInput}
                placeholder={isArabic ? 'اكتب رسالة...' : 'Type message...'}
                textAlign={isArabic ? 'right' : 'left'}
                onSubmitEditing={() => void handleSendMessage()}
                returnKeyType="send"
              />
              <Pressable style={styles.chatSend} onPress={() => void handleSendMessage()} disabled={isSendingMessage || !newMessageText.trim()}>
                <Text style={styles.chatSendText}>{isSendingMessage ? '...' : '➤'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showActiveChats} transparent animationType="fade" onRequestClose={() => setShowActiveChats(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.simpleModal}>
            <Text style={styles.simpleModalTitle}>{isArabic ? 'المحادثات' : 'Recent Chats'}</Text>
            <ScrollView>
              {openChatCandidates.map(req => (
                <Pressable
                  key={req.id}
                  style={styles.simpleModalItem}
                  onPress={() => {
                    setOpenChatId(req.id);
                    setShowActiveChats(false);
                  }}
                >
                  <Text style={styles.simpleModalItemTitle}>{req.serviceType}</Text>
                  <Text style={styles.simpleModalItemMeta}>{req.status}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.ghostAction} onPress={() => setShowActiveChats(false)}>
              <Text style={styles.ghostActionText}>{isArabic ? 'إغلاق' : 'Close'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(quoteModalRequestId)} transparent animationType="slide" onRequestClose={() => setQuoteModalRequestId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.simpleModal}>
            <Text style={styles.simpleModalTitle}>{isArabic ? 'عرض السعر' : 'Estimated Quote'}</Text>
            <TextInput
              style={styles.input}
              value={estimatedQuote}
              onChangeText={setEstimatedQuote}
              placeholder={isArabic ? 'أدخل السعر بالدينار' : 'Enter quote in TND'}
              keyboardType="numeric"
            />
            <View style={styles.rowActions}>
              <Pressable style={styles.ghostAction} onPress={() => setQuoteModalRequestId(null)}>
                <Text style={styles.ghostActionText}>{isArabic ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={styles.primaryAction}
                onPress={() => {
                  if (quoteModalRequestId) {
                    void handleAcceptJob(quoteModalRequestId);
                  }
                }}
              >
                <Text style={styles.primaryActionText}>{isArabic ? 'تأكيد' : 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(counterRequestId)} transparent animationType="slide" onRequestClose={() => setCounterRequestId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.simpleModal}>
            <Text style={styles.simpleModalTitle}>{isArabic ? 'عرض مقابل' : 'Counter Offer'}</Text>
            <TextInput
              style={styles.input}
              value={counterQuote}
              onChangeText={setCounterQuote}
              placeholder={isArabic ? 'أدخل عرضك المالي' : 'Enter your counter quote'}
              keyboardType="numeric"
            />
            <View style={styles.rowActions}>
              <Pressable style={styles.ghostAction} onPress={() => setCounterRequestId(null)}>
                <Text style={styles.ghostActionText}>{isArabic ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={styles.primaryAction}
                onPress={async () => {
                  if (!counterRequestId || !counterQuote.trim()) {
                    return;
                  }
                  if (user.id === 'mock_guest') {
                    setRequests(prev => prev.map(r => (r.id === counterRequestId ? { ...r, quoteStatus: 'COUNTERED', counterQuote } : r)));
                  } else {
                    await updateDoc(doc(db, 'requests', counterRequestId), { quoteStatus: 'COUNTERED', counterQuote });
                  }
                  setCounterRequestId(null);
                  setCounterQuote('');
                }}
              >
                <Text style={styles.primaryActionText}>{isArabic ? 'إرسال' : 'Send'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedTech)} transparent animationType="slide" onRequestClose={() => setSelectedTech(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            {selectedTech ? (
              <>
                <Text style={styles.techName}>{selectedTech.fullName}</Text>
                <Text style={styles.techMeta}>📍 {selectedTech.location || 'Tunisia'}</Text>
                <Text style={styles.techRate}>⭐ {(selectedTech.ratingAvg || 0).toFixed(1)} ({selectedTech.ratingCount || 0})</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
                  {(selectedTech.galleryUrls || []).map((url, idx) => (
                    <Image key={`${url}_${idx}`} source={{ uri: url }} style={styles.galleryImage} />
                  ))}
                </ScrollView>

                <View style={styles.rowActions}>
                  <Pressable style={styles.chatBtn} onPress={() => void handleInitiateChat(selectedTech)}>
                    <Text style={styles.chatBtnText}>{isArabic ? 'محادثة' : 'Chat'}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={() => {
                      void initiateCreateRequest(selectedTech.skills?.[0] || 'SERVICE');
                      setSelectedTech(null);
                    }}
                  >
                    <Text style={styles.primaryActionText}>{isArabic ? 'اطلب الخدمة' : 'Request Service'}</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.ghostAction} onPress={() => setSelectedTech(null)}>
                  <Text style={styles.ghostActionText}>{isArabic ? 'إغلاق' : 'Close'}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF'
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  iconBtnText: { fontSize: 16, fontWeight: '900', color: '#334155' },
  centerHead: { alignItems: 'center' },
  appName: { color: '#0F172A', fontWeight: '900', fontSize: 14, letterSpacing: 0.8 },
  statusText: { color: '#64748B', fontSize: 10, marginTop: 2 },
  userBadge: {
    minWidth: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  userBadgeName: { fontSize: 11, color: '#EA580C', fontWeight: '800' },
  incompleteBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  incompleteText: { flex: 1, color: '#9A3412', fontSize: 12, fontWeight: '700' },
  bannerBtn: { backgroundColor: '#EA580C', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  bannerBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  notifyCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F97316'
  },
  notifyTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  notifyBody: { color: '#FFEDD5', fontWeight: '700', marginTop: 2 },
  notifyAction: { color: '#FFFFFF', fontWeight: '900', marginTop: 8 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 80 },
  notifRow: { backgroundColor: '#1E293B', borderRadius: 14, padding: 12 },
  notifTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  notifBody: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },
  promoCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#312E81'
  },
  promoTitle: { color: '#C7D2FE', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  promoText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 4,
    gap: 4
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  toggleBtnActive: { backgroundColor: '#FFFFFF' },
  toggleText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  toggleTextActive: { color: '#EA580C' },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: '600'
  },
  techCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10
  },
  techTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  techName: { fontWeight: '900', color: '#0F172A', fontSize: 16 },
  techMeta: { color: '#64748B', fontSize: 11, marginTop: 2 },
  techRate: { color: '#EA580C', fontWeight: '900' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  smallAction: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  smallActionText: { color: '#1D4ED8', fontWeight: '800', fontSize: 11 },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  serviceChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  serviceChipText: { color: '#0F172A', fontWeight: '800', fontSize: 11 },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8
  },
  reqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  reqStatus: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  reqMeta: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  reqDesc: { color: '#334155', fontSize: 12, fontWeight: '500' },
  quoteBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  quoteBoxTitle: { color: '#1D4ED8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  quoteBoxValue: { color: '#1E3A8A', marginTop: 2, fontWeight: '800' },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  primaryAction: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center'
  },
  primaryActionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  ghostAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center'
  },
  ghostActionText: { color: '#334155', fontWeight: '800', fontSize: 12 },
  dangerAction: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center'
  },
  dangerActionText: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  chatBtn: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  chatBtnText: { color: '#1D4ED8', fontWeight: '800' },
  doneBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  doneBtnText: { color: '#FFFFFF', fontWeight: '900' },
  ratingRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  star: { fontSize: 22 },
  statusCardPending: { backgroundColor: '#FEF9C3', borderRadius: 16, padding: 14 },
  statusCardRejected: { backgroundColor: '#FEE2E2', borderRadius: 16, padding: 14 },
  statusTitle: { fontWeight: '900', color: '#0F172A', fontSize: 15 },
  statusDesc: { color: '#334155', marginTop: 4, fontSize: 12 },
  onlineCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  onlineTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  onlineDesc: { color: '#DBEAFE', fontSize: 12, marginTop: 3, maxWidth: 220 },
  techFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  techFilterScroll: { gap: 8 },
  techFilterChip: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  techFilterChipActive: { backgroundColor: '#2563EB' },
  techFilterText: { color: '#475569', fontWeight: '800', fontSize: 11 },
  techFilterTextActive: { color: '#FFFFFF' },
  mapToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapToggleText: { fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden'
  },
  modalContent: { padding: 16, gap: 10, paddingBottom: 24 },
  modalTitle: { fontSize: 18, color: '#0F172A', fontWeight: '900', marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '600'
  },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    paddingVertical: 8
  },
  urgencyChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  urgencyChipText: { color: '#334155', fontWeight: '800', fontSize: 11 },
  urgencyChipTextActive: { color: '#FFFFFF' },
  halfInput: { flex: 1 },
  photoWrap: { marginRight: 8, marginTop: 4 },
  photo: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#E2E8F0' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoRemoveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  chatModalCard: {
    maxHeight: '90%',
    minHeight: '65%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden'
  },
  chatHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chatTitle: { color: '#0F172A', fontWeight: '900' },
  chatPeer: { color: '#64748B', fontSize: 11, marginTop: 2 },
  chatMessagesWrap: { padding: 12, gap: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 36, fontWeight: '700' },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14
  },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  otherMsg: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9' },
  messageText: { fontSize: 13, fontWeight: '500' },
  myMsgText: { color: '#FFFFFF' },
  otherMsgText: { color: '#0F172A' },
  messageTime: { marginTop: 4, color: '#94A3B8', fontSize: 9, fontWeight: '700' },
  chatInputRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  chatSend: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatSendText: { color: '#FFFFFF', fontWeight: '900' },
  sendErrorText: { color: '#DC2626', fontSize: 12, fontWeight: '600', paddingHorizontal: 12, marginBottom: 4 },
  simpleModal: {
    marginHorizontal: 16,
    marginBottom: 20,
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 10
  },
  simpleModalTitle: { color: '#0F172A', fontWeight: '900', fontSize: 16 },
  simpleModalItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  simpleModalItemTitle: { color: '#0F172A', fontWeight: '800' },
  simpleModalItemMeta: { color: '#64748B', marginTop: 2, fontSize: 11 },
  profileModal: {
    marginHorizontal: 16,
    marginBottom: 20,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10
  },
  galleryRow: { marginTop: 4 },
  galleryImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#E2E8F0'
  }
});
