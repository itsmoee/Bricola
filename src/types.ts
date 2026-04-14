export enum UserRole {
  CLIENT = 'CLIENT',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN'
}

export type TechStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'VACATION';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'INQUIRY';
export type Language = 'AR' | 'EN';

export enum ServiceCategory {
  PLUMBER = 'PLUMBER',
  ELECTRICIAN = 'ELECTRICIAN',
  AC_REPAIR = 'AC_REPAIR',
  PAINTER = 'PAINTER',
  CARPENTER = 'CARPENTER',
  MASON = 'MASON',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER'
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  skills?: string[];
  status?: TechStatus;
  documentUrl?: string;
  profilePictureUrl?: string;
  cvUrl?: string;
  location?: string;
  notificationsEnabled?: boolean;
  isOnline?: boolean;
  notifications?: AppNotification[];
  galleryUrls?: string[];
  specializations?: string[];
  ratingAvg?: number;
  ratingCount?: number;
  bio?: string;
  onboardingCompleted?: boolean;
  onboardingComplete?: boolean;
  reminderScheduled?: boolean;
  availabilityStatus?: AvailabilityStatus;
  referredBy?: string;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  description?: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  coordinates?: { lat: number; lng: number };
  assignedTechId?: string;
  assignedTechName?: string;
  status: RequestStatus;
  createdAt: string;
  rating?: number;
  feedback?: string;
  paymentConfirmed?: boolean;
  completionConfirmedAt?: any;
  quote?: string;
  quoteStatus?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterQuote?: string;
  clientRating?: number;
  photos?: string[];
  preferredTime?: string;
  budget?: string;
  distance?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export type AuthMode = 'LOGIN' | 'REGISTER';

export const translations = {
  AR: {
    settings: 'الإعدادات',
    language: 'اللغة',
    notifications: 'التنبيهات',
    updateProfile: 'تحديث الملف الشخصي',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    changePassword: 'تغيير كلمة المرور',
    logout: 'تسجيل الخروج',
    save: 'حفظ التغييرات',
    back: 'رجوع',
    client: 'حريف',
    technician: 'فني',
    admin: 'مسؤول',
    welcome: 'مرحباً بك في بريكولا',
    accountPending: 'حسابك قيد المراجعة',
    accountPendingDesc: 'يرجى رفع وثائقك في "الإعدادات" والانتظار حتى يقوم المسؤول بمراجعتها.',
    accountApproved: 'تم تفعيل حسابك!',
    accountApprovedDesc: 'يمكنك الآن البدء في استقبال طلبات الصيانة.',
    accountRejected: 'تم رفض الحساب',
    accountRejectedDesc: 'يرجى التواصل مع الدعم الفني لمزيد من التفاصيل.',
    status: 'الحالة',
    approve: 'موافقة',
    reject: 'رفض',
    online: 'متصل (نشط)',
    offline: 'غير متصل (متوقف)',
    plumber: 'سباك',
    electrician: 'كهربائي',
    ac_repair: 'تصليح مكيفات',
    painter: 'دهان',
    carpenter: 'نجار',
    mason: 'بناء',
    activeRequests: 'الطلبات النشطة',
    history: 'سجل الطلبات',
    noActiveRequests: 'لا توجد طلبات نشطة حالياً.',
    noHistory: 'سجل الطلبات فارغ.',
    rateService: 'تقييم الخدمة',
    submit: 'إرسال',
    feedbackPlaceholder: 'أضف تعليقاً (اختياري)...',
    ratingSaved: 'تم حفظ التقييم بنجاح!',
    permanentLocation: 'الموقع الدائم',
    profilePicture: 'الصورة الشخصية',
    idCard: 'بطاقة التعريف (CIN)',
    cv: 'السيرة الذاتية (CV)',
    availability: 'حالة التوافر',
    availableToday: 'متاح للعمل اليوم',
    busyThisWeek: 'مشغول هذا الأسبوع',
    onVacation: 'في عطلة',
    incompleteProfile: 'ملفك الشخصي غير مكتمل — أكمله للبدء في تلقي الطلبات',
    finishSetup: 'أكمل الإعداد',
    cleaning: 'تنظيف',
    other: 'أخرى',
    pleaseWait: 'يرجى الانتظار...',
    exit: 'الخروج',
    verifying: 'جاري التحقق...',
    creatingAccount: 'إنشاء الحساب...',
    checkingData: 'التحقق من البيانات...',
    preparingProfile: 'تجهيز الملف الشخصي...',
    loggingIn: 'تسجيل الدخول...',
    fetchingData: 'جلب البيانات...',
    registrationComplete: 'اكتمل التسجيل!',
    adminCodeError: 'كود الإدارة غير صحيح. لا يمكن إنشاء حساب مسؤول.',
    errorUpdatingProfile: 'حدث خطأ أثناء تحديث الملف الشخصي.',
    errorSaving: 'حدث خطأ أثناء الحفظ. يرجى المحاولة مجدداً.',
    errorSendingMessage: 'تعذر إرسال الرسالة. يرجى المحاولة مجدداً.',
    errorStartingChat: 'تعذر بدء المحادثة. يرجى المحاولة مجدداً.',
    errorCompletingJob: 'حدث خطأ أثناء إنهاء المهمة.',
    uploadSuccess: 'تم الرفع بنجاح!',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح!',
    savedSuccess: 'تم الحفظ بنجاح'
  },
  EN: {
    settings: 'Settings',
    language: 'Language',
    notifications: 'Notifications',
    updateProfile: 'Update Profile',
    fullName: 'Full Name',
    phone: 'Phone Number',
    changePassword: 'Change Password',
    logout: 'Logout',
    save: 'Save Changes',
    back: 'Back',
    client: 'Client',
    technician: 'Technician',
    admin: 'Admin',
    welcome: 'Welcome to Bricola',
    accountPending: 'Account Pending',
    accountPendingDesc: 'Please upload your documents in "Settings" and wait for admin review.',
    accountApproved: 'Account Approved!',
    accountApprovedDesc: 'You can now start receiving maintenance requests.',
    accountRejected: 'Account Rejected',
    accountRejectedDesc: 'Please contact support for more details.',
    status: 'Status',
    approve: 'Approve',
    reject: 'Reject',
    online: 'Online (Active)',
    offline: 'Offline (Paused)',
    plumber: 'Plumber',
    electrician: 'Electrician',
    ac_repair: 'AC Repair',
    painter: 'Painter',
    carpenter: 'Carpenter',
    mason: 'Mason',
    activeRequests: 'Active Requests',
    history: 'Service History',
    noActiveRequests: 'No active requests at the moment.',
    noHistory: 'Your history is empty.',
    rateService: 'Rate Service',
    submit: 'Submit',
    feedbackPlaceholder: 'Add feedback (optional)...',
    ratingSaved: 'Rating saved successfully!',
    permanentLocation: 'Permanent Location',
    profilePicture: 'Profile Picture',
    idCard: 'ID Card / CIN',
    cv: 'Resume / CV',
    availability: 'Availability',
    availableToday: 'Available Today',
    busyThisWeek: 'Busy This Week',
    onVacation: 'On Vacation',
    incompleteProfile: 'Your profile is incomplete — complete it to start receiving jobs',
    finishSetup: 'Finish Setup',
    cleaning: 'Cleaning',
    other: 'Other',
    pleaseWait: 'Please wait...',
    exit: 'Exit',
    verifying: 'Verifying...',
    creatingAccount: 'Creating account...',
    checkingData: 'Checking data...',
    preparingProfile: 'Preparing profile...',
    loggingIn: 'Signing in...',
    fetchingData: 'Fetching data...',
    registrationComplete: 'Registration complete!',
    adminCodeError: 'Invalid admin code. Cannot create an admin account.',
    errorUpdatingProfile: 'An error occurred while updating your profile.',
    errorSaving: 'An error occurred while saving. Please try again.',
    errorSendingMessage: 'Failed to send message. Please try again.',
    errorStartingChat: 'Failed to start chat. Please try again.',
    errorCompletingJob: 'An error occurred while completing the job.',
    uploadSuccess: 'Uploaded successfully!',
    profileUpdated: 'Profile updated successfully!',
    savedSuccess: 'Saved successfully'
  }
};
