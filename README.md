# Bricola - Plateforme Tunisienne de Services Locaux (Tataouine) 🛠️

Bricola est une application mobile moderne construite avec **React**, **TypeScript**, **Capacitor**, et **Firebase**. Elle permet de connecter facilement les citoyens de Tataouine avec des artisans qualifiés (plombiers, électriciens, menuisiers, etc.).

## 🚀 Fonctionnalités principales

- **Onboarding Personnalisé** : Parcours distincts pour Clients et Artisans.
- **Tableau de Bord Artisan** : Gestion des notifications en temps réel, mode en ligne/hors ligne, et calcul de distance.
- **Tableau de Bord Client** : Recherche d'artisans, gestion des demandes de service, et système de notation.
- **Système de Notation Dynamique** : Les notes commencent à 0.0 et sont calculées sur une moyenne roulante.
- **Chat en Direct** : Communication instantanée entre clients et artisans.
- **Support Multi-langue** : Support complet de l'Arabe (AR) et du Français/Anglais (EN).
- **Géolocalisation** : Intégration de Leaflet pour le suivi des demandes sur une carte.

## 🛠️ Stack Technique

- **Framework** : React + Vite
- **Mobile** : Capacitor (Android)
- **Base de données** : Firebase Firestore
- **Authentification** : Firebase Auth
- **Style** : Tailwind CSS

## 💻 Installation

1. Cloner le repository :
   ```bash
   git clone https://github.com/itsmoee/Bricola.git
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Exécuter en local :
   ```bash
   npm run dev
   ```

## 📱 Compiler pour Android

1. Compiler le projet web :
   ```bash
   npm run build
   ```
2. Synchroniser avec Capacitor :
   ```bash
   npx cap sync
   ```
3. Ouvrir dans Android Studio :
   ```bash
   npx cap open android
   ```

---
© 2025 Bricola Tunisia. Tous droits réservés.
