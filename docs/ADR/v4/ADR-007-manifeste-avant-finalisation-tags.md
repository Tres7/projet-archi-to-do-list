# Publication du manifeste avant finalisation des tags Docker définitifs

**Status:** Accepté

## Contexte

Le manifeste de déploiement (`deploy/manifests/manifest-X.Y.Z.yaml`) doit être la source de vérité de ce qui est déployable. Si les tags Docker définitifs (`version`, `main`) étaient posés avant que le manifeste correspondant ne soit validé et commité, il pourrait exister des images taguées comme « officielles » sans manifeste cohérent les référençant.

## Options

### Option 1 - Taguer les images définitivement dès leur publication

Poser les tags `version`/`sha`/`main` dès que les images candidates sont poussées sur le registre, indépendamment de la publication du manifeste.

### Option 2 - Manifeste publié d'abord, tags finalisés ensuite

`_main-publish-manifest.yml` construit le manifeste versionné à partir des métadonnées de release (digests des images candidates poussées), le valide contre le schéma et la matrice de compatibilité, puis le commite dans `main`. Ce n'est qu'après ce commit réussi que `_main-finalize-tags.yml` republie chaque image sous ses tags définitifs.

## Décision

L'option 2 est retenue : aucune image ne reçoit ses tags définitifs avant que le manifeste correspondant ne soit validé et commité dans le dépôt.

## Conséquences

### Positives (Bénéfices)

- Garantit l'invariant « toute image taguée `version` ou `main` est référencée par un manifeste commité » : pas d'image « orpheline » taguée comme officielle.
- En cas d'échec de validation du manifeste (schéma invalide, matrice de compatibilité non respectée), aucun tag définitif n'est posé, limitant le rayon d'impact de l'échec aux images candidates (éphémères, retention 1 jour).

### Négatives (Inconvénients)

- Allonge la chaîne de jobs séquentiels (`plan` → `verify` → `push` → `publish-manifest` → `finalize-tags`), donc le temps total avant qu'une image soit utilisable sous son tag définitif.
- Si `finalize-tags` échoue après que le manifeste a déjà été commité, le dépôt référence temporairement un manifeste dont les images ne portent pas encore leurs tags définitifs (le digest reste correct, seul le confort des tags lisibles est retardé).

### Impact futur

Cette séquence suppose un seul flux de publication actif à la fois sur `main` (pas de releases concurrentes) ; toute parallélisation future des releases devra réexaminer l'ordre manifeste-puis-tags pour éviter les races.
