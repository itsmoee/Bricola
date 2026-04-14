import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { appStorage, storageKeys } from '../storage/appStorage';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopListening: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async authUser => {
      setUser(authUser);
      if (stopListening) {
        stopListening();
        stopListening = null;
      }

      if (authUser) {
        let currentRole = (await appStorage.get(storageKeys.selectedRole)) as UserRole | null;

        if (!currentRole) {
          const roles: UserRole[] = [UserRole.CLIENT, UserRole.TECHNICIAN, UserRole.ADMIN];
          for (const role of roles) {
            const docRef = doc(db, 'users', `${authUser.uid}_${role}`);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              currentRole = role;
              await appStorage.set(storageKeys.selectedRole, role);
              break;
            }
          }
        }

        if (currentRole) {
          const userDocRef = doc(db, 'users', `${authUser.uid}_${currentRole}`);
          stopListening = onSnapshot(
            userDocRef,
            docSnap => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile({ ...data, id: docSnap.id } as UserProfile);
              }
              setLoading(false);
            },
            () => {
              setLoading(false);
            }
          );
        } else {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (stopListening) {
        stopListening();
      }
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      await appStorage.remove(storageKeys.selectedRole);
    } catch {
      // Ignore sign-out errors to avoid blocking UI reset.
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
