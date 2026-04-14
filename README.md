# Bricola - Plateforme Tunisienne de Services Locaux (Tataouine) 🛠️

Bricola est une application mobile moderne construite avec **React Native**, **Expo**, **TypeScript**, et **Firebase**. Elle permet de connecter facilement les citoyens de Tataouine avec des artisans qualifiés (plombiers, électriciens, menuisiers, etc.).

## 🚀 Fonctionnalités principales

- **Onboarding Personnalisé** : Parcours distincts pour Clients et Artisans.
- **Tableau de Bord Artisan** : Gestion des notifications en temps réel, mode en ligne/hors ligne, et calcul de distance.
- **Tableau de Bord Client** : Recherche d'artisans, gestion des demandes de service, et système de notation.
- **Système de Notation Dynamique** : Les notes commencent à 0.0 et sont calculées sur une moyenne roulante.
- **Chat en Direct** : Communication instantanée entre clients et artisans.
- **Support Multi-langue** : Support complet de l'Arabe (AR) et de l'Anglais (EN).
- **Géolocalisation** : Intégration de react-native-maps pour le suivi des demandes sur une carte.

## 🛠️ Stack Technique

- **Framework** : React Native 0.83+ avec Expo SDK 55
- **Langage** : TypeScript
- **Base de données** : Firebase Firestore
- **Authentification** : Firebase Auth
- **Stockage** : Firebase Storage
- **Configuration** : Firebase Remote Config
- **Navigation** : React Navigation (Native Stack)
- **Cartes** : react-native-maps
- **Notifications** : expo-notifications
- **Stockage local** : @react-native-async-storage/async-storage

## 💻 Installation

1. Cloner le repository :
   ```bash
   git clone https://github.com/Mossaabjelliti/Bricola.git
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Copier le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
4. Configurer les variables Firebase dans `.env`

5. Exécuter en local :
   ```bash
   npx expo start
   ```

## 📱 Compiler pour Android

1. Lancer le build Android :
   ```bash
   npx expo run:android
   ```

2. Ou utiliser EAS Build :
   ```bash
   npx eas build --platform android
   ```

---
© 2025 Bricola Tunisia. Tous droits réservés.
