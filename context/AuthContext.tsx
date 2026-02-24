import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';

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

    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (stopListening) {
        stopListening();
        stopListening = null;
      }

      if (authUser) {
        let currentRole = localStorage.getItem('bricola_selected_role') as UserRole;
        
        if (!currentRole) {
          const roles: UserRole[] = [UserRole.CLIENT, UserRole.TECHNICIAN, UserRole.ADMIN];
          for (const r of roles) {
            const docRef = doc(db, 'users', `${authUser.uid}_${r}`);
            const s = await getDoc(docRef);
            if (s.exists()) {
              currentRole = r;
              localStorage.setItem('bricola_selected_role', r);
              break;
            }
          }
        }

        if (currentRole) {
          const userDocRef = doc(db, 'users', `${authUser.uid}_${currentRole}`);
          stopListening = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              // Ensure the profile object has the correct document ID
              const data = docSnap.data();
              setProfile({ ...data, id: docSnap.id } as UserProfile);
            }
            setLoading(false);
          }, () => {
            setLoading(false);
          });
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
      if (stopListening) stopListening();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('bricola_selected_role');
    } catch {
      // Auth sign-out failed — state already cleared locally
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
