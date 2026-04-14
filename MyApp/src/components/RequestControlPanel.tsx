import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Language, ServiceRequest, UserProfile, UserRole, translations } from '../types';

interface RequestControlPanelProps {
  request: ServiceRequest;
  user: UserProfile;
  lang: Language;
  onBack: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onStatusUpdate: (updatedReq: ServiceRequest) => void;
  onOpenChat: (reqId: string) => void;
}

export const RequestControlPanel: React.FC<RequestControlPanelProps> = ({
  request,
  user,
  lang,
  onBack,
  onOpenChat,
  onStatusUpdate
}) => {
  const t = translations[lang] || translations.AR;
  const [isUpdating, setIsUpdating] = useState(false);
  const [offerPrice, setOfferPrice] = useState(request.quote || '');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [selectedRating, setSelectedRating] = useState(request.rating || 0);
  const [ratingFeedback, setRatingFeedback] = useState(request.feedback || '');
  const [ratingSubmitted, setRatingSubmitted] = useState(Boolean(request.rating));
  const [actionError, setActionError] = useState<string | null>(null);

  const updateStatus = async (newStatus: 'PENDING' | 'ACCEPTED' | 'COMPLETED') => {
    setIsUpdating(true);
    setActionError(null);

    const updatedData: Partial<ServiceRequest> = { status: newStatus };
    if (newStatus === 'ACCEPTED' && !request.assignedTechId) {
      updatedData.assignedTechId = user.id;
      updatedData.assignedTechName = user.fullName;
    }
    if (newStatus === 'COMPLETED') {
      updatedData.paymentConfirmed = false;
    }

    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
      }
      onStatusUpdate({ ...request, ...updatedData });
    } catch {
      setActionError(t.errorCompletingJob);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendOffer = async () => {
    if (!offerPrice) {
      return;
    }
    setIsUpdating(true);
    setActionError(null);

    const updatedData: Partial<ServiceRequest> = {
      quote: offerPrice,
      quoteStatus: 'PROPOSED',
      status: 'ACCEPTED',
      assignedTechId: user.id,
      assignedTechName: user.fullName
    };

    try {
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
    const updatedData = { paymentConfirmed: true, completionConfirmedAt: serverTimestamp() as any };
    try {
      if (user.id !== 'mock_guest') {
        await updateDoc(doc(db, 'requests', request.id), updatedData);
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
    const updatedData: Partial<ServiceRequest> = { quoteStatus: 'ACCEPTED' };
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
    const updatedData: Partial<ServiceRequest> = {
      quoteStatus: 'REJECTED',
      status: 'PENDING',
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
    if (!counterPrice) {
      return;
    }
    setIsUpdating(true);
    setActionError(null);
    const updatedData: Partial<ServiceRequest> = { quoteStatus: 'COUNTERED', counterQuote: counterPrice };
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
    const updatedData: Partial<ServiceRequest> = {
      quoteStatus: 'ACCEPTED',
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
    if (!selectedRating) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);
    const reqUpdate: Partial<ServiceRequest> = { rating: selectedRating, feedback: ratingFeedback };

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
          const newAvg = (prevAvg * prevCount + selectedRating) / newCount;
          await updateDoc(techRef, {
            ratingAvg: Math.round(newAvg * 10) / 10,
            ratingCount: newCount
          });
        }
      }

      onStatusUpdate({ ...request, ...reqUpdate });
      setRatingSubmitted(true);
    } catch {
      setActionError(lang === 'AR' ? 'تعذر حفظ التقييم. حاول مجدداً.' : 'Failed to save rating. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const shareOnWhatsApp = async () => {
    const message =
      lang === 'AR'
        ? `فاتورة بريكولا: تم إنجاز المهمة ${request.serviceType}. السعر: ${request.quote || request.budget || '0'} د.ت`
        : `Bricola invoice: ${request.serviceType} completed. Price: ${request.quote || request.budget || '0'} TND`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encoded}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const statusColor =
    request.status === 'COMPLETED'
      ? '#22C55E'
      : request.status === 'ACCEPTED'
      ? '#3B82F6'
      : request.status === 'INQUIRY'
      ? '#A855F7'
      : '#F59E0B';

  return (
    <>
      <Modal visible={showOfferForm} transparent animationType="slide" onRequestClose={() => setShowOfferForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{lang === 'AR' ? 'إرسال عرض سعر' : 'Send Offer'}</Text>
            <TextInput
              style={styles.modalInput}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
              placeholder={lang === 'AR' ? 'السعر المقترح' : 'Proposed price'}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhost} onPress={() => setShowOfferForm(false)}>
                <Text style={styles.modalGhostText}>{lang === 'AR' ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={() => void handleSendOffer()} disabled={isUpdating || !offerPrice}>
                <Text style={styles.modalPrimaryText}>{isUpdating ? '...' : lang === 'AR' ? 'إرسال' : 'Send'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCounterForm} transparent animationType="slide" onRequestClose={() => setShowCounterForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{lang === 'AR' ? 'عرض مضاد' : 'Counter Offer'}</Text>
            <TextInput
              style={styles.modalInput}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              placeholder={lang === 'AR' ? 'سعرك' : 'Your price'}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhost} onPress={() => setShowCounterForm(false)}>
                <Text style={styles.modalGhostText}>{lang === 'AR' ? 'إلغاء' : 'Cancel'}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={() => void handleSendCounter()} disabled={isUpdating || !counterPrice}>
                <Text style={styles.modalPrimaryText}>{isUpdating ? '...' : lang === 'AR' ? 'إرسال' : 'Send'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>{lang === 'AR' ? 'تفاصيل الطلب' : 'Request Details'}</Text>
            <Text style={styles.headerSub}>#{request.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.statusCard, { borderColor: statusColor }]}> 
          <Text style={styles.statusLabel}>{lang === 'AR' ? 'الحالة الحالية' : 'Current Status'}</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>{request.status}</Text>
          {request.quoteStatus ? <Text style={styles.quoteState}>Quote: {request.quoteStatus}</Text> : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{request.serviceType}</Text>
          <Text style={styles.infoBody}>{request.description || (lang === 'AR' ? 'لا يوجد وصف' : 'No description')}</Text>
          <Text style={styles.infoMeta}>📍 {request.location}</Text>
          <Text style={styles.infoMeta}>⚡ {request.urgency || 'MEDIUM'}</Text>
          <Text style={styles.infoMeta}>💰 {request.quote || request.budget || '??'} DT</Text>

          <View style={styles.inlineActions}>
            <Pressable style={styles.chatBtn} onPress={() => onOpenChat(request.id)}>
              <Text style={styles.chatBtnText}>{lang === 'AR' ? 'فتح المحادثة' : 'Open Chat'}</Text>
            </Pressable>
            <Pressable
              style={styles.chatBtn}
              onPress={() => {
                Alert.alert(
                  'Invoice',
                  '⚠️ MANUAL REVIEW NEEDED: PDF invoice generation from jsPDF should be replaced with a native PDF/export flow.'
                );
              }}
            >
              <Text style={styles.chatBtnText}>{lang === 'AR' ? 'تحميل فاتورة' : 'Download Invoice'}</Text>
            </Pressable>
          </View>
        </View>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {user.role === UserRole.TECHNICIAN && request.status === 'PENDING' ? (
          <View style={styles.actionCard}>
            <Pressable style={styles.primaryBtn} onPress={() => void updateStatus('ACCEPTED')} disabled={isUpdating}>
              <Text style={styles.primaryBtnText}>{lang === 'AR' ? 'قبول المهمة' : 'Accept Job'}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setShowOfferForm(true)}>
              <Text style={styles.secondaryBtnText}>{lang === 'AR' ? 'إرسال عرض سعر' : 'Send Offer'}</Text>
            </Pressable>
          </View>
        ) : null}

        {user.role === UserRole.CLIENT && request.quoteStatus === 'PROPOSED' && request.quote ? (
          <View style={styles.actionCard}>
            <Text style={styles.quoteText}>{lang === 'AR' ? 'عرض الفني' : 'Technician quote'}: {request.quote} DT</Text>
            <View style={styles.inlineActions}>
              <Pressable style={styles.acceptBtn} onPress={() => void handleAcceptQuote()} disabled={isUpdating}>
                <Text style={styles.acceptBtnText}>{lang === 'AR' ? 'قبول' : 'Accept'}</Text>
              </Pressable>
              <Pressable style={styles.counterBtn} onPress={() => setShowCounterForm(true)} disabled={isUpdating}>
                <Text style={styles.counterBtnText}>{lang === 'AR' ? 'عرض مضاد' : 'Counter'}</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => void handleRejectQuote()} disabled={isUpdating}>
                <Text style={styles.rejectBtnText}>{lang === 'AR' ? 'رفض' : 'Decline'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {user.role === UserRole.TECHNICIAN && request.quoteStatus === 'COUNTERED' && request.counterQuote ? (
          <View style={styles.actionCard}>
            <Text style={styles.quoteText}>{lang === 'AR' ? 'عرض مضاد من الحريف' : 'Counter from client'}: {request.counterQuote} DT</Text>
            <View style={styles.inlineActions}>
              <Pressable style={styles.acceptBtn} onPress={() => void handleAcceptCounter()}>
                <Text style={styles.acceptBtnText}>{lang === 'AR' ? 'قبول السعر' : 'Accept Price'}</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => setShowOfferForm(true)}>
                <Text style={styles.secondaryBtnText}>{lang === 'AR' ? 'عرض جديد' : 'New Offer'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {request.status === 'ACCEPTED' ? (
          <View style={styles.actionCard}>
            <Text style={styles.quoteText}>{lang === 'AR' ? 'المهمة قيد التنفيذ' : 'Job in progress'}</Text>
            {user.role === UserRole.TECHNICIAN ? (
              <Pressable style={styles.primaryBtn} onPress={() => void updateStatus('COMPLETED')}>
                <Text style={styles.primaryBtnText}>{lang === 'AR' ? 'تم الإنجاز' : 'Mark Completed'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {request.status === 'COMPLETED' ? (
          <View style={styles.actionCard}>
            {user.role === UserRole.CLIENT && !request.paymentConfirmed ? (
              <Pressable style={styles.primaryBtn} onPress={() => void confirmWork()}>
                <Text style={styles.primaryBtnText}>{lang === 'AR' ? 'تأكيد العمل' : 'Confirm Work'}</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.quoteText}>
                  {request.paymentConfirmed
                    ? lang === 'AR'
                      ? 'تم التأكيد ويمكن التقييم'
                      : 'Confirmed. Rating is available.'
                    : lang === 'AR'
                    ? 'بانتظار تأكيد الحريف'
                    : 'Waiting for client confirmation'}
                </Text>
                {request.paymentConfirmed ? (
                  <Pressable style={styles.secondaryBtn} onPress={() => void shareOnWhatsApp()}>
                    <Text style={styles.secondaryBtnText}>{lang === 'AR' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {user.role === UserRole.CLIENT && request.status === 'COMPLETED' && request.paymentConfirmed && !ratingSubmitted ? (
          <View style={styles.actionCard}>
            <Text style={styles.quoteText}>{lang === 'AR' ? 'قيّم الفني' : 'Rate Technician'}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setSelectedRating(star)}>
                  <Text style={[styles.star, star <= selectedRating && styles.starActive]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={ratingFeedback}
              onChangeText={setRatingFeedback}
              placeholder={t.feedbackPlaceholder}
              style={styles.feedbackInput}
              multiline
            />
            <Pressable style={styles.primaryBtn} onPress={() => void handleSubmitRating()} disabled={!selectedRating || isUpdating}>
              <Text style={styles.primaryBtnText}>{lang === 'AR' ? 'إرسال التقييم' : 'Submit Rating'}</Text>
            </Pressable>
          </View>
        ) : null}

        {user.role === UserRole.CLIENT && ratingSubmitted ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneText}>⭐ {t.ratingSaved}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#64748B', fontWeight: '900' },
  headerTitle: { fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  headerSub: { color: '#F97316', fontSize: 10, textAlign: 'center', fontWeight: '900' },
  headerSpacer: { width: 34 },
  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, borderWidth: 2 },
  statusLabel: { color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', fontWeight: '900' },
  statusValue: { fontSize: 20, fontWeight: '900' },
  quoteState: { marginTop: 4, color: '#475569', fontWeight: '700' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 6 },
  infoTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  infoBody: { color: '#334155', lineHeight: 20 },
  infoMeta: { color: '#475569', fontWeight: '700' },
  inlineActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chatBtn: { backgroundColor: '#E2E8F0', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 },
  chatBtnText: { color: '#1E293B', fontWeight: '700', fontSize: 12 },
  error: { color: '#DC2626', fontWeight: '700' },
  actionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 10 },
  primaryBtn: { backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  quoteText: { color: '#334155', fontWeight: '700' },
  acceptBtn: { backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10 },
  acceptBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  counterBtn: { backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10 },
  counterBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  rejectBtn: { backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10 },
  rejectBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  star: { fontSize: 34, color: '#CBD5E1' },
  starActive: { color: '#F59E0B' },
  feedbackInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 82,
    textAlignVertical: 'top'
  },
  doneCard: { backgroundColor: '#DCFCE7', borderRadius: 16, padding: 12 },
  doneText: { color: '#166534', fontWeight: '900' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.6)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 12
  },
  modalTitle: { fontWeight: '900', fontSize: 18, color: '#0F172A' },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalGhost: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalGhostText: { color: '#334155', fontWeight: '800' },
  modalPrimary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalPrimaryText: { color: '#FFFFFF', fontWeight: '800' }
});
