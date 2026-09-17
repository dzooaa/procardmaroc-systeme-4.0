# CardForge — Générateur de cartes de visite digitales

Outil web 100% local (HTML / CSS / JavaScript, aucun framework, aucun serveur, aucune base de données) pour créer des cartes de visite digitales professionnelles et les exporter.

## Utilisation

1. Ouvrez `index.html` directement dans Chrome (double-clic, ou glisser-déposer dans le navigateur). Aucune installation requise.
2. Dans le menu **Créer une carte**, remplissez le formulaire : informations, contact, réseaux sociaux, thème.
3. L'aperçu à droite se met à jour en direct.
4. Cliquez sur **Créer la carte** pour l'enregistrer (stockage local du navigateur).
5. Utilisez les boutons d'export selon le besoin :
   - **Télécharger HTML** → fichier `.html` autonome, ouvrable dans n'importe quel navigateur.
   - **Télécharger VCard** → fichier `.vcf` importable dans les contacts d'un téléphone.
   - **Copier le lien** → copie un lien `data:` auto-suffisant (voir note ci-dessous).

## Gestion des profils

- **Mes cartes** : liste, modification, duplication, suppression.
- **Modèles** : thèmes prêts à l'emploi comme point de départ.
- **Exporter / Importer mes profils** (barre latérale) : sauvegarde/restauration de l'ensemble des profils au format `.json`.

Les profils sont stockés dans le `localStorage` du navigateur : ils restent disponibles après fermeture, mais **sont propres à ce navigateur et cet appareil**. Utilisez l'export JSON pour les transférer ailleurs ou en faire une sauvegarde.

## À propos du lien partageable (choix technique important)

Le projet fonctionne **sans serveur** : il n'y a donc pas de véritable URL hébergée. Le bouton **Copier le lien** génère un lien `data:` qui contient la carte HTML complète, encodée — il s'ouvre directement dans un navigateur sans hébergement.

Si vous déployez ce projet sur un vrai serveur / nom de domaine (par exemple pour un service de cartes NFC comme **ProCard Maroc**), il suffit d'adapter `handleCopyLink()` dans `script.js` pour pointer vers l'URL réelle de la carte plutôt que vers le lien `data:`.

## Dépendances externes

Aucune dépendance externe obligatoire pour le fonctionnement de l'outil. Seules les polices **Sora** / **Inter** sont chargées via Google Fonts pour l'interface d'administration (pas pour la carte exportée, qui utilise des polices système afin de rester 100% autonome). Sans connexion, l'interface utilise automatiquement les polices système de repli.

## Structure des fichiers

```
index.html   → structure de l'application (sidebar, formulaire, aperçu, modales)
style.css    → design system complet (thèmes, responsive, composants)
script.js    → toute la logique (état, rendu live, validation, exports, stockage)
README.md    → ce fichier
```

## Sécurité

Toutes les valeurs saisies par l'utilisateur sont échappées avant insertion dans le HTML généré (`esc()` dans `script.js`), afin d'éviter toute injection HTML/JavaScript. Les champs téléphone, email et URL sont validés avant d'être transformés en liens cliquables.

## Ce qui a été testé

- Création, modification, duplication et suppression de profils.
- Mise à jour en temps réel de l'aperçu sur chaque champ.
- Génération et téléchargement du fichier HTML autonome (ouvert et vérifié dans un navigateur).
- Génération du fichier `.vcf` (champs FN, ORG, TITLE, TEL, EMAIL, URL, ADR).
- Liens `tel:`, `https://wa.me/...`, `mailto:`, et liens de réseaux sociaux (Instagram, TikTok, LinkedIn, etc.).
- Sauvegarde et rechargement via `localStorage`.
- Export puis import d'un fichier JSON de profils.
- Affichage responsive (mobile et desktop) et mode plein écran de l'aperçu.
