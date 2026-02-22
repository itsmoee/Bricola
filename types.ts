
export enum UserRole {
  CLIENT = 'CLIENT',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN'
}

export type TechStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
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
  documentUrl?: string; // This is the ID card/certificate
  profilePictureUrl?: string; // New field
  cvUrl?: string; // New field
  location?: string; // New field
  notificationsEnabled?: boolean;
  isOnline?: boolean;
  notifications?: AppNotification[];
  galleryUrls?: string[]; // Portfolio images
  specializations?: string[]; // Skills/Tags
  ratingAvg?: number;
  ratingCount?: number;
  bio?: string;
  onboardingCompleted?: boolean;
}

export interface ServiceRequest {
  id: string;
  clientId: string; // added this
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
  quote?: string;
  quoteStatus?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterQuote?: string;
  clientRating?: number; // client's current avg rating
  photos?: string[]; // array of base64 or storage urls
  preferredTime?: string; // string or datetime
  budget?: string; // proposed budget if any
  distance?: string; // calculated distance for technician
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
  }
};
