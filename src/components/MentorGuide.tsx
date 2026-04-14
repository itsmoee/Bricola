import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserRole } from '../types';

interface MentorGuideProps {
  step: string;
  userRole?: UserRole;
}

export const MentorGuide: React.FC<MentorGuideProps> = ({ step, userRole }) => {
  const getArabicGuide = () => {
    if (step === 'SETTINGS') {
      return 'هنا قمنا ببناء شاشة الإعدادات. لاحظ كيف تتغير لغة التطبيق بالكامل فوراً عند اختيار English.';
    }

    if (userRole === UserRole.ADMIN) {
      return 'كـ Admin، جرب الضغط على موافقة لأحد الفنيين. ستلاحظ التحديث فورياً.';
    }

    switch (step) {
      case 'WELCOME':
        return 'هذه شاشة بريكولا الأولى. يوجد رابط صغير في الأسفل للدخول كـ Admin للتجربة.';
      case 'AUTH':
        return 'في Firebase نحفظ الدور داخل Firestore مع ملف profile منفصل لكل role.';
      case 'DASHBOARD':
        return 'اضغط على زر الترس لتجربة شاشة الإعدادات.';
      default:
        return 'أنا هنا لمساعدتك دائماً.';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎓</Text>
      <Text style={styles.message}>{getArabicGuide()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  icon: { fontSize: 20 },
  message: { flex: 1, color: '#FFFFFF', fontSize: 12, lineHeight: 17 }
});
