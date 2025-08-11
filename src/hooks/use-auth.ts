
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export type AppUser = {
    uid: string;
    email: string | null;
    name: string | null;
    isAdmin: boolean;
    isActivated: boolean;
    activationExpires?: number | null;
};

const initialAdminEmails = ['deypartho569@gmail.com', 'Pdey02485@gmail.com'];

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as AppUser;
                    // Check for expired activation
                    if (userData.isActivated && userData.activationExpires && new Date().getTime() > userData.activationExpires) {
                        const updatedUserData = { ...userData, isActivated: false, activationExpires: null };
                        await updateDoc(userDocRef, { isActivated: false, activationExpires: null });
                        setAppUser(updatedUserData);
                    } else {
                        setAppUser(userData);
                    }
                } else {
                    // This case is for when a user exists in Firebase Auth but not Firestore.
                    // This can happen if the Firestore document was deleted manually.
                    const email = firebaseUser.email?.toLowerCase() || '';
                    const isAdmin = initialAdminEmails.includes(email);
                    const newUserData: AppUser = {
                        uid: firebaseUser.uid,
                        email: email,
                        name: firebaseUser.displayName,
                        isAdmin,
                        isActivated: isAdmin, // Admins are activated by default
                        activationExpires: null,
                    };
                    await setDoc(userDocRef, newUserData);
                    setAppUser(newUserData);
                }
            } else {
                setUser(null);
                setAppUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        appUser,
        isLoading,
        isAdmin: appUser?.isAdmin || false,
        isActivated: appUser?.isActivated || false,
    };
};
