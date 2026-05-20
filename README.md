# Tapvia — NFC Review Platform

Système de redirection NFC avec dashboard admin pour gérer les liens Google Reviews de tes clients.

## Structure
```
tapvia/
├── pages/
│   ├── index.js          ← Dashboard admin (protégé par mot de passe)
│   ├── 404.js            ← Page d'erreur si lien introuvable
│   ├── _app.js
│   ├── c/
│   │   └── [slug].js     ← Redirection NFC (ex: /c/pizza-bella)
│   └── api/
│       ├── redirects.js  ← CRUD clients (GET/POST/PUT/DELETE)
│       └── stats.js      ← Analytics scans
├── lib/
│   └── supabase.js       ← Client Supabase
└── styles/
    └── globals.css
```

## Déploiement — étapes

### 1. Supabase
1. Va sur https://supabase.com → New Project
2. Dans l'éditeur SQL, colle ces 2 tables :

```sql
create table redirects (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  destination text not null,
  client_name text,
  plan text default 'Starter',
  active boolean default true,
  created_at timestamp default now()
);

create table scans (
  id uuid default gen_random_uuid() primary key,
  redirect_id uuid references redirects(id) on delete cascade,
  scanned_at timestamp default now()
);
```

3. Va dans Project Settings → API → copie l'URL et la clé `anon public`

### 2. GitHub
1. Crée un nouveau repository sur github.com
2. Upload tous les fichiers de ce projet dedans

### 3. Vercel
1. Va sur vercel.com → New Project → Import depuis GitHub
2. Dans "Environment Variables", ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = ton URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon Supabase
   - `NEXT_PUBLIC_ADMIN_PASSWORD` = ton mot de passe admin (ex: MonMotDePasse2025)
3. Clique Deploy

### 4. Domaine personnalisé
Dans Vercel → Settings → Domains → ajoute ton domaine (ex: tapvia.fr)

## Utilisation

### Accéder au dashboard
Ouvre ton domaine → mot de passe admin → tu peux créer/gérer tes clients

### Créer un lien pour un client
1. Clique "+ Nouveau client"
2. Remplis le nom, le lien Google Reviews, choisis un plan
3. Le slug est généré automatiquement (ex: "Pizza Bella" → pizza-bella)
4. Le lien NFC sera : `tondomaine.fr/c/pizza-bella`

### Encoder la carte NFC
1. Installe NFC Tools sur Android (gratuit, Play Store)
2. Écrire → Ajouter un enregistrement → URL
3. Colle le lien : `https://tondomaine.fr/c/pizza-bella`
4. Approche la carte NFC derrière le téléphone → ✓ encodé

### Changer la destination d'un client
Dashboard → Modifier → change le lien Google → Enregistrer
La carte physique n'a pas besoin d'être ré-encodée.
