import { UserProfile } from '../types';

export type BadgeTier = 'NEW' | 'TRUSTED' | 'PRO_VERIFIED';

export interface BadgeInfo {
  tier: BadgeTier;
  label: { AR: string; EN: string };
  color: string;
  bgColor: string;
}

export const getTechnicianBadge = (tech: Partial<UserProfile>): BadgeInfo => {
  const ratingAvg = tech.ratingAvg || 0;
  const ratingCount = tech.ratingCount || 0;
  const isApproved = tech.status === 'APPROVED';

  if (ratingCount >= 10 && ratingAvg >= 4.5 && isApproved) {
    return {
      tier: 'PRO_VERIFIED',
      label: { AR: 'خبير محترف', EN: 'Pro Verified' },
      color: '#B8860B',
      bgColor: '#FEF3C7'
    };
  }

  if (ratingCount >= 5 && ratingAvg >= 4.0) {
    return {
      tier: 'TRUSTED',
      label: { AR: 'فني موثوق', EN: 'Trusted' },
      color: '#1E40AF',
      bgColor: '#DBEAFE'
    };
  }

  return {
    tier: 'NEW',
    label: { AR: 'جديد', EN: 'New' },
    color: '#6B7280',
    bgColor: '#F3F4F6'
  };
};
