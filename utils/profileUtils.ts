
import { UserProfile, UserRole } from '../types';

export const isProfileComplete = (user: UserProfile): boolean => {
  const hasPhoto = !!user.profilePictureUrl;
  const hasLocation = !!user.location && user.location.trim().length > 0;
  
  if (user.role === UserRole.TECHNICIAN) {
    const hasSpecialty = (user.skills && user.skills.length > 0) || (user.specializations && user.specializations.length > 0);
    return hasPhoto && hasLocation && hasSpecialty;
  }
  
  return hasPhoto && hasLocation;
};
