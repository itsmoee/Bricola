import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { arrayUnion, collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  AppNotification,
  Language,
  ServiceRequest,
  TechStatus,
  UserProfile,
  UserRole,
  translations
} from '../types';

interface AdminDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onSettings: () => void;
  lang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onSettings, lang }) => {
  const t = translations[lang] || translations.AR;
  const [activeTab, setActiveTab] = useState<'TECHS' | 'REQUESTS'>('TECHS');
  const [techs, setTechs] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user.id === 'mock_guest') {
      setTechs([
        {
          id: 'tech_1',
          fullName: 'فيصل الرحماني',
          email: 'faycel@mock.tn',
          role: UserRole.TECHNICIAN,
          status: 'PENDING',
          phone: '21698765432',
          location: 'تطاوين المدينة',
          profilePictureUrl: 'https://i.pravatar.cc/150?u=tech1'
        },
        {
          id: 'tech_2',
          fullName: 'سلوى الودرني',
          email: 'salwa@mock.tn',
          role: UserRole.TECHNICIAN,
          status: 'APPROVED',
          isOnline: true,
          phone: '21655123456',
          location: 'غمراسن'
        }
      ]);
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('role', '==', UserRole.TECHNICIAN));
      const unsub = onSnapshot(
        q,
        snap => {
          setTechs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserProfile));
        },
        e => setError(e.message)
      );
      return () => unsub();
    } catch (e: any) {
      setError(e.message || 'Failed to fetch technicians');
    }
  }, []);

  useEffect(() => {
    if (user.id === 'mock_guest') {
      setRequests([
        {
          id: 'req_1',
          clientId: 'c1',
          clientName: 'مبروك',
          serviceType: 'سباك',
          location: 'البئر الأحمر',
          status: 'PENDING',
          createdAt: new Date().toISOString()
        },
        {
          id: 'req_2',
          clientId: 'c2',
          clientName: 'نجية',
          serviceType: 'كهربائي',
          location: 'تطاوين الجنوبية',
          status: 'ACCEPTED',
          assignedTechName: 'فيصل الرحماني',
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    try {
      const q = query(collection(db, 'requests'));
      const unsub = onSnapshot(
        q,
        snap => {
          setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceRequest));
        },
        e => setError(e.message)
      );
      return () => unsub();
    } catch (e: any) {
      setError(e.message || 'Failed to fetch requests');
    }
  }, []);

  const updateTechStatus = async (id: string, newStatus: TechStatus) => {
    if (user.id === 'mock_guest') {
      setTechs(prev => prev.map(tch => (tch.id === id ? { ...tch, status: newStatus } : tch)));
      Alert.alert('Mock', lang === 'AR' ? 'تم تحديث الحالة تجريبياً!' : 'Status updated in mock mode');
      return;
    }

    try {
      const techRef = doc(db, 'users', id);
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: newStatus === 'APPROVED' ? 'تم تفعيل حسابك' : 'تم رفض الحساب',
        body:
          newStatus === 'APPROVED'
            ? 'مبروك! يمكنك الآن استقبال الطلبات.'
            : 'عذراً، لم نتمكن من قبول حسابك. يرجى مراجعة الوثائق.',
        createdAt: new Date().toLocaleDateString(),
        read: false
      };

      await updateDoc(techRef, {
        status: newStatus,
        notifications: arrayUnion(newNotif)
      });
    } catch {
      Alert.alert('Error', lang === 'AR' ? 'تعذر تحديث الحالة.' : 'Failed to update status.');
    }
  };

  const filteredTechs = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return techs.filter(tech => {
      const name = (tech.fullName || '').toLowerCase();
      const skills = (tech.skills || []).map(item => item.toLowerCase());
      return name.includes(s) || skills.some(skill => skill.includes(s));
    });
  }, [techs, searchTerm]);

  const filteredRequests = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return requests.filter(req => {
      const client = (req.clientName || '').toLowerCase();
      const service = (req.serviceType || '').toLowerCase();
      return client.includes(s) || service.includes(s);
    });
  }, [requests, searchTerm]);

  const openExternal = async (url?: string) => {
    if (!url) {
      return;
    }
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    }
  };

  if (error) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.errorBtn} onPress={onLogout}>
          <Text style={styles.errorBtnText}>Logout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.settingBtn} onPress={onSettings}>
            <Text style={styles.settingBtnText}>⚙️</Text>
          </Pressable>
          <Text style={styles.title}>Admin - Bricola</Text>
        </View>

        <View style={styles.tabsWrap}>
          <Pressable
            onPress={() => {
              setActiveTab('TECHS');
              setSearchTerm('');
            }}
            style={[styles.tabBtn, activeTab === 'TECHS' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'TECHS' && styles.tabBtnTextActive]}>
              {(lang === 'AR' ? 'الفنيين' : 'Technicians')} ({techs.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTab('REQUESTS');
              setSearchTerm('');
            }}
            style={[styles.tabBtn, activeTab === 'REQUESTS' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'REQUESTS' && styles.tabBtnTextActive]}>
              {(lang === 'AR' ? 'الطلبات' : 'Requests')} ({requests.length})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={
            activeTab === 'TECHS'
              ? lang === 'AR'
                ? 'بحث عن فني...'
                : 'Search for a tech...'
              : lang === 'AR'
              ? 'بحث عن طلب...'
              : 'Search for a request...'
          }
          style={styles.search}
        />

        {activeTab === 'TECHS'
          ? filteredTechs.map(tech => (
              <View key={tech.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.statusWrap}>
                    <Text
                      style={[
                        styles.status,
                        tech.status === 'APPROVED'
                          ? styles.statusApproved
                          : tech.status === 'REJECTED'
                          ? styles.statusRejected
                          : styles.statusPending
                      ]}
                    >
                      {tech.status}
                    </Text>
                    {tech.isOnline !== undefined ? (
                      <View style={[styles.dot, tech.isOnline ? styles.dotOn : styles.dotOff]} />
                    ) : null}
                  </View>

                  <View style={styles.techMeta}>
                    <Text style={styles.techName}>{tech.fullName}</Text>
                    <Text style={styles.techSub}>{tech.phone || 'No Phone'}</Text>
                    <Text style={styles.techSub}>📍 {tech.location || 'No Location'}</Text>
                  </View>
                </View>

                <View style={styles.docsRow}>
                  <Pressable style={styles.docBtn} onPress={() => void openExternal(tech.profilePictureUrl)}>
                    <Text style={styles.docEmoji}>📸</Text>
                    <Text style={styles.docText}>{lang === 'AR' ? 'الصورة الشخصية' : 'Profile Pic'}</Text>
                  </Pressable>
                  <Pressable style={styles.docBtn} onPress={() => void openExternal(tech.cvUrl)}>
                    <Text style={styles.docEmoji}>📄</Text>
                    <Text style={styles.docText}>{lang === 'AR' ? 'السيرة الذاتية' : 'CV'}</Text>
                  </Pressable>
                </View>

                {tech.status === 'PENDING' ? (
                  <View style={styles.rowButtons}>
                    <Pressable style={styles.approveBtn} onPress={() => void updateTechStatus(tech.id, 'APPROVED')}>
                      <Text style={styles.approveBtnText}>{t.approve}</Text>
                    </Pressable>
                    <Pressable style={styles.rejectBtn} onPress={() => void updateTechStatus(tech.id, 'REJECTED')}>
                      <Text style={styles.rejectBtnText}>{t.reject}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => void updateTechStatus(tech.id, 'PENDING')}>
                    <Text style={styles.resetLink}>{lang === 'AR' ? 'إعادة التعيين لقيد الانتظار' : 'Reset to Pending'}</Text>
                  </Pressable>
                )}
              </View>
            ))
          : filteredRequests.map(req => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqTitle}>{req.serviceType}</Text>
                    <Text style={styles.reqMeta}>👤 {req.clientName}</Text>
                    <Text style={styles.reqMeta}>📍 {req.location}</Text>
                  </View>
                  <View style={styles.reqBadges}>
                    <Text
                      style={[
                        styles.reqStatus,
                        req.status === 'PENDING'
                          ? styles.statusPending
                          : req.status === 'ACCEPTED'
                          ? styles.statusAccepted
                          : styles.statusApproved
                      ]}
                    >
                      {req.status}
                    </Text>
                    {req.urgency ? <Text style={styles.urgency}>{req.urgency}</Text> : null}
                  </View>
                </View>

                {req.description ? <Text style={styles.desc}>"{req.description}"</Text> : null}

                {req.assignedTechName ? (
                  <Text style={styles.assigned}>
                    {lang === 'AR' ? 'الفني المعين:' : 'Assigned Tech:'} 🛠️ {req.assignedTechName}
                  </Text>
                ) : null}
              </View>
            ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#0F172A', padding: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  settingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingBtnText: { color: '#FFFFFF', fontSize: 16 },
  title: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  tabsWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4, gap: 4 },
  tabBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF' },
  tabBtnText: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 11 },
  tabBtnTextActive: { color: '#0F172A' },
  content: { padding: 14, gap: 10 },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: '700'
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statusWrap: { gap: 6 },
  status: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden'
  },
  statusApproved: { backgroundColor: '#DCFCE7', color: '#166534' },
  statusRejected: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  statusPending: { backgroundColor: '#FEF9C3', color: '#A16207' },
  statusAccepted: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#22C55E' },
  dotOff: { backgroundColor: '#94A3B8' },
  techMeta: { flex: 1, alignItems: 'flex-end' },
  techName: { color: '#0F172A', fontWeight: '800' },
  techSub: { color: '#64748B', fontSize: 12 },
  docsRow: { flexDirection: 'row', gap: 8 },
  docBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2
  },
  docEmoji: { fontSize: 18 },
  docText: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  rowButtons: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', paddingVertical: 10 },
  approveBtnText: { color: '#FFFFFF', fontWeight: '800' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center', paddingVertical: 10 },
  rejectBtnText: { color: '#DC2626', fontWeight: '800' },
  resetLink: { color: '#64748B', textAlign: 'center', textDecorationLine: 'underline', fontSize: 12, fontWeight: '700' },
  reqTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  reqMeta: { color: '#64748B', fontSize: 12 },
  reqBadges: { alignItems: 'flex-end', gap: 4 },
  reqStatus: {
    fontSize: 10,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden'
  },
  urgency: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', backgroundColor: '#EF4444', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  desc: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, color: '#475569', fontStyle: 'italic' },
  assigned: { color: '#2563EB', fontWeight: '800', fontSize: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 20 },
  errorTitle: { color: '#B91C1C', fontWeight: '900', fontSize: 24 },
  errorBody: { color: '#DC2626', marginTop: 6, marginBottom: 12, textAlign: 'center' },
  errorBtn: { backgroundColor: '#B91C1C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  errorBtnText: { color: '#FFFFFF', fontWeight: '800' }
});
