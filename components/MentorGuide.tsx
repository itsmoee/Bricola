
import React from 'react';
import { UserRole } from '../types';

interface MentorGuideProps {
  step: string;
  userRole?: UserRole;
}

export const MentorGuide: React.FC<MentorGuideProps> = ({ step, userRole }) => {
  const getArabicGuide = () => {
    if (step === 'SETTINGS') {
      return "هنا قمنا ببناء شاشة الإعدادات. لاحظ كيف تتغير لغة التطبيق بالكامل فوراً عند اختيار English. قمنا باستعمال Dictionary بسيط للترجمة.";
    }
    
    if (userRole === UserRole.ADMIN) {
      return "كـ Admin، جرب الضغط على 'موافقة' لأحد الفنيين. ستلاحظ أنه سيصله إشعار (Simulation) وتتغير واجهته فوراً عند الدخول.";
    }

    switch(step) {
      case 'WELCOME':
        return "هذه شاشة 'بريكولا' الأولى. أضفت لك رابطاً صغيراً في الأسفل للدخول كـ Admin للتجربة.";
      case 'AUTH':
        return "في Firebase، سنقوم بحفظ الـ Role داخل 'Firestore'. قمنا بزيادة حقل التنبيهات في الملف الشخصي.";
      case 'DASHBOARD':
        return "اضغط على زر الترس ⚙️ في الأعلى لتجربة شاشة الإعدادات الجديدة.";
      default:
        return "أنا هنا لمساعدتك دائماً.";
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white p-3 rounded-2xl z-[100] text-xs flex items-center gap-3 shadow-2xl border border-white/10 opacity-90 pointer-events-none">
      <span className="text-xl">🎓</span>
      <p className="flex-1 leading-tight">{getArabicGuide()}</p>
    </div>
  );
};
