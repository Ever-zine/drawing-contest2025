# 🎨 Concours de Dessin

Une application web pour organiser des concours de dessin quotidiens entre amis !

## Fonctionnalités

- **Authentification** avec Supabase
- **Thème quotidien** révélé chaque jour
- **Upload de dessins** avec drag & drop
- **Galerie** visible après minuit
- **Interface admin** pour gérer les thèmes
- **Design moderne** et responsive

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

### 2. Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Récupérez votre URL et clé anonyme dans les paramètres du projet
3. Créez les tables suivantes dans votre base de données :

#### Table `themes`
```sql
CREATE TABLE themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table `drawings`
```sql
CREATE TABLE drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table `users` (extension de auth.users)
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Configuration Cloudinary

1. Créez un compte sur [Cloudinary](https://cloudinary.com)
2. Récupérez votre Cloud Name
3. Créez un Upload Preset dans les paramètres de votre compte
4. Configurez le preset pour être "unsigned" pour les uploads côté client

## Installation et lancement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## Utilisation

### Pour les utilisateurs
1. Créez un compte ou connectez-vous
2. Consultez le thème du jour
3. Uploadez votre dessin avant minuit
4. Après minuit, consultez la galerie de tous les dessins

### Pour les administrateurs
1. Accédez à `/admin`
2. Ajoutez des thèmes pour les jours à venir
3. Activez/désactivez les thèmes selon vos besoins

## Technologies utilisées

- **Next.js 15** - Framework React
- **TypeScript** - Typage statique
- **Supabase** - Authentification et base de données
- **Cloudinary** - Stockage d'images
- **Tailwind CSS** - Styling
- **React Dropzone** - Upload de fichiers

## Structure du projet

```
src/
├── app/                 # Pages Next.js
│   ├── admin/          # Page d'administration
│   └── page.tsx        # Page principale
├── components/         # Composants React
├── hooks/             # Hooks personnalisés
└── lib/               # Configuration et utilitaires
```

## Déploiement

L'application peut être déployée sur Vercel, Netlify ou tout autre service supportant Next.js.

N'oubliez pas de configurer les variables d'environnement sur votre plateforme de déploiement !
