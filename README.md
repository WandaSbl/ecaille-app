# Écaille

Application React + Supabase pour gérer l’agenda d’un groupe de musique.

## Installation

1. Ouvre un terminal dans le dossier `Ecaille`
2. Installe les dépendances :

```bash
npm install
```

3. Crée un fichier `.env` avec :

```text
VITE_SUPABASE_URL=https://mjcxjwkitdxbuhxpijur.supabase.co
VITE_SUPABASE_ANON_KEY=ton_clef_anon
```

4. Lance l’application :

```bash
npm run dev
```

## Fonctionnalités

- Authentification Supabase avec email / mot de passe
- Agenda général
- Détail d’un événement
- Création et modification d’événements
- Présence des musiciens sur chaque événement
- Mode webapp installable / PWA
- Consultation hors-ligne partielle via cache local

## Notes

- Remplace `VITE_SUPABASE_ANON_KEY` par la clé publique `anon` de ton projet Supabase.
- Vérifie que les tables Supabase sont nommées comme dans le modèle : `event`, `event_type`, `event_status`, `event_musicians`, `event_songs`, `musicians`, `songs`.
