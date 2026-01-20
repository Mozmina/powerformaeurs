#!/bin/sh

echo "🔄 Tentative de réparation légère..."

# 1. On supprime uniquement le fichier de verrouillage
if [ -f package-lock.json ]; then
    echo "Suppression de package-lock.json..."
    rm package-lock.json
fi

# 2. On nettoie le cache npm
echo "Nettoyage du cache npm..."
npm cache clean --force

# 3. Installation avec l'option --legacy-peer-deps
echo "📦 Installation des dépendances (mode permissif)..."
npm install --legacy-peer-deps

echo "✅ Terminé ! Essayez de lancer 'npm run dev' maintenant."