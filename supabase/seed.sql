-- ===========================================================================
-- Données de démonstration — AtelierDigital
--
-- Généré depuis docs/CONTENT.md. Idempotent : réexécutable sans doublon.
--
-- ATTENTION : les URL de vidéos pointent vers le domaine réservé
-- `demo.invalid`, qui n'existe pas et n'existera jamais (RFC 2606). Les
-- lecteurs afficheront donc une erreur de chargement : c'est voulu, tant
-- qu'aucune vraie vidéo n'est renseignée depuis l'administration.
--
-- Aucune statistique de revenus, aucun témoignage : rien n'est inventé ici
-- en dehors du contenu pédagogique de démonstration.
--
-- Exécution :
--   psql "$DATABASE_URL" -f supabase/seed.sql
--   ou : Supabase Dashboard > SQL Editor > coller > Run
-- ===========================================================================

begin;

-- --- Parcours -------------------------------------------------------------
insert into public.levels (slug, name, description, sort_order, status)
values ('debutant', 'Débutant', 'Je pars de zéro et je veux lancer mon premier produit.', 0, 'published')
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, status = excluded.status;
insert into public.levels (slug, name, description, sort_order, status)
values ('intermediaire', 'Intermédiaire', 'J''ai lancé, je veux structurer et acquérir.', 1, 'published')
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, status = excluded.status;
insert into public.levels (slug, name, description, sort_order, status)
values ('avance', 'Avancé', 'Je veux scaler mon acquisition et mes marges.', 2, 'published')
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, status = excluded.status;

-- --- Domaines -------------------------------------------------------------
insert into public.subjects (slug, name, icon, color, description, sort_order, status)
values ('produit-digital', 'Produit digital', 'package', 'oklch(0.62 0.17 155)', 'De l''idée au produit livrable, sans y passer six mois.', 0, 'published')
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color,
      description = excluded.description, sort_order = excluded.sort_order,
      status = excluded.status;
insert into public.subjects (slug, name, icon, color, description, sort_order, status)
values ('media-buying', 'Media Buying', 'target', 'oklch(0.58 0.20 258)', 'Acheter du trafic qui rapporte plus qu''il ne coûte.', 1, 'published')
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color,
      description = excluded.description, sort_order = excluded.sort_order,
      status = excluded.status;
insert into public.subjects (slug, name, icon, color, description, sort_order, status)
values ('marketing-digital', 'Marketing digital', 'megaphone', 'oklch(0.63 0.18 45)', 'Attirer, capter et entretenir une audience.', 2, 'published')
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color,
      description = excluded.description, sort_order = excluded.sort_order,
      status = excluded.status;
insert into public.subjects (slug, name, icon, color, description, sort_order, status)
values ('vente-conversion', 'Vente & Conversion', 'trending-up', 'oklch(0.58 0.21 8)', 'Transformer l''attention en chiffre d''affaires.', 3, 'published')
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color,
      description = excluded.description, sort_order = excluded.sort_order,
      status = excluded.status;
insert into public.subjects (slug, name, icon, color, description, sort_order, status)
values ('business-ops', 'Business & Ops', 'settings-2', 'oklch(0.55 0.10 285)', 'Les outils, l''automatisation et le pilotage par les chiffres.', 4, 'published')
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, color = excluded.color,
      description = excluded.description, sort_order = excluded.sort_order,
      status = excluded.status;

-- --- Liaison parcours / domaines -----------------------------------------
-- Chaque domaine est proposé dans chaque parcours ; ce sont les formations
-- qui portent réellement le couple (parcours, domaine).
insert into public.level_subjects (level_id, subject_id, sort_order)
select l.id, s.id, s.sort_order
from public.levels l cross join public.subjects s
on conflict (level_id, subject_id) do update set sort_order = excluded.sort_order;


-- ===========================================================================
-- Trouver et valider son idée de produit
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'trouver-valider-son-idee', 'Trouver et valider son idée de produit', 'Arrêtez de créer avant de savoir si quelqu''un achètera. La méthode pour valider en deux semaines.', 'La plus grande perte de temps dans le digital n''est pas un mauvais tunnel : c''est un bon produit que personne ne voulait.

Cette formation inverse l''ordre habituel. Vous validez d''abord, vous créez ensuite. À la fin, vous saurez si votre idée tient — et vous aurez déjà des personnes prêtes à payer.

## Ce que vous saurez faire

- Identifier un problème que des gens paient déjà pour résoudre
- Analyser une concurrence sans vous décourager ni vous rassurer à tort
- Tester la demande **avant** de produire quoi que ce soit
- Choisir le format de produit qui correspond à votre marché',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'produit-digital'),
    'beginner', 'published', 0, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Comprendre son marché', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le problème avant la solution', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'pourquoi-la-plupart-des-produits-digitaux-echouent', 'Pourquoi la plupart des produits digitaux échouent',
          '## Pourquoi la plupart des produits digitaux échouent

Cette leçon fait partie du chapitre « Le problème avant la solution », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Pourquoi la plupart des produits digitaux échouent', 'native',
          'https://demo.invalid/trouver-valider-son-idee/pourquoi-la-plupart-des-produits-digitaux-echouent.mp4',
          540, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'identifier-un-probleme-qui-se-paie', 'Identifier un problème qui se paie',
          '## Identifier un problème qui se paie

Cette leçon fait partie du chapitre « Le problème avant la solution », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Identifier un problème qui se paie', 'native',
          'https://demo.invalid/trouver-valider-son-idee/identifier-un-probleme-qui-se-paie.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-test-des-trois-questions', 'Le test des trois questions',
          '## Le test des trois questions

Cette leçon fait partie du chapitre « Le problème avant la solution », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 480, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le test des trois questions', 'native',
          'https://demo.invalid/trouver-valider-son-idee/le-test-des-trois-questions.mp4',
          480, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Étude de marché en pratique', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ou-trouver-votre-audience-en-ligne', 'Où trouver votre audience en ligne',
          '## Où trouver votre audience en ligne

Cette leçon fait partie du chapitre « Étude de marché en pratique », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Où trouver votre audience en ligne', 'native',
          'https://demo.invalid/trouver-valider-son-idee/ou-trouver-votre-audience-en-ligne.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'lire-les-avis-pour-trouver-les-manques', 'Lire les avis pour trouver les manques',
          '## Lire les avis pour trouver les manques

Cette leçon fait partie du chapitre « Étude de marché en pratique », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Lire les avis pour trouver les manques', 'native',
          'https://demo.invalid/trouver-valider-son-idee/lire-les-avis-pour-trouver-les-manques.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'interroger-10-personnes-sans-les-influencer', 'Interroger 10 personnes sans les influencer',
          '## Interroger 10 personnes sans les influencer

Cette leçon fait partie du chapitre « Étude de marché en pratique », dans le module « Comprendre son marché ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Interroger 10 personnes sans les influencer', 'native',
          'https://demo.invalid/trouver-valider-son-idee/interroger-10-personnes-sans-les-influencer.mp4',
          840, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Comprendre son marché',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Le meilleur signal de validation d''une idée est :', 'Seul l''engagement financier prouve la valeur perçue. Tout le reste est une opinion gratuite.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Des gens qui paient avant que le produit existe', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Des retours enthousiastes de proches', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Un grand nombre de recherches mensuelles', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'L''absence de concurrence', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'L''absence de concurrence sur un marché est généralement bon signe.', 'L''absence de concurrence signifie le plus souvent qu''il n''y a pas de marché. Des concurrents prouvent que quelqu''un paie.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Lors d''un entretien de validation, il faut surtout :', '« Qu''avez-vous fait la dernière fois que ce problème s''est posé ? » vaut mille « est-ce que vous achèteriez ? ».', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Interroger le passé du client, pas ses intentions futures', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Présenter votre solution en détail', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Demander si l''idée plaît', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Annoncer votre prix', false, null, 3);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Analyser la concurrence', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Cartographier le paysage', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recenser-les-offres-existantes', 'Recenser les offres existantes',
          '## Recenser les offres existantes

Cette leçon fait partie du chapitre « Cartographier le paysage », dans le module « Analyser la concurrence ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Recenser les offres existantes', 'native',
          'https://demo.invalid/trouver-valider-son-idee/recenser-les-offres-existantes.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'decortiquer-une-page-de-vente-concurrente', 'Décortiquer une page de vente concurrente',
          '## Décortiquer une page de vente concurrente

Cette leçon fait partie du chapitre « Cartographier le paysage », dans le module « Analyser la concurrence ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Décortiquer une page de vente concurrente', 'native',
          'https://demo.invalid/trouver-valider-son-idee/decortiquer-une-page-de-vente-concurrente.mp4',
          900, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Trouver son angle', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-differenciation-par-le-public-pas-par-la-fonctionnalite', 'La différenciation par le public, pas par la fonctionnalité',
          '## La différenciation par le public, pas par la fonctionnalité

Cette leçon fait partie du chapitre « Trouver son angle », dans le module « Analyser la concurrence ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La différenciation par le public, pas par la fonctionnalité', 'native',
          'https://demo.invalid/trouver-valider-son-idee/la-differenciation-par-le-public-pas-par-la-fonctionnalite.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'positionner-son-offre-en-une-phrase', 'Positionner son offre en une phrase',
          '## Positionner son offre en une phrase

Cette leçon fait partie du chapitre « Trouver son angle », dans le module « Analyser la concurrence ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Positionner son offre en une phrase', 'native',
          'https://demo.invalid/trouver-valider-son-idee/positionner-son-offre-en-une-phrase.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Tester la demande avant de créer', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les méthodes de validation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'page-de-pre-vente-le-test-le-plus-honnete', 'Page de pré-vente : le test le plus honnête',
          '## Page de pré-vente : le test le plus honnête

Cette leçon fait partie du chapitre « Les méthodes de validation », dans le module « Tester la demande avant de créer ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Page de pré-vente : le test le plus honnête', 'native',
          'https://demo.invalid/trouver-valider-son-idee/page-de-pre-vente-le-test-le-plus-honnete.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'vendre-avant-de-produire-cadre-et-limites', 'Vendre avant de produire : cadre et limites',
          '## Vendre avant de produire : cadre et limites

Cette leçon fait partie du chapitre « Les méthodes de validation », dans le module « Tester la demande avant de créer ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Vendre avant de produire : cadre et limites', 'native',
          'https://demo.invalid/trouver-valider-son-idee/vendre-avant-de-produire-cadre-et-limites.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'interpreter-les-signaux-faibles', 'Interpréter les signaux faibles',
          '## Interpréter les signaux faibles

Cette leçon fait partie du chapitre « Les méthodes de validation », dans le module « Tester la demande avant de créer ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Interpréter les signaux faibles', 'native',
          'https://demo.invalid/trouver-valider-son-idee/interpreter-les-signaux-faibles.mp4',
          600, 0);

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'open_answer', 'Rédiger votre test de validation', 'Décrivez en cinq lignes le test que vous allez mener cette semaine pour valider votre idée : ce que vous mettez en ligne, à qui vous l''envoyez, et le seuil chiffré au-dessous duquel vous considérerez l''idée non validée.', null,
          null, 'Un bon test comporte trois éléments : un artefact concret (page de pré-vente, formulaire de précommande), une source de trafic identifiée (communauté, liste, publicité à petit budget), et **un seuil défini à l''avance**.

Le seuil est la partie que tout le monde oublie. Sans lui, n''importe quel résultat sera interprété comme encourageant.', 'beginner', 0, 'published');

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Choisir son format', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le bon produit pour le bon marché', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'formation-ebook-template-accompagnement-comment-choisir', 'Formation, ebook, template, accompagnement : comment choisir',
          '## Formation, ebook, template, accompagnement : comment choisir

Cette leçon fait partie du chapitre « Le bon produit pour le bon marché », dans le module « Choisir son format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Formation, ebook, template, accompagnement : comment choisir', 'native',
          'https://demo.invalid/trouver-valider-son-idee/formation-ebook-template-accompagnement-comment-choisir.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'estimer-le-temps-de-production-reel', 'Estimer le temps de production réel',
          '## Estimer le temps de production réel

Cette leçon fait partie du chapitre « Le bon produit pour le bon marché », dans le module « Choisir son format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Estimer le temps de production réel', 'native',
          'https://demo.invalid/trouver-valider-son-idee/estimer-le-temps-de-production-reel.mp4',
          540, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Créer sa formation en ligne
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'creer-sa-formation-en-ligne', 'Créer sa formation en ligne', 'Structurer, tourner et livrer une formation que les gens terminent vraiment.', 'Une formation qui ne se termine pas ne se recommande pas. Ici, on construit un programme conçu pour être **fini**, pas seulement acheté.

Matériel abordable, tournage sans studio, montage minimal : l''objectif est de sortir un produit propre sans y consacrer six mois.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'produit-digital'),
    'beginner', 'published', 1, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Structurer le programme', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Du résultat vers le plan', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'partir-de-la-transformation-promise', 'Partir de la transformation promise',
          '## Partir de la transformation promise

Cette leçon fait partie du chapitre « Du résultat vers le plan », dans le module « Structurer le programme ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Partir de la transformation promise', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/partir-de-la-transformation-promise.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'decouper-en-modules-et-chapitres', 'Découper en modules et chapitres',
          '## Découper en modules et chapitres

Cette leçon fait partie du chapitre « Du résultat vers le plan », dans le module « Structurer le programme ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Découper en modules et chapitres', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/decouper-en-modules-et-chapitres.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-lecon-de-8-minutes-pourquoi-ca-marche', 'La leçon de 8 minutes : pourquoi ça marche',
          '## La leçon de 8 minutes : pourquoi ça marche

Cette leçon fait partie du chapitre « Du résultat vers le plan », dans le module « Structurer le programme ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 480, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La leçon de 8 minutes : pourquoi ça marche', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/la-lecon-de-8-minutes-pourquoi-ca-marche.mp4',
          480, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Scénariser une leçon', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-trame-en-quatre-temps', 'La trame en quatre temps',
          '## La trame en quatre temps

Cette leçon fait partie du chapitre « Scénariser une leçon », dans le module « Structurer le programme ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La trame en quatre temps', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/la-trame-en-quatre-temps.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ecrire-un-script-qui-ne-s-entend-pas', 'Écrire un script qui ne s''entend pas',
          '## Écrire un script qui ne s''entend pas

Cette leçon fait partie du chapitre « Scénariser une leçon », dans le module « Structurer le programme ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Écrire un script qui ne s''entend pas', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/ecrire-un-script-qui-ne-s-entend-pas.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Matériel et tournage', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'S''équiper sans se ruiner', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'micro-lumiere-camera-l-ordre-des-priorites', 'Micro, lumière, caméra : l''ordre des priorités',
          '## Micro, lumière, caméra : l''ordre des priorités

Cette leçon fait partie du chapitre « S''équiper sans se ruiner », dans le module « Matériel et tournage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Micro, lumière, caméra : l''ordre des priorités', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/micro-lumiere-camera-l-ordre-des-priorites.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'regler-son-cadre-une-fois-pour-toutes', 'Régler son cadre une fois pour toutes',
          '## Régler son cadre une fois pour toutes

Cette leçon fait partie du chapitre « S''équiper sans se ruiner », dans le module « Matériel et tournage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Régler son cadre une fois pour toutes', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/regler-son-cadre-une-fois-pour-toutes.mp4',
          540, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Tourner efficacement', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'enregistrer-son-ecran-proprement', 'Enregistrer son écran proprement',
          '## Enregistrer son écran proprement

Cette leçon fait partie du chapitre « Tourner efficacement », dans le module « Matériel et tournage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Enregistrer son écran proprement', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/enregistrer-son-ecran-proprement.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'tourner-plusieurs-lecons-d-affilee', 'Tourner plusieurs leçons d''affilée',
          '## Tourner plusieurs leçons d''affilée

Cette leçon fait partie du chapitre « Tourner efficacement », dans le module « Matériel et tournage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Tourner plusieurs leçons d''affilée', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/tourner-plusieurs-lecons-d-affilee.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Montage et hébergement', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Un montage minimal mais net', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'couper-respirer-enchainer', 'Couper, respirer, enchaîner',
          '## Couper, respirer, enchaîner

Cette leçon fait partie du chapitre « Un montage minimal mais net », dans le module « Montage et hébergement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Couper, respirer, enchaîner', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/couper-respirer-enchainer.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'exporter-au-bon-format-et-au-bon-poids', 'Exporter au bon format et au bon poids',
          '## Exporter au bon format et au bon poids

Cette leçon fait partie du chapitre « Un montage minimal mais net », dans le module « Montage et hébergement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Exporter au bon format et au bon poids', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/exporter-au-bon-format-et-au-bon-poids.mp4',
          600, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Héberger ses vidéos', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'comparer-les-solutions-d-hebergement', 'Comparer les solutions d''hébergement',
          '## Comparer les solutions d''hébergement

Cette leçon fait partie du chapitre « Héberger ses vidéos », dans le module « Montage et hébergement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Comparer les solutions d''hébergement', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/comparer-les-solutions-d-hebergement.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'mettre-en-ligne-et-verifier-la-lecture', 'Mettre en ligne et vérifier la lecture',
          '## Mettre en ligne et vérifier la lecture

Cette leçon fait partie du chapitre « Héberger ses vidéos », dans le module « Montage et hébergement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Mettre en ligne et vérifier la lecture', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/mettre-en-ligne-et-verifier-la-lecture.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Mise en ligne', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Livrer la formation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'organiser-l-acces-et-l-onboarding', 'Organiser l''accès et l''onboarding',
          '## Organiser l''accès et l''onboarding

Cette leçon fait partie du chapitre « Livrer la formation », dans le module « Mise en ligne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Organiser l''accès et l''onboarding', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/organiser-l-acces-et-l-onboarding.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recueillir-les-premiers-retours', 'Recueillir les premiers retours',
          '## Recueillir les premiers retours

Cette leçon fait partie du chapitre « Livrer la formation », dans le module « Mise en ligne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Recueillir les premiers retours', 'native',
          'https://demo.invalid/creer-sa-formation-en-ligne/recueillir-les-premiers-retours.mp4',
          540, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Créer un produit léger : ebook, template, Notion
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'produit-leger-ebook-template', 'Créer un produit léger : ebook, template, Notion', 'Le produit qui se conçoit en un week-end et se vend en automatique.', 'Tout le monde n''a pas besoin d''une formation de 40 heures. Un template bien pensé, un ebook court et utile ou un système Notion peuvent générer des ventes dès la première semaine.

C''est aussi le meilleur moyen de tester un marché avant d''investir dans un produit lourd.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'produit-digital'),
    'beginner', 'published', 2, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Choisir le bon format', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Trois formats, trois usages', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ebook-template-ou-systeme-qui-achete-quoi', 'Ebook, template ou système : qui achète quoi',
          '## Ebook, template ou système : qui achète quoi

Cette leçon fait partie du chapitre « Trois formats, trois usages », dans le module « Choisir le bon format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ebook, template ou système : qui achète quoi', 'native',
          'https://demo.invalid/produit-leger-ebook-template/ebook-template-ou-systeme-qui-achete-quoi.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'evaluer-l-effort-de-production', 'Évaluer l''effort de production',
          '## Évaluer l''effort de production

Cette leçon fait partie du chapitre « Trois formats, trois usages », dans le module « Choisir le bon format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 480, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Évaluer l''effort de production', 'native',
          'https://demo.invalid/produit-leger-ebook-template/evaluer-l-effort-de-production.mp4',
          480, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Production rapide', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Écrire vite et bien', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-plan-en-une-page', 'Le plan en une page',
          '## Le plan en une page

Cette leçon fait partie du chapitre « Écrire vite et bien », dans le module « Production rapide ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le plan en une page', 'native',
          'https://demo.invalid/produit-leger-ebook-template/le-plan-en-une-page.mp4',
          540, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rediger-30-pages-utiles-en-trois-sessions', 'Rédiger 30 pages utiles en trois sessions',
          '## Rédiger 30 pages utiles en trois sessions

Cette leçon fait partie du chapitre « Écrire vite et bien », dans le module « Production rapide ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rédiger 30 pages utiles en trois sessions', 'native',
          'https://demo.invalid/produit-leger-ebook-template/rediger-30-pages-utiles-en-trois-sessions.mp4',
          840, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Construire un template', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'anatomie-d-un-template-qu-on-reutilise', 'Anatomie d''un template qu''on réutilise',
          '## Anatomie d''un template qu''on réutilise

Cette leçon fait partie du chapitre « Construire un template », dans le module « Production rapide ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Anatomie d''un template qu''on réutilise', 'native',
          'https://demo.invalid/produit-leger-ebook-template/anatomie-d-un-template-qu-on-reutilise.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'documenter-pour-que-ce-soit-utilisable-sans-vous', 'Documenter pour que ce soit utilisable sans vous',
          '## Documenter pour que ce soit utilisable sans vous

Cette leçon fait partie du chapitre « Construire un template », dans le module « Production rapide ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Documenter pour que ce soit utilisable sans vous', 'native',
          'https://demo.invalid/produit-leger-ebook-template/documenter-pour-que-ce-soit-utilisable-sans-vous.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Design et mise en page', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Un rendu professionnel sans designer', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'typographie-marges-hierarchie', 'Typographie, marges, hiérarchie',
          '## Typographie, marges, hiérarchie

Cette leçon fait partie du chapitre « Un rendu professionnel sans designer », dans le module « Design et mise en page ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Typographie, marges, hiérarchie', 'native',
          'https://demo.invalid/produit-leger-ebook-template/typographie-marges-hierarchie.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'creer-une-couverture-qui-donne-envie', 'Créer une couverture qui donne envie',
          '## Créer une couverture qui donne envie

Cette leçon fait partie du chapitre « Un rendu professionnel sans designer », dans le module « Design et mise en page ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Créer une couverture qui donne envie', 'native',
          'https://demo.invalid/produit-leger-ebook-template/creer-une-couverture-qui-donne-envie.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Livraison automatisée', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Vendre pendant qu''on dort', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'relier-paiement-et-livraison', 'Relier paiement et livraison',
          '## Relier paiement et livraison

Cette leçon fait partie du chapitre « Vendre pendant qu''on dort », dans le module « Livraison automatisée ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Relier paiement et livraison', 'native',
          'https://demo.invalid/produit-leger-ebook-template/relier-paiement-et-livraison.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'gerer-les-remboursements-et-le-support', 'Gérer les remboursements et le support',
          '## Gérer les remboursements et le support

Cette leçon fait partie du chapitre « Vendre pendant qu''on dort », dans le module « Livraison automatisée ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 480, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Gérer les remboursements et le support', 'native',
          'https://demo.invalid/produit-leger-ebook-template/gerer-les-remboursements-et-le-support.mp4',
          480, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Construire son offre irrésistible
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'offre-irresistible', 'Construire son offre irrésistible', 'Promesse, architecture, prix, garanties : l''assemblage qui fait basculer la décision.', 'Deux produits identiques, deux résultats opposés. La différence n''est presque jamais dans le contenu : elle est dans la façon dont l''offre est construite et présentée.

Cette formation traite l''offre comme un objet à concevoir, pas comme un prix à choisir au hasard.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'produit-digital'),
    'intermediate', 'published', 3, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Promesse et positionnement', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'La promesse', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qu-est-une-promesse-specifique', 'Ce qu''est une promesse spécifique',
          '## Ce qu''est une promesse spécifique

Cette leçon fait partie du chapitre « La promesse », dans le module « Promesse et positionnement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qu''est une promesse spécifique', 'native',
          'https://demo.invalid/offre-irresistible/ce-qu-est-une-promesse-specifique.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-cinq-promesses-qui-ne-fonctionnent-plus', 'Les cinq promesses qui ne fonctionnent plus',
          '## Les cinq promesses qui ne fonctionnent plus

Cette leçon fait partie du chapitre « La promesse », dans le module « Promesse et positionnement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les cinq promesses qui ne fonctionnent plus', 'native',
          'https://demo.invalid/offre-irresistible/les-cinq-promesses-qui-ne-fonctionnent-plus.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'formuler-la-sienne-en-une-phrase-testable', 'Formuler la sienne en une phrase testable',
          '## Formuler la sienne en une phrase testable

Cette leçon fait partie du chapitre « La promesse », dans le module « Promesse et positionnement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Formuler la sienne en une phrase testable', 'native',
          'https://demo.invalid/offre-irresistible/formuler-la-sienne-en-une-phrase-testable.mp4',
          780, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Architecture de l''offre', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Assembler les composants', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'c-ur-accelerateurs-et-reducteurs-de-risque', 'Cœur, accélérateurs et réducteurs de risque',
          '## Cœur, accélérateurs et réducteurs de risque

Cette leçon fait partie du chapitre « Assembler les composants », dans le module « Architecture de l''offre ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Cœur, accélérateurs et réducteurs de risque', 'native',
          'https://demo.invalid/offre-irresistible/c-ur-accelerateurs-et-reducteurs-de-risque.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'empiler-sans-noyer-la-regle-des-sept', 'Empiler sans noyer : la règle des sept',
          '## Empiler sans noyer : la règle des sept

Cette leçon fait partie du chapitre « Assembler les composants », dans le module « Architecture de l''offre ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Empiler sans noyer : la règle des sept', 'native',
          'https://demo.invalid/offre-irresistible/empiler-sans-noyer-la-regle-des-sept.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Pricing et ancrage', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Fixer un prix défendable', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'prix-par-la-valeur-pas-par-le-temps-passe', 'Prix par la valeur, pas par le temps passé',
          '## Prix par la valeur, pas par le temps passé

Cette leçon fait partie du chapitre « Fixer un prix défendable », dans le module « Pricing et ancrage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Prix par la valeur, pas par le temps passé', 'native',
          'https://demo.invalid/offre-irresistible/prix-par-la-valeur-pas-par-le-temps-passe.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ancrage-et-effet-de-contraste', 'Ancrage et effet de contraste',
          '## Ancrage et effet de contraste

Cette leçon fait partie du chapitre « Fixer un prix défendable », dans le module « Pricing et ancrage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ancrage et effet de contraste', 'native',
          'https://demo.invalid/offre-irresistible/ancrage-et-effet-de-contraste.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'paiement-en-plusieurs-fois-quand-et-comment', 'Paiement en plusieurs fois : quand et comment',
          '## Paiement en plusieurs fois : quand et comment

Cette leçon fait partie du chapitre « Fixer un prix défendable », dans le module « Pricing et ancrage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Paiement en plusieurs fois : quand et comment', 'native',
          'https://demo.invalid/offre-irresistible/paiement-en-plusieurs-fois-quand-et-comment.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Garanties et bonus', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Réduire le risque perçu', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-garanties-qui-rassurent-sans-vous-exposer', 'Les garanties qui rassurent sans vous exposer',
          '## Les garanties qui rassurent sans vous exposer

Cette leçon fait partie du chapitre « Réduire le risque perçu », dans le module « Garanties et bonus ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les garanties qui rassurent sans vous exposer', 'native',
          'https://demo.invalid/offre-irresistible/les-garanties-qui-rassurent-sans-vous-exposer.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'des-bonus-utiles-pas-du-remplissage', 'Des bonus utiles, pas du remplissage',
          '## Des bonus utiles, pas du remplissage

Cette leçon fait partie du chapitre « Réduire le risque perçu », dans le module « Garanties et bonus ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Des bonus utiles, pas du remplissage', 'native',
          'https://demo.invalid/offre-irresistible/des-bonus-utiles-pas-du-remplissage.mp4',
          600, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Fondamentaux du media buying
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'fondamentaux-media-buying', 'Fondamentaux du media buying', 'CPM, CTR, CPA, ROAS, LTV : comprendre les chiffres avant de dépenser un euro.', 'La publicité payante n''est pas un art : c''est une opération comptable menée à grande vitesse. Tant que le vocabulaire et les seuils de rentabilité ne sont pas maîtrisés, chaque euro dépensé est une devinette.

Cette formation pose les bases sans lesquelles toutes les autres formations Media Buying seraient inutilisables.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'media-buying'),
    'beginner', 'published', 4, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Le vocabulaire indispensable', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les métriques d''exposition', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'impressions-portee-frequence', 'Impressions, portée, fréquence',
          '## Impressions, portée, fréquence

Cette leçon fait partie du chapitre « Les métriques d''exposition », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Impressions, portée, fréquence', 'native',
          'https://demo.invalid/fondamentaux-media-buying/impressions-portee-frequence.mp4',
          540, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'cpm-ce-qu-il-dit-vraiment-de-votre-audience', 'CPM : ce qu''il dit vraiment de votre audience',
          '## CPM : ce qu''il dit vraiment de votre audience

Cette leçon fait partie du chapitre « Les métriques d''exposition », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'CPM : ce qu''il dit vraiment de votre audience', 'native',
          'https://demo.invalid/fondamentaux-media-buying/cpm-ce-qu-il-dit-vraiment-de-votre-audience.mp4',
          660, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les métriques d''engagement', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ctr-le-signal-le-plus-rapide', 'CTR : le signal le plus rapide',
          '## CTR : le signal le plus rapide

Cette leçon fait partie du chapitre « Les métriques d''engagement », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'CTR : le signal le plus rapide', 'native',
          'https://demo.invalid/fondamentaux-media-buying/ctr-le-signal-le-plus-rapide.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'cpc-et-qualite-du-clic', 'CPC et qualité du clic',
          '## CPC et qualité du clic

Cette leçon fait partie du chapitre « Les métriques d''engagement », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'CPC et qualité du clic', 'native',
          'https://demo.invalid/fondamentaux-media-buying/cpc-et-qualite-du-clic.mp4',
          540, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les métriques de résultat', 2, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'cpa-roas-aov-le-trio-decisif', 'CPA, ROAS, AOV : le trio décisif',
          '## CPA, ROAS, AOV : le trio décisif

Cette leçon fait partie du chapitre « Les métriques de résultat », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'CPA, ROAS, AOV : le trio décisif', 'native',
          'https://demo.invalid/fondamentaux-media-buying/cpa-roas-aov-le-trio-decisif.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ltv-pourquoi-elle-change-tout', 'LTV : pourquoi elle change tout',
          '## LTV : pourquoi elle change tout

Cette leçon fait partie du chapitre « Les métriques de résultat », dans le module « Le vocabulaire indispensable ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'LTV : pourquoi elle change tout', 'native',
          'https://demo.invalid/fondamentaux-media-buying/ltv-pourquoi-elle-change-tout.mp4',
          720, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Le vocabulaire du media buying',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Que mesure le CPM ?', 'CPM signifie « coût pour mille impressions ». Il indique le prix de l''accès à une audience, pas la performance de la publicité.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le coût pour 1 000 impressions', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le coût par clic', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le coût par conversion', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le coût par mille clics', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Un CTR élevé mais un CPA élevé indique le plus souvent :', 'Les gens cliquent — donc la créative fonctionne — mais ne convertissent pas. Le problème se situe presque toujours après le clic.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Un décalage entre la promesse de la publicité et la page de destination', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Une audience trop large', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Un budget insuffisant', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Un problème d''enchère', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Lesquelles de ces métriques dépendent du prix de vente de votre produit ?', 'ROAS et AOV sont exprimés en chiffre d''affaires, donc liés au prix. CPM et CTR concernent la diffusion et l''engagement.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'ROAS', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'AOV', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'CPM', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'CTR', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Un ROAS de 2 signifie toujours que la campagne est rentable.', 'Le ROAS compare le chiffre d''affaires à la dépense publicitaire, sans tenir compte du coût du produit, des frais ni des taxes. Avec 60 % de coûts, un ROAS de 2 est déficitaire.', 1, 3)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'short_answer', 'Quel indicateur mesure la valeur totale d''un client sur toute sa durée de vie ? (sigle)', 'LTV, pour « lifetime value ». C''est elle qui détermine combien vous pouvez réellement payer pour acquérir un client.', 1, 4)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'LTV', true, 'LTV', 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Lire un tableau de bord', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Sortir du bruit', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-colonnes-a-afficher-celles-a-masquer', 'Les colonnes à afficher, celles à masquer',
          '## Les colonnes à afficher, celles à masquer

Cette leçon fait partie du chapitre « Sortir du bruit », dans le module « Lire un tableau de bord ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les colonnes à afficher, celles à masquer', 'native',
          'https://demo.invalid/fondamentaux-media-buying/les-colonnes-a-afficher-celles-a-masquer.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'distinguer-une-variation-d-une-tendance', 'Distinguer une variation d''une tendance',
          '## Distinguer une variation d''une tendance

Cette leçon fait partie du chapitre « Sortir du bruit », dans le module « Lire un tableau de bord ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Distinguer une variation d''une tendance', 'native',
          'https://demo.invalid/fondamentaux-media-buying/distinguer-une-variation-d-une-tendance.mp4',
          780, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Unit economics', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'La rentabilité, ligne par ligne', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'calculer-sa-marge-reelle', 'Calculer sa marge réelle',
          '## Calculer sa marge réelle

Cette leçon fait partie du chapitre « La rentabilité, ligne par ligne », dans le module « Unit economics ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Calculer sa marge réelle', 'native',
          'https://demo.invalid/fondamentaux-media-buying/calculer-sa-marge-reelle.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'seuil-de-rentabilite-par-campagne', 'Seuil de rentabilité par campagne',
          '## Seuil de rentabilité par campagne

Cette leçon fait partie du chapitre « La rentabilité, ligne par ligne », dans le module « Unit economics ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Seuil de rentabilité par campagne', 'native',
          'https://demo.invalid/fondamentaux-media-buying/seuil-de-rentabilite-par-campagne.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'combien-pouvez-vous-payer-un-client', 'Combien pouvez-vous payer un client ?',
          '## Combien pouvez-vous payer un client ?

Cette leçon fait partie du chapitre « La rentabilité, ligne par ligne », dans le module « Unit economics ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Combien pouvez-vous payer un client ?', 'native',
          'https://demo.invalid/fondamentaux-media-buying/combien-pouvez-vous-payer-un-client.mp4',
          660, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Calculateur de rentabilité (tableur)', 'Marge, CPA maximum et seuil de rentabilité, à remplir avec vos chiffres.',
          'https://demo.invalid/fondamentaux-media-buying/ressources/calculateur-de-rentabilite-tableur', 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', 'Aide-mémoire des métriques', 'Une page à garder à côté de l''écran : définitions et formules.',
          'https://demo.invalid/fondamentaux-media-buying/ressources/aide-memoire-des-metriques', 1);

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'numeric', 'Calculer votre CPA maximum', 'Votre produit se vend **149 €**. Vos coûts directs (paiement, hébergement, support) représentent **29 €** par vente.

Quel est le CPA maximum acceptable pour rester à l''équilibre, en euros ?', '120',
          0.01, 'Marge unitaire = 149 − 29 = **120 €**.

Au-delà de 120 € dépensés pour acquérir un client, chaque vente vous fait perdre de l''argent. En pratique, on vise nettement en dessous pour dégager une marge.', 'beginner', 0, 'published');

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'open_answer', 'Diagnostiquer une campagne', 'Une campagne affiche : CPM 12 €, CTR 2,8 %, CPC 0,43 €, taux de conversion de la page 0,4 %, CPA 107 €. Votre CPA cible est de 60 €.

Où se situe le problème et que testez-vous en premier ?', null,
          null, 'Le CPM et le CTR sont sains : la créative fonctionne et l''audience est atteinte à un prix normal. Le problème est le taux de conversion de la page (0,4 % est très faible pour du trafic déjà qualifié par le clic).

Premier test : la page de destination, pas la publicité. Vérifier d''abord la cohérence entre la promesse de la publicité et le titre de la page.', 'beginner', 1, 'published');

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Unit economics',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Vous vendez un produit 100 €, avec 30 € de coûts. Quel CPA maximum pour être à l''équilibre ?', 'Marge unitaire = 100 − 30 = 70 €. Au-delà de 70 € d''acquisition, chaque vente vous coûte de l''argent.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, '70 €', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, '100 €', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, '30 €', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, '50 €', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Le seuil de rentabilité d''une campagne se calcule à partir :', 'Seuls la marge et le coût d''acquisition déterminent si une vente vous enrichit. Le reste sont des indicateurs intermédiaires.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'De la marge unitaire et du CPA', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Du CPM et du CTR', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Du budget quotidien', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Du nombre d''impressions', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Un produit à forte LTV permet d''accepter un CPA supérieur à la marge de la première vente.', 'C''est même le principal intérêt de connaître sa LTV : elle autorise à perdre de l''argent sur la première vente si les suivantes compensent.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', false, null, 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Budget et pilotage', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Décider quoi faire avec les chiffres', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'budget-de-test-contre-budget-de-scaling', 'Budget de test contre budget de scaling',
          '## Budget de test contre budget de scaling

Cette leçon fait partie du chapitre « Décider quoi faire avec les chiffres », dans le module « Budget et pilotage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Budget de test contre budget de scaling', 'native',
          'https://demo.invalid/fondamentaux-media-buying/budget-de-test-contre-budget-de-scaling.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'quand-couper-quand-attendre', 'Quand couper, quand attendre',
          '## Quand couper, quand attendre

Cette leçon fait partie du chapitre « Décider quoi faire avec les chiffres », dans le module « Budget et pilotage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Quand couper, quand attendre', 'native',
          'https://demo.invalid/fondamentaux-media-buying/quand-couper-quand-attendre.mp4',
          780, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Meta Ads de A à Z
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'meta-ads-de-a-a-z', 'Meta Ads de A à Z', 'Business Manager, pixel, structure de compte, scaling : la formation de référence.', 'Meta reste le canal le plus accessible pour un produit digital — et le plus impitoyable quand la structure est mauvaise.

Du Business Manager au scaling, chaque étape est traitée dans l''ordre où vous en aurez besoin. Le module sur le diagnostic des campagnes qui chutent est celui que la plupart des formations oublient.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'media-buying'),
    'intermediate', 'published', 5, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Business Manager et sécurité', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Mettre en place son compte', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'creer-un-business-manager-propre', 'Créer un Business Manager propre',
          '## Créer un Business Manager propre

Cette leçon fait partie du chapitre « Mettre en place son compte », dans le module « Business Manager et sécurité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Créer un Business Manager propre', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/creer-un-business-manager-propre.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'roles-acces-et-partenaires', 'Rôles, accès et partenaires',
          '## Rôles, accès et partenaires

Cette leçon fait partie du chapitre « Mettre en place son compte », dans le module « Business Manager et sécurité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rôles, accès et partenaires', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/roles-acces-et-partenaires.mp4',
          600, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Protéger son actif', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'eviter-le-blocage-de-compte', 'Éviter le blocage de compte',
          '## Éviter le blocage de compte

Cette leçon fait partie du chapitre « Protéger son actif », dans le module « Business Manager et sécurité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Éviter le blocage de compte', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/eviter-le-blocage-de-compte.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'que-faire-en-cas-de-restriction', 'Que faire en cas de restriction',
          '## Que faire en cas de restriction

Cette leçon fait partie du chapitre « Protéger son actif », dans le module « Business Manager et sécurité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Que faire en cas de restriction', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/que-faire-en-cas-de-restriction.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Pixel et Conversions API', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Installer le suivi', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'poser-le-pixel-correctement', 'Poser le pixel correctement',
          '## Poser le pixel correctement

Cette leçon fait partie du chapitre « Installer le suivi », dans le module « Pixel et Conversions API ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Poser le pixel correctement', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/poser-le-pixel-correctement.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'evenements-standard-et-personnalises', 'Événements standard et personnalisés',
          '## Événements standard et personnalisés

Cette leçon fait partie du chapitre « Installer le suivi », dans le module « Pixel et Conversions API ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Événements standard et personnalisés', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/evenements-standard-et-personnalises.mp4',
          780, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Fiabiliser les données', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'conversions-api-pourquoi-c-est-devenu-obligatoire', 'Conversions API : pourquoi c''est devenu obligatoire',
          '## Conversions API : pourquoi c''est devenu obligatoire

Cette leçon fait partie du chapitre « Fiabiliser les données », dans le module « Pixel et Conversions API ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Conversions API : pourquoi c''est devenu obligatoire', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/conversions-api-pourquoi-c-est-devenu-obligatoire.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'deduplication-et-verification', 'Déduplication et vérification',
          '## Déduplication et vérification

Cette leçon fait partie du chapitre « Fiabiliser les données », dans le module « Pixel et Conversions API ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Déduplication et vérification', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/deduplication-et-verification.mp4',
          720, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Pixel et Conversions API',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'À quoi sert la déduplication entre pixel et Conversions API ?', 'Le même achat peut être envoyé par le navigateur et par le serveur. Sans identifiant d''événement commun, Meta compte deux conversions.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'À éviter que la même conversion soit comptée deux fois', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'À accélérer le chargement du site', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'À améliorer le ciblage', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'À réduire le CPM', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'La Conversions API remplace complètement le pixel.', 'Les deux sont complémentaires : le pixel capte le contexte navigateur, l''API garantit la transmission même en cas de blocage. On les utilise ensemble.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'short_answer', 'Quel paramètre permet à Meta de reconnaître qu''un événement navigateur et un événement serveur sont le même ? (deux mots)', 'L''event_id, transmis à l''identique par les deux canaux, est ce qui permet la déduplication.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'event id', true, 'event id', 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'event_id', true, 'event_id', 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'identifiant evenement', true, 'identifiant evenement', 2);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Structure de campagne', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Comprendre la hiérarchie Meta', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'campagne-ensemble-de-pubs-publicite', 'Campagne, ensemble de pubs, publicité',
          '## Campagne, ensemble de pubs, publicité

Cette leçon fait partie du chapitre « Comprendre la hiérarchie Meta », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 480, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Campagne, ensemble de pubs, publicité', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/campagne-ensemble-de-pubs-publicite.mp4',
          480, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'choisir-son-objectif-de-campagne', 'Choisir son objectif de campagne',
          '## Choisir son objectif de campagne

Cette leçon fait partie du chapitre « Comprendre la hiérarchie Meta », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Choisir son objectif de campagne', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/choisir-son-objectif-de-campagne.mp4',
          660, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'ABO ou CBO', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'differences-et-cas-d-usage', 'Différences et cas d''usage',
          '## Différences et cas d''usage

Cette leçon fait partie du chapitre « ABO ou CBO », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Différences et cas d''usage', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/differences-et-cas-d-usage.mp4',
          540, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structurer-un-compte-en-abo', 'Structurer un compte en ABO',
          '## Structurer un compte en ABO

Cette leçon fait partie du chapitre « ABO ou CBO », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structurer un compte en ABO', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/structurer-un-compte-en-abo.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'passer-en-cbo-sans-tout-casser', 'Passer en CBO sans tout casser',
          '## Passer en CBO sans tout casser

Cette leçon fait partie du chapitre « ABO ou CBO », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Passer en CBO sans tout casser', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/passer-en-cbo-sans-tout-casser.mp4',
          720, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Budgets et enchères', 2, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'repartir-son-budget-entre-les-tests', 'Répartir son budget entre les tests',
          '## Répartir son budget entre les tests

Cette leçon fait partie du chapitre « Budgets et enchères », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Répartir son budget entre les tests', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/repartir-son-budget-entre-les-tests.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'strategies-d-encheres-expliquees', 'Stratégies d''enchères expliquées',
          '## Stratégies d''enchères expliquées

Cette leçon fait partie du chapitre « Budgets et enchères », dans le module « Structure de campagne ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Stratégies d''enchères expliquées', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/strategies-d-encheres-expliquees.mp4',
          780, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Template de structure de compte', 'Arborescence campagne / ensembles / publicités prête à dupliquer.',
          'https://demo.invalid/meta-ads-de-a-a-z/ressources/template-de-structure-de-compte', 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', 'Checklist de lancement de campagne', 'Douze vérifications avant de mettre en ligne.',
          'https://demo.invalid/meta-ads-de-a-a-z/ressources/checklist-de-lancement-de-campagne', 1);

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'open_answer', 'Structurer un compte à 50 €/jour', 'Vous disposez de **50 € par jour** pour tester un nouveau produit à 97 €.

Proposez une structure de compte : combien de campagnes, combien d''ensembles, quel budget par ensemble, et pourquoi.', null,
          null, 'Une structure défendable : **1 campagne en ABO**, **3 à 4 ensembles** à 12–16 € par jour, chacun avec une audience distincte (intérêt large, similaire 1 %, retargeting).

Pourquoi l''ABO ici : avec un budget aussi contraint, le CBO concentrerait presque tout sur un seul ensemble et vous n''apprendriez rien sur les autres.

Pourquoi 3 ou 4 et pas 8 : sous ~10 € par ensemble et par jour, aucun n''atteint assez de conversions pour produire un signal exploitable.', 'intermediate', 0, 'published');

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Structure de campagne Meta',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'En CBO, le budget est défini au niveau :', 'CBO signifie « Campaign Budget Optimization » : Meta répartit lui-même le budget de la campagne entre les ensembles de publicités.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'De la campagne', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'De l''ensemble de publicités', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'De la publicité', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Du compte publicitaire', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Quel est le principal avantage de l''ABO en phase de test ?', 'En ABO, chaque ensemble reçoit son budget : aucune audience n''est étouffée avant d''avoir eu sa chance.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Garantir un budget à chaque audience testée', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Réduire le CPM', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Améliorer le score de qualité', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Accélérer la sortie de la phase d''apprentissage', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Que contient un ensemble de publicités ?', 'Le visuel appartient au niveau « publicité ». L''ensemble définit à qui, où et avec quel budget on diffuse.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le ciblage', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Les placements', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le budget en ABO', true, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le visuel de la publicité', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Modifier le budget d''une campagne de plus de 20 % peut relancer la phase d''apprentissage.', 'C''est la raison pour laquelle le scaling vertical procède par paliers de 20 % espacés dans le temps.', 1, 3)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', false, null, 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Audiences et ciblage', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les trois familles d''audiences', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'froid-tiede-chaud-la-logique', 'Froid, tiède, chaud : la logique',
          '## Froid, tiède, chaud : la logique

Cette leçon fait partie du chapitre « Les trois familles d''audiences », dans le module « Audiences et ciblage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Froid, tiède, chaud : la logique', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/froid-tiede-chaud-la-logique.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'audiences-personnalisees', 'Audiences personnalisées',
          '## Audiences personnalisées

Cette leçon fait partie du chapitre « Les trois familles d''audiences », dans le module « Audiences et ciblage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Audiences personnalisées', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/audiences-personnalisees.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'audiences-similaires-mythes-et-realite', 'Audiences similaires : mythes et réalité',
          '## Audiences similaires : mythes et réalité

Cette leçon fait partie du chapitre « Les trois familles d''audiences », dans le module « Audiences et ciblage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Audiences similaires : mythes et réalité', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/audiences-similaires-mythes-et-realite.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Lire ses résultats', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Diagnostiquer une campagne', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-grille-de-lecture-en-quatre-etapes', 'La grille de lecture en quatre étapes',
          '## La grille de lecture en quatre étapes

Cette leçon fait partie du chapitre « Diagnostiquer une campagne », dans le module « Lire ses résultats ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La grille de lecture en quatre étapes', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/la-grille-de-lecture-en-quatre-etapes.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'fatigue-publicitaire-la-reperer-tot', 'Fatigue publicitaire : la repérer tôt',
          '## Fatigue publicitaire : la repérer tôt

Cette leçon fait partie du chapitre « Diagnostiquer une campagne », dans le module « Lire ses résultats ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Fatigue publicitaire : la repérer tôt', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/fatigue-publicitaire-la-reperer-tot.mp4',
          720, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', 'Grille de diagnostic de campagne', 'Quatre questions dans l''ordre pour comprendre une chute de performance.',
          'https://demo.invalid/meta-ads-de-a-a-z/ressources/grille-de-diagnostic-de-campagne', 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Scaling', 5, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Augmenter sans casser', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'scaling-vertical-la-regle-des-20', 'Scaling vertical : la règle des 20 %',
          '## Scaling vertical : la règle des 20 %

Cette leçon fait partie du chapitre « Augmenter sans casser », dans le module « Scaling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Scaling vertical : la règle des 20 %', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/scaling-vertical-la-regle-des-20.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'scaling-horizontal-dupliquer-intelligemment', 'Scaling horizontal : dupliquer intelligemment',
          '## Scaling horizontal : dupliquer intelligemment

Cette leçon fait partie du chapitre « Augmenter sans casser », dans le module « Scaling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Scaling horizontal : dupliquer intelligemment', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/scaling-horizontal-dupliquer-intelligemment.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-casse-une-campagne-qui-marchait', 'Ce qui casse une campagne qui marchait',
          '## Ce qui casse une campagne qui marchait

Cette leçon fait partie du chapitre « Augmenter sans casser », dans le module « Scaling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui casse une campagne qui marchait', 'native',
          'https://demo.invalid/meta-ads-de-a-a-z/ce-qui-casse-une-campagne-qui-marchait.mp4',
          780, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Scaling',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Le scaling horizontal consiste à :', 'Vertical = plus de budget sur l''existant. Horizontal = plus de campagnes ou d''audiences en parallèle.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Dupliquer une campagne performante sur de nouvelles audiences', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Augmenter le budget de la campagne existante', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Ajouter des placements', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Passer en enchère manuelle', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Quels signaux indiquent une fatigue publicitaire ?', 'Les trois premiers signalent que l''audience a trop vu la créative. Le budget est une décision, pas un symptôme.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Hausse de la fréquence', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Baisse progressive du CTR', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Hausse du CPM sur la même audience', true, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Baisse du budget quotidien', false, null, 3);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- TikTok Ads
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'tiktok-ads', 'TikTok Ads', 'Un format, un rythme et des créatives qui n''ont rien à voir avec Meta.', 'Copier ses pubs Meta sur TikTok est la façon la plus rapide de brûler un budget. Le format impose ses règles : les trois premières secondes, le rythme, le ton.

Cette formation part du principe que vous connaissez déjà les fondamentaux du media buying.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'media-buying'),
    'intermediate', 'published', 6, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Compte et pixel', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Mise en place', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'creer-et-configurer-son-compte-publicitaire', 'Créer et configurer son compte publicitaire',
          '## Créer et configurer son compte publicitaire

Cette leçon fait partie du chapitre « Mise en place », dans le module « Compte et pixel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Créer et configurer son compte publicitaire', 'native',
          'https://demo.invalid/tiktok-ads/creer-et-configurer-son-compte-publicitaire.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'installer-le-pixel-tiktok', 'Installer le pixel TikTok',
          '## Installer le pixel TikTok

Cette leçon fait partie du chapitre « Mise en place », dans le module « Compte et pixel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Installer le pixel TikTok', 'native',
          'https://demo.invalid/tiktok-ads/installer-le-pixel-tiktok.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Spécificités du format', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Penser natif', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-distingue-tiktok-des-autres-plateformes', 'Ce qui distingue TikTok des autres plateformes',
          '## Ce qui distingue TikTok des autres plateformes

Cette leçon fait partie du chapitre « Penser natif », dans le module « Spécificités du format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui distingue TikTok des autres plateformes', 'native',
          'https://demo.invalid/tiktok-ads/ce-qui-distingue-tiktok-des-autres-plateformes.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-son-moitie-du-message', 'Le son : moitié du message',
          '## Le son : moitié du message

Cette leçon fait partie du chapitre « Penser natif », dans le module « Spécificités du format ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le son : moitié du message', 'native',
          'https://demo.invalid/tiktok-ads/le-son-moitie-du-message.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Créatives natives', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Produire pour TikTok', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-trois-premieres-secondes', 'Les trois premières secondes',
          '## Les trois premières secondes

Cette leçon fait partie du chapitre « Produire pour TikTok », dans le module « Créatives natives ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les trois premières secondes', 'native',
          'https://demo.invalid/tiktok-ads/les-trois-premieres-secondes.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'formats-qui-fonctionnent-en-publicite', 'Formats qui fonctionnent en publicité',
          '## Formats qui fonctionnent en publicité

Cette leçon fait partie du chapitre « Produire pour TikTok », dans le module « Créatives natives ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Formats qui fonctionnent en publicité', 'native',
          'https://demo.invalid/tiktok-ads/formats-qui-fonctionnent-en-publicite.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'travailler-avec-des-createurs', 'Travailler avec des créateurs',
          '## Travailler avec des créateurs

Cette leçon fait partie du chapitre « Produire pour TikTok », dans le module « Créatives natives ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Travailler avec des créateurs', 'native',
          'https://demo.invalid/tiktok-ads/travailler-avec-des-createurs.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Campagnes et scaling', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Piloter', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structure-de-campagne-recommandee', 'Structure de campagne recommandée',
          '## Structure de campagne recommandée

Cette leçon fait partie du chapitre « Piloter », dans le module « Campagnes et scaling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structure de campagne recommandée', 'native',
          'https://demo.invalid/tiktok-ads/structure-de-campagne-recommandee.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'iterer-sur-les-creatives-pas-sur-le-ciblage', 'Itérer sur les créatives, pas sur le ciblage',
          '## Itérer sur les créatives, pas sur le ciblage

Cette leçon fait partie du chapitre « Piloter », dans le module « Campagnes et scaling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Itérer sur les créatives, pas sur le ciblage', 'native',
          'https://demo.invalid/tiktok-ads/iterer-sur-les-creatives-pas-sur-le-ciblage.mp4',
          780, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Google Ads : Search, YouTube, Performance Max
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'google-ads-search-youtube-pmax', 'Google Ads : Search, YouTube, Performance Max', 'Capter une intention existante plutôt que créer un besoin.', 'Meta interrompt, Google répond. Cette différence change toute la logique de campagne : sur Google, la demande existe déjà, il faut la capter au bon moment et au bon prix.

Formation avancée : les fondamentaux du media buying sont supposés acquis.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'media-buying'),
    'advanced', 'published', 7, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Intention de recherche', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Comprendre la demande', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-quatre-types-d-intention', 'Les quatre types d''intention',
          '## Les quatre types d''intention

Cette leçon fait partie du chapitre « Comprendre la demande », dans le module « Intention de recherche ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les quatre types d''intention', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/les-quatre-types-d-intention.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recherche-de-mots-cles-pour-la-publicite', 'Recherche de mots-clés pour la publicité',
          '## Recherche de mots-clés pour la publicité

Cette leçon fait partie du chapitre « Comprendre la demande », dans le module « Intention de recherche ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Recherche de mots-clés pour la publicité', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/recherche-de-mots-cles-pour-la-publicite.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Structure de compte Search', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Organiser ses campagnes', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'campagnes-groupes-d-annonces-mots-cles', 'Campagnes, groupes d''annonces, mots-clés',
          '## Campagnes, groupes d''annonces, mots-clés

Cette leçon fait partie du chapitre « Organiser ses campagnes », dans le module « Structure de compte Search ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Campagnes, groupes d''annonces, mots-clés', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/campagnes-groupes-d-annonces-mots-cles.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'types-de-correspondance', 'Types de correspondance',
          '## Types de correspondance

Cette leçon fait partie du chapitre « Organiser ses campagnes », dans le module « Structure de compte Search ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Types de correspondance', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/types-de-correspondance.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'mots-cles-negatifs-l-entretien-indispensable', 'Mots-clés négatifs : l''entretien indispensable',
          '## Mots-clés négatifs : l''entretien indispensable

Cette leçon fait partie du chapitre « Organiser ses campagnes », dans le module « Structure de compte Search ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Mots-clés négatifs : l''entretien indispensable', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/mots-cles-negatifs-l-entretien-indispensable.mp4',
          660, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Écrire ses annonces', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'annonces-responsives-ce-qui-compte', 'Annonces responsives : ce qui compte',
          '## Annonces responsives : ce qui compte

Cette leçon fait partie du chapitre « Écrire ses annonces », dans le module « Structure de compte Search ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Annonces responsives : ce qui compte', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/annonces-responsives-ce-qui-compte.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'extensions-et-elements-d-annonce', 'Extensions et éléments d''annonce',
          '## Extensions et éléments d''annonce

Cette leçon fait partie du chapitre « Écrire ses annonces », dans le module « Structure de compte Search ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Extensions et éléments d''annonce', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/extensions-et-elements-d-annonce.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'YouTube Ads', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'La vidéo en acquisition', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'formats-et-emplacements', 'Formats et emplacements',
          '## Formats et emplacements

Cette leçon fait partie du chapitre « La vidéo en acquisition », dans le module « YouTube Ads ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Formats et emplacements', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/formats-et-emplacements.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'script-d-une-annonce-youtube-qui-convertit', 'Script d''une annonce YouTube qui convertit',
          '## Script d''une annonce YouTube qui convertit

Cette leçon fait partie du chapitre « La vidéo en acquisition », dans le module « YouTube Ads ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Script d''une annonce YouTube qui convertit', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/script-d-une-annonce-youtube-qui-convertit.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Performance Max', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Piloter une boîte noire', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-que-pmax-fait-vraiment', 'Ce que PMax fait vraiment',
          '## Ce que PMax fait vraiment

Cette leçon fait partie du chapitre « Piloter une boîte noire », dans le module « Performance Max ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce que PMax fait vraiment', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/ce-que-pmax-fait-vraiment.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'signaux-d-audience-et-flux', 'Signaux d''audience et flux',
          '## Signaux d''audience et flux

Cette leçon fait partie du chapitre « Piloter une boîte noire », dans le module « Performance Max ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Signaux d''audience et flux', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/signaux-d-audience-et-flux.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'garder-le-controle-sur-les-resultats', 'Garder le contrôle sur les résultats',
          '## Garder le contrôle sur les résultats

Cette leçon fait partie du chapitre « Piloter une boîte noire », dans le module « Performance Max ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Garder le contrôle sur les résultats', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/garder-le-controle-sur-les-resultats.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Enchères et budgets', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Optimiser la dépense', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'strategies-d-encheres-automatiques', 'Stratégies d''enchères automatiques',
          '## Stratégies d''enchères automatiques

Cette leçon fait partie du chapitre « Optimiser la dépense », dans le module « Enchères et budgets ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Stratégies d''enchères automatiques', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/strategies-d-encheres-automatiques.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'repartition-entre-canaux', 'Répartition entre canaux',
          '## Répartition entre canaux

Cette leçon fait partie du chapitre « Optimiser la dépense », dans le module « Enchères et budgets ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Répartition entre canaux', 'native',
          'https://demo.invalid/google-ads-search-youtube-pmax/repartition-entre-canaux.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Créatives publicitaires qui performent
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'creatives-publicitaires', 'Créatives publicitaires qui performent', 'La créative est le nouveau ciblage. Hooks, angles, UGC et process de test.', 'Sur les plateformes modernes, l''algorithme fait le ciblage. Ce qui reste entre vos mains, c''est la créative — et c''est devenu le principal levier de performance.

Cette formation donne un système de production et de test, pas des « astuces ».',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'media-buying'),
    'intermediate', 'published', 8, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Anatomie d''une pub qui convertit', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les composants', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'hook-corps-preuve-appel-a-l-action', 'Hook, corps, preuve, appel à l''action',
          '## Hook, corps, preuve, appel à l''action

Cette leçon fait partie du chapitre « Les composants », dans le module « Anatomie d''une pub qui convertit ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Hook, corps, preuve, appel à l''action', 'native',
          'https://demo.invalid/creatives-publicitaires/hook-corps-preuve-appel-a-l-action.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-que-l-audience-decide-en-1-5-seconde', 'Ce que l''audience décide en 1,5 seconde',
          '## Ce que l''audience décide en 1,5 seconde

Cette leçon fait partie du chapitre « Les composants », dans le module « Anatomie d''une pub qui convertit ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce que l''audience décide en 1,5 seconde', 'native',
          'https://demo.invalid/creatives-publicitaires/ce-que-l-audience-decide-en-1-5-seconde.mp4',
          600, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Anatomie d''une créative',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Quel élément décide de la majorité du résultat d''une publicité vidéo ?', 'L''immense majorité des abandons se produit avant la troisième seconde. Un bon corps de message sur un mauvais hook ne sera jamais vu.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Les premières secondes', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'La musique de fond', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'La durée totale', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le format d''export', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Sur les plateformes modernes, la créative influence davantage la performance que le ciblage détaillé.', 'L''algorithme fait désormais l''essentiel du ciblage. La créative est le principal levier qui reste sous votre contrôle.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', false, null, 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Hooks et premières secondes', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Capter l''attention', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'douze-structures-de-hook-reutilisables', 'Douze structures de hook réutilisables',
          '## Douze structures de hook réutilisables

Cette leçon fait partie du chapitre « Capter l''attention », dans le module « Hooks et premières secondes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Douze structures de hook réutilisables', 'native',
          'https://demo.invalid/creatives-publicitaires/douze-structures-de-hook-reutilisables.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'adapter-le-hook-au-niveau-de-conscience', 'Adapter le hook au niveau de conscience',
          '## Adapter le hook au niveau de conscience

Cette leçon fait partie du chapitre « Capter l''attention », dans le module « Hooks et premières secondes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Adapter le hook au niveau de conscience', 'native',
          'https://demo.invalid/creatives-publicitaires/adapter-le-hook-au-niveau-de-conscience.mp4',
          780, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', 'Swipe file : 40 hooks classés', 'Structures d''accroche réutilisables, classées par niveau de conscience.',
          'https://demo.invalid/creatives-publicitaires/ressources/swipe-file-40-hooks-classes', 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Brief UGC', 'Modèle de brief à envoyer à un créateur.',
          'https://demo.invalid/creatives-publicitaires/ressources/brief-ugc', 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Angles marketing', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Dire la même chose autrement', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'qu-est-ce-qu-un-angle', 'Qu''est-ce qu''un angle',
          '## Qu''est-ce qu''un angle

Cette leçon fait partie du chapitre « Dire la même chose autrement », dans le module « Angles marketing ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Qu''est-ce qu''un angle', 'native',
          'https://demo.invalid/creatives-publicitaires/qu-est-ce-qu-un-angle.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'generer-dix-angles-a-partir-d-un-produit', 'Générer dix angles à partir d''un produit',
          '## Générer dix angles à partir d''un produit

Cette leçon fait partie du chapitre « Dire la même chose autrement », dans le module « Angles marketing ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Générer dix angles à partir d''un produit', 'native',
          'https://demo.invalid/creatives-publicitaires/generer-dix-angles-a-partir-d-un-produit.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'UGC : brief, casting, production', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Travailler avec des créateurs', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rediger-un-brief-exploitable', 'Rédiger un brief exploitable',
          '## Rédiger un brief exploitable

Cette leçon fait partie du chapitre « Travailler avec des créateurs », dans le module « UGC : brief, casting, production ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rédiger un brief exploitable', 'native',
          'https://demo.invalid/creatives-publicitaires/rediger-un-brief-exploitable.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trouver-et-selectionner-des-createurs', 'Trouver et sélectionner des créateurs',
          '## Trouver et sélectionner des créateurs

Cette leçon fait partie du chapitre « Travailler avec des créateurs », dans le module « UGC : brief, casting, production ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trouver et sélectionner des créateurs', 'native',
          'https://demo.invalid/creatives-publicitaires/trouver-et-selectionner-des-createurs.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'droits-d-utilisation-et-cadre', 'Droits d''utilisation et cadre',
          '## Droits d''utilisation et cadre

Cette leçon fait partie du chapitre « Travailler avec des créateurs », dans le module « UGC : brief, casting, production ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Droits d''utilisation et cadre', 'native',
          'https://demo.invalid/creatives-publicitaires/droits-d-utilisation-et-cadre.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Process de test créatif', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Industrialiser', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'combien-de-creatives-par-test', 'Combien de créatives par test',
          '## Combien de créatives par test

Cette leçon fait partie du chapitre « Industrialiser », dans le module « Process de test créatif ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Combien de créatives par test', 'native',
          'https://demo.invalid/creatives-publicitaires/combien-de-creatives-par-test.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'lire-un-test-creatif-sans-se-mentir', 'Lire un test créatif sans se mentir',
          '## Lire un test créatif sans se mentir

Cette leçon fait partie du chapitre « Industrialiser », dans le module « Process de test créatif ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Lire un test créatif sans se mentir', 'native',
          'https://demo.invalid/creatives-publicitaires/lire-un-test-creatif-sans-se-mentir.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'iterer-sur-les-gagnantes', 'Itérer sur les gagnantes',
          '## Itérer sur les gagnantes

Cette leçon fait partie du chapitre « Industrialiser », dans le module « Process de test créatif ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Itérer sur les gagnantes', 'native',
          'https://demo.invalid/creatives-publicitaires/iterer-sur-les-gagnantes.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Tracking et mesure
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'tracking-et-mesure', 'Tracking et mesure', 'Pixel, CAPI, UTM, GA4, attribution : savoir ce qui marche vraiment.', 'Sans mesure fiable, l''optimisation est une superstition. Cette formation traite le sujet le moins glamour et le plus rentable du media buying.

On y répond notamment à la question qui revient sans cesse : pourquoi les chiffres de Meta, de Google et de votre back-office ne concordent jamais.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'media-buying'),
    'advanced', 'published', 9, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Pixel, CAPI, déduplication', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Poser des bases fiables', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'navigateur-et-serveur-deux-chemins', 'Navigateur et serveur : deux chemins',
          '## Navigateur et serveur : deux chemins

Cette leçon fait partie du chapitre « Poser des bases fiables », dans le module « Pixel, CAPI, déduplication ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Navigateur et serveur : deux chemins', 'native',
          'https://demo.invalid/tracking-et-mesure/navigateur-et-serveur-deux-chemins.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'deduplication-le-detail-qui-fausse-tout', 'Déduplication : le detail qui fausse tout',
          '## Déduplication : le detail qui fausse tout

Cette leçon fait partie du chapitre « Poser des bases fiables », dans le module « Pixel, CAPI, déduplication ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Déduplication : le detail qui fausse tout', 'native',
          'https://demo.invalid/tracking-et-mesure/deduplication-le-detail-qui-fausse-tout.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'UTM et conventions', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Nommer pour retrouver', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'anatomie-d-une-utm', 'Anatomie d''une UTM',
          '## Anatomie d''une UTM

Cette leçon fait partie du chapitre « Nommer pour retrouver », dans le module « UTM et conventions ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Anatomie d''une UTM', 'native',
          'https://demo.invalid/tracking-et-mesure/anatomie-d-une-utm.mp4',
          600, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'une-convention-de-nommage-tenable', 'Une convention de nommage tenable',
          '## Une convention de nommage tenable

Cette leçon fait partie du chapitre « Nommer pour retrouver », dans le module « UTM et conventions ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Une convention de nommage tenable', 'native',
          'https://demo.invalid/tracking-et-mesure/une-convention-de-nommage-tenable.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'GA4', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Mesurer en dehors des régies', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'configurer-les-evenements-essentiels', 'Configurer les événements essentiels',
          '## Configurer les événements essentiels

Cette leçon fait partie du chapitre « Mesurer en dehors des régies », dans le module « GA4 ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Configurer les événements essentiels', 'native',
          'https://demo.invalid/tracking-et-mesure/configurer-les-evenements-essentiels.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rapports-utiles-au-quotidien', 'Rapports utiles au quotidien',
          '## Rapports utiles au quotidien

Cette leçon fait partie du chapitre « Mesurer en dehors des régies », dans le module « GA4 ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rapports utiles au quotidien', 'native',
          'https://demo.invalid/tracking-et-mesure/rapports-utiles-au-quotidien.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Attribution', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Comprendre les écarts', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'modeles-d-attribution-compares', 'Modèles d''attribution comparés',
          '## Modèles d''attribution comparés

Cette leçon fait partie du chapitre « Comprendre les écarts », dans le module « Attribution ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Modèles d''attribution comparés', 'native',
          'https://demo.invalid/tracking-et-mesure/modeles-d-attribution-compares.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'pourquoi-vos-trois-outils-ne-s-accordent-pas', 'Pourquoi vos trois outils ne s''accordent pas',
          '## Pourquoi vos trois outils ne s''accordent pas

Cette leçon fait partie du chapitre « Comprendre les écarts », dans le module « Attribution ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Pourquoi vos trois outils ne s''accordent pas', 'native',
          'https://demo.invalid/tracking-et-mesure/pourquoi-vos-trois-outils-ne-s-accordent-pas.mp4',
          780, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Attribution',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Pourquoi Meta déclare-t-il souvent plus de conversions que votre back-office ?', 'L''attribution post-vue attribue à Meta des ventes qui auraient peut-être eu lieu sans lui. Ce n''est pas un bug, c''est un choix de modèle.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Sa fenêtre d''attribution inclut les vues, pas seulement les clics', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Il compte les impressions comme des ventes', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Il exclut les remboursements', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Il utilise un fuseau horaire différent', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Quelles causes expliquent des écarts entre outils de mesure ?', 'Les trois premières sont structurelles et ne disparaîtront pas. La devise est un simple paramètre d''affichage.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Modèles d''attribution différents', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Fenêtres d''attribution différentes', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Blocage du suivi côté navigateur', true, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Différence de devise d''affichage', false, null, 3);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Tableau de bord de pilotage', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Décider avec les bons chiffres', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-huit-indicateurs-a-suivre', 'Les huit indicateurs à suivre',
          '## Les huit indicateurs à suivre

Cette leçon fait partie du chapitre « Décider avec les bons chiffres », dans le module « Tableau de bord de pilotage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les huit indicateurs à suivre', 'native',
          'https://demo.invalid/tracking-et-mesure/les-huit-indicateurs-a-suivre.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'construire-un-tableau-hebdomadaire', 'Construire un tableau hebdomadaire',
          '## Construire un tableau hebdomadaire

Cette leçon fait partie du chapitre « Décider avec les bons chiffres », dans le module « Tableau de bord de pilotage ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Construire un tableau hebdomadaire', 'native',
          'https://demo.invalid/tracking-et-mesure/construire-un-tableau-hebdomadaire.mp4',
          840, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Construire un tunnel de vente
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'tunnel-de-vente', 'Construire un tunnel de vente', 'Du lead magnet à l''upsell : chaque étape mesurée et optimisée.', 'Un tunnel n''est pas une suite de pages : c''est une suite de décisions que le visiteur prend, ou ne prend pas.

Cette formation construit un tunnel complet, puis apprend à identifier l''étape qui fuit — parce que c''est toujours une étape en particulier.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'marketing-digital'),
    'beginner', 'published', 10, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Anatomie d''un funnel', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les étapes', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trafic-capture-vente-suivi', 'Trafic, capture, vente, suivi',
          '## Trafic, capture, vente, suivi

Cette leçon fait partie du chapitre « Les étapes », dans le module « Anatomie d''un funnel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trafic, capture, vente, suivi', 'native',
          'https://demo.invalid/tunnel-de-vente/trafic-capture-vente-suivi.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'taux-de-conversion-realistes-par-etape', 'Taux de conversion réalistes par étape',
          '## Taux de conversion réalistes par étape

Cette leçon fait partie du chapitre « Les étapes », dans le module « Anatomie d''un funnel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Taux de conversion réalistes par étape', 'native',
          'https://demo.invalid/tunnel-de-vente/taux-de-conversion-realistes-par-etape.mp4',
          720, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Anatomie d''un tunnel',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Dans un tunnel, l''étape à optimiser en priorité est :', 'Optimiser une étape déjà performante ne rapporte presque rien. Il faut trouver la fuite, pas polir ce qui fonctionne.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Celle qui perd le plus de visiteurs par rapport à sa référence', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Toujours la page de vente', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Toujours la publicité', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Celle qui reçoit le plus de trafic', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Quelles étapes composent un tunnel classique ?', 'Trafic, capture, vente et suivi post-achat forment le squelette. La comptabilité en est la conséquence, pas une étape.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Acquisition de trafic', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Capture de contacts', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vente', true, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Comptabilité', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Un order bump se propose après le paiement.', 'L''order bump se propose sur la page de paiement, avant validation. C''est l''upsell qui intervient après.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Lead magnet et capture', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Obtenir l''adresse e-mail', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-fait-un-bon-lead-magnet', 'Ce qui fait un bon lead magnet',
          '## Ce qui fait un bon lead magnet

Cette leçon fait partie du chapitre « Obtenir l''adresse e-mail », dans le module « Lead magnet et capture ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui fait un bon lead magnet', 'native',
          'https://demo.invalid/tunnel-de-vente/ce-qui-fait-un-bon-lead-magnet.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'page-de-capture-la-version-courte-gagne', 'Page de capture : la version courte gagne',
          '## Page de capture : la version courte gagne

Cette leçon fait partie du chapitre « Obtenir l''adresse e-mail », dans le module « Lead magnet et capture ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Page de capture : la version courte gagne', 'native',
          'https://demo.invalid/tunnel-de-vente/page-de-capture-la-version-courte-gagne.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'double-opt-in-cout-et-benefice', 'Double opt-in : coût et bénéfice',
          '## Double opt-in : coût et bénéfice

Cette leçon fait partie du chapitre « Obtenir l''adresse e-mail », dans le module « Lead magnet et capture ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Double opt-in : coût et bénéfice', 'native',
          'https://demo.invalid/tunnel-de-vente/double-opt-in-cout-et-benefice.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Page de vente', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Convertir le trafic capté', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structure-minimale-qui-fonctionne', 'Structure minimale qui fonctionne',
          '## Structure minimale qui fonctionne

Cette leçon fait partie du chapitre « Convertir le trafic capté », dans le module « Page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structure minimale qui fonctionne', 'native',
          'https://demo.invalid/tunnel-de-vente/structure-minimale-qui-fonctionne.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'placer-les-preuves-au-bon-endroit', 'Placer les preuves au bon endroit',
          '## Placer les preuves au bon endroit

Cette leçon fait partie du chapitre « Convertir le trafic capté », dans le module « Page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Placer les preuves au bon endroit', 'native',
          'https://demo.invalid/tunnel-de-vente/placer-les-preuves-au-bon-endroit.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Order bump, upsell, downsell', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Augmenter le panier moyen', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'order-bump-le-gain-le-plus-facile', 'Order bump : le gain le plus facile',
          '## Order bump : le gain le plus facile

Cette leçon fait partie du chapitre « Augmenter le panier moyen », dans le module « Order bump, upsell, downsell ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Order bump : le gain le plus facile', 'native',
          'https://demo.invalid/tunnel-de-vente/order-bump-le-gain-le-plus-facile.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'construire-un-upsell-coherent', 'Construire un upsell cohérent',
          '## Construire un upsell cohérent

Cette leçon fait partie du chapitre « Augmenter le panier moyen », dans le module « Order bump, upsell, downsell ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Construire un upsell cohérent', 'native',
          'https://demo.invalid/tunnel-de-vente/construire-un-upsell-coherent.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-downsell-qui-rattrape-sans-brader', 'Le downsell qui rattrape sans brader',
          '## Le downsell qui rattrape sans brader

Cette leçon fait partie du chapitre « Augmenter le panier moyen », dans le module « Order bump, upsell, downsell ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le downsell qui rattrape sans brader', 'native',
          'https://demo.invalid/tunnel-de-vente/le-downsell-qui-rattrape-sans-brader.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Mesurer et optimiser', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Trouver la fuite', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'instrumenter-chaque-etape', 'Instrumenter chaque étape',
          '## Instrumenter chaque étape

Cette leçon fait partie du chapitre « Trouver la fuite », dans le module « Mesurer et optimiser ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Instrumenter chaque étape', 'native',
          'https://demo.invalid/tunnel-de-vente/instrumenter-chaque-etape.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'prioriser-les-optimisations-par-impact', 'Prioriser les optimisations par impact',
          '## Prioriser les optimisations par impact

Cette leçon fait partie du chapitre « Trouver la fuite », dans le module « Mesurer et optimiser ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Prioriser les optimisations par impact', 'native',
          'https://demo.invalid/tunnel-de-vente/prioriser-les-optimisations-par-impact.mp4',
          720, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Tableau de suivi de tunnel', 'Taux de conversion par étape et repérage automatique de la fuite.',
          'https://demo.invalid/tunnel-de-vente/ressources/tableau-de-suivi-de-tunnel', 0);

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'numeric', 'Trouver l''étape qui fuit', 'Votre tunnel affiche : 4 000 visiteurs, 480 inscrits, 24 acheteurs.

Quel est le taux de conversion de la page de capture, en pourcentage (un chiffre après la virgule) ?', '12',
          0.01, '480 / 4 000 = **12 %**.

C''est correct pour une page de capture. En revanche, 24 / 480 = 5 % de la liste qui achète : c''est cette seconde étape qu''il faut travailler en priorité.', 'beginner', 0, 'published');

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Email marketing et automatisation
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'email-marketing-automatisation', 'Email marketing et automatisation', 'Délivrabilité, séquences et scénarios : le canal que vous possédez.', 'L''e-mail est le seul canal que personne ne peut vous retirer du jour au lendemain. C''est aussi celui qui pardonne le moins l''amateurisme technique : une mauvaise délivrabilité rend tout le reste inutile.

On commence donc par la technique, puis on écrit.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'marketing-digital'),
    'intermediate', 'published', 11, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Délivrabilité', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Arriver en boîte de réception', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'spf-dkim-dmarc-en-clair', 'SPF, DKIM, DMARC en clair',
          '## SPF, DKIM, DMARC en clair

Cette leçon fait partie du chapitre « Arriver en boîte de réception », dans le module « Délivrabilité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'SPF, DKIM, DMARC en clair', 'native',
          'https://demo.invalid/email-marketing-automatisation/spf-dkim-dmarc-en-clair.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rechauffer-un-nouveau-domaine', 'Réchauffer un nouveau domaine',
          '## Réchauffer un nouveau domaine

Cette leçon fait partie du chapitre « Arriver en boîte de réception », dans le module « Délivrabilité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Réchauffer un nouveau domaine', 'native',
          'https://demo.invalid/email-marketing-automatisation/rechauffer-un-nouveau-domaine.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'nettoyer-sa-liste-sans-la-vider', 'Nettoyer sa liste sans la vider',
          '## Nettoyer sa liste sans la vider

Cette leçon fait partie du chapitre « Arriver en boîte de réception », dans le module « Délivrabilité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Nettoyer sa liste sans la vider', 'native',
          'https://demo.invalid/email-marketing-automatisation/nettoyer-sa-liste-sans-la-vider.mp4',
          660, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Délivrabilité',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'À quoi sert l''enregistrement SPF ?', 'SPF est une liste d''expéditeurs autorisés publiée dans le DNS. Sans lui, n''importe qui peut usurper votre domaine.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Déclarer quels serveurs peuvent envoyer des e-mails pour votre domaine', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Chiffrer le contenu des e-mails', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Mesurer le taux d''ouverture', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Bloquer les désinscriptions', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Envoyer immédiatement à toute sa liste depuis un domaine neuf améliore la délivrabilité.', 'C''est exactement l''inverse : un domaine neuf doit être réchauffé progressivement, sous peine d''être classé en spam durablement.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Quels signaux dégradent la réputation d''expéditeur ?', 'Les trois premiers indiquent aux fournisseurs que vos envois sont non désirés. Le format texte brut est neutre, voire favorable.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Taux de plainte élevé', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Adresses invalides en nombre', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faible taux d''ouverture prolongé', true, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Utilisation d''un modèle en texte brut', false, null, 3);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Séquence de bienvenue', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les sept premiers jours', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-premier-e-mail-decide-de-tous-les-autres', 'Le premier e-mail décide de tous les autres',
          '## Le premier e-mail décide de tous les autres

Cette leçon fait partie du chapitre « Les sept premiers jours », dans le module « Séquence de bienvenue ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le premier e-mail décide de tous les autres', 'native',
          'https://demo.invalid/email-marketing-automatisation/le-premier-e-mail-decide-de-tous-les-autres.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rythme-et-contenu-d-une-sequence-de-bienvenue', 'Rythme et contenu d''une séquence de bienvenue',
          '## Rythme et contenu d''une séquence de bienvenue

Cette leçon fait partie du chapitre « Les sept premiers jours », dans le module « Séquence de bienvenue ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rythme et contenu d''une séquence de bienvenue', 'native',
          'https://demo.invalid/email-marketing-automatisation/rythme-et-contenu-d-une-sequence-de-bienvenue.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Séquence de vente', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Vendre par e-mail', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-structure-en-cinq-e-mails', 'La structure en cinq e-mails',
          '## La structure en cinq e-mails

Cette leçon fait partie du chapitre « Vendre par e-mail », dans le module « Séquence de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La structure en cinq e-mails', 'native',
          'https://demo.invalid/email-marketing-automatisation/la-structure-en-cinq-e-mails.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'traiter-les-objections-une-par-une', 'Traiter les objections une par une',
          '## Traiter les objections une par une

Cette leçon fait partie du chapitre « Vendre par e-mail », dans le module « Séquence de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Traiter les objections une par une', 'native',
          'https://demo.invalid/email-marketing-automatisation/traiter-les-objections-une-par-une.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-cloture-urgence-honnete', 'La clôture : urgence honnête',
          '## La clôture : urgence honnête

Cette leçon fait partie du chapitre « Vendre par e-mail », dans le module « Séquence de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La clôture : urgence honnête', 'native',
          'https://demo.invalid/email-marketing-automatisation/la-cloture-urgence-honnete.mp4',
          660, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Séquence de vente en 5 e-mails', 'Trame complète à adapter à votre offre.',
          'https://demo.invalid/email-marketing-automatisation/ressources/sequence-de-vente-en-5-e-mails', 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Newsletter et rétention', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Entretenir la relation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trouver-un-rythme-tenable', 'Trouver un rythme tenable',
          '## Trouver un rythme tenable

Cette leçon fait partie du chapitre « Entretenir la relation », dans le module « Newsletter et rétention ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trouver un rythme tenable', 'native',
          'https://demo.invalid/email-marketing-automatisation/trouver-un-rythme-tenable.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'que-raconter-quand-on-n-a-rien-a-vendre', 'Que raconter quand on n''a rien à vendre',
          '## Que raconter quand on n''a rien à vendre

Cette leçon fait partie du chapitre « Entretenir la relation », dans le module « Newsletter et rétention ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Que raconter quand on n''a rien à vendre', 'native',
          'https://demo.invalid/email-marketing-automatisation/que-raconter-quand-on-n-a-rien-a-vendre.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Segmentation et scénarios', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Automatiser intelligemment', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'segmenter-sans-complexifier', 'Segmenter sans complexifier',
          '## Segmenter sans complexifier

Cette leçon fait partie du chapitre « Automatiser intelligemment », dans le module « Segmentation et scénarios ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Segmenter sans complexifier', 'native',
          'https://demo.invalid/email-marketing-automatisation/segmenter-sans-complexifier.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'scenarios-de-relance-panier-et-inactivite', 'Scénarios de relance panier et inactivité',
          '## Scénarios de relance panier et inactivité

Cette leçon fait partie du chapitre « Automatiser intelligemment », dans le module « Segmentation et scénarios ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Scénarios de relance panier et inactivité', 'native',
          'https://demo.invalid/email-marketing-automatisation/scenarios-de-relance-panier-et-inactivite.mp4',
          720, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Copywriting
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'copywriting', 'Copywriting', 'Écrire pour convaincre : frameworks, accroches, objections, appels à l''action.', 'Le copywriting n''est pas de l''écriture élégante : c''est de la compréhension d''audience mise en phrases.

Cette formation part des gens — ce qu''ils croient, ce qu''ils craignent, ce qu''ils ont déjà essayé — avant de parler de structure ou de style.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'marketing-digital'),
    'beginner', 'published', 12, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Comprendre son audience', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Avant d''écrire', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-cinq-niveaux-de-conscience', 'Les cinq niveaux de conscience',
          '## Les cinq niveaux de conscience

Cette leçon fait partie du chapitre « Avant d''écrire », dans le module « Comprendre son audience ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les cinq niveaux de conscience', 'native',
          'https://demo.invalid/copywriting/les-cinq-niveaux-de-conscience.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'collecter-les-mots-exacts-de-votre-audience', 'Collecter les mots exacts de votre audience',
          '## Collecter les mots exacts de votre audience

Cette leçon fait partie du chapitre « Avant d''écrire », dans le module « Comprendre son audience ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Collecter les mots exacts de votre audience', 'native',
          'https://demo.invalid/copywriting/collecter-les-mots-exacts-de-votre-audience.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Les frameworks', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Des structures éprouvées', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'aida-attention-interet-desir-action', 'AIDA : attention, intérêt, désir, action',
          '## AIDA : attention, intérêt, désir, action

Cette leçon fait partie du chapitre « Des structures éprouvées », dans le module « Les frameworks ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'AIDA : attention, intérêt, désir, action', 'native',
          'https://demo.invalid/copywriting/aida-attention-interet-desir-action.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'pas-probleme-agitation-solution', 'PAS : problème, agitation, solution',
          '## PAS : problème, agitation, solution

Cette leçon fait partie du chapitre « Des structures éprouvées », dans le module « Les frameworks ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'PAS : problème, agitation, solution', 'native',
          'https://demo.invalid/copywriting/pas-probleme-agitation-solution.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'avant-apres-pont', 'Avant / Après / Pont',
          '## Avant / Après / Pont

Cette leçon fait partie du chapitre « Des structures éprouvées », dans le module « Les frameworks ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Avant / Après / Pont', 'native',
          'https://demo.invalid/copywriting/avant-apres-pont.mp4',
          600, 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Les frameworks de copywriting',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Dans le framework PAS, que signifie le « A » ?', 'PAS : Problème, Agitation, Solution. L''agitation rend le problème concret avant de proposer la solution.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Agitation', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Attention', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Action', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Argument', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'AIDA se déroule dans l''ordre :', 'Attention, Intérêt, Désir, Action : chaque étape prépare la suivante.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Attention, Intérêt, Désir, Action', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Argument, Intérêt, Décision, Action', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Attention, Information, Décision, Achat', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Accroche, Intérêt, Demande, Achat', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'short_answer', 'Combien de niveaux de conscience distingue-t-on classiquement chez un prospect ? (chiffre)', 'Cinq : inconscient du problème, conscient du problème, conscient de la solution, conscient du produit, le plus conscient.', 1, 2)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, '5', true, '5', 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'cinq', true, 'cinq', 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Titres et accroches', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'La partie la plus lue', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'dix-structures-de-titre', 'Dix structures de titre',
          '## Dix structures de titre

Cette leçon fait partie du chapitre « La partie la plus lue », dans le module « Titres et accroches ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Dix structures de titre', 'native',
          'https://demo.invalid/copywriting/dix-structures-de-titre.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'tester-un-titre-en-trente-secondes', 'Tester un titre en trente secondes',
          '## Tester un titre en trente secondes

Cette leçon fait partie du chapitre « La partie la plus lue », dans le module « Titres et accroches ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Tester un titre en trente secondes', 'native',
          'https://demo.invalid/copywriting/tester-un-titre-en-trente-secondes.mp4',
          540, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', '50 structures de titres', 'Formules d''accroche adaptables à tout secteur.',
          'https://demo.invalid/copywriting/ressources/50-structures-de-titres', 0);

  insert into public.exercises
    (lesson_id, kind, title, statement_md, expected_answer, tolerance,
     solution_md, difficulty, sort_order, status)
  values (v_lesson, 'open_answer', 'Écrire dix titres', 'Pour votre offre, rédigez **dix titres** en utilisant dix structures différentes vues dans le chapitre. Ne vous censurez pas : la sélection vient après.', null,
          null, 'Les dix premiers titres sont rarement bons — c''est normal et c''est le but de l''exercice. Le tri se fait ensuite sur trois critères : spécificité de la promesse, clarté immédiate, et crédibilité.

Un titre qui pourrait s''appliquer à n''importe quel concurrent est à écarter.', 'beginner', 0, 'published');

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Storytelling', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Raconter sans broder', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-structure-d-une-histoire-qui-vend', 'La structure d''une histoire qui vend',
          '## La structure d''une histoire qui vend

Cette leçon fait partie du chapitre « Raconter sans broder », dans le module « Storytelling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La structure d''une histoire qui vend', 'native',
          'https://demo.invalid/copywriting/la-structure-d-une-histoire-qui-vend.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'utiliser-son-propre-parcours-sans-se-survendre', 'Utiliser son propre parcours sans se survendre',
          '## Utiliser son propre parcours sans se survendre

Cette leçon fait partie du chapitre « Raconter sans broder », dans le module « Storytelling ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Utiliser son propre parcours sans se survendre', 'native',
          'https://demo.invalid/copywriting/utiliser-son-propre-parcours-sans-se-survendre.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Objections et appel à l''action', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Lever les derniers freins', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'lister-et-traiter-les-objections-reelles', 'Lister et traiter les objections réelles',
          '## Lister et traiter les objections réelles

Cette leçon fait partie du chapitre « Lever les derniers freins », dans le module « Objections et appel à l''action ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Lister et traiter les objections réelles', 'native',
          'https://demo.invalid/copywriting/lister-et-traiter-les-objections-reelles.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ecrire-un-appel-a-l-action-qui-ne-fait-pas-fuir', 'Écrire un appel à l''action qui ne fait pas fuir',
          '## Écrire un appel à l''action qui ne fait pas fuir

Cette leçon fait partie du chapitre « Lever les derniers freins », dans le module « Objections et appel à l''action ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Écrire un appel à l''action qui ne fait pas fuir', 'native',
          'https://demo.invalid/copywriting/ecrire-un-appel-a-l-action-qui-ne-fait-pas-fuir.mp4',
          600, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- SEO et contenu
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'seo-et-contenu', 'SEO et contenu', 'Le trafic qui ne s''arrête pas quand vous coupez les campagnes.', 'Le SEO est lent, et c''est exactement ce qui en fait un actif. Contrairement à la publicité, le trafic acquis reste.

Cette formation vise un objectif précis : des pages qui se positionnent et qui convertissent, pas du contenu pour le contenu.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'marketing-digital'),
    'intermediate', 'published', 13, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Recherche de mots-clés', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Choisir ses batailles', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'volume-difficulte-intention', 'Volume, difficulté, intention',
          '## Volume, difficulté, intention

Cette leçon fait partie du chapitre « Choisir ses batailles », dans le module « Recherche de mots-clés ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Volume, difficulté, intention', 'native',
          'https://demo.invalid/seo-et-contenu/volume-difficulte-intention.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trouver-les-requetes-que-vos-concurrents-ratent', 'Trouver les requêtes que vos concurrents ratent',
          '## Trouver les requêtes que vos concurrents ratent

Cette leçon fait partie du chapitre « Choisir ses batailles », dans le module « Recherche de mots-clés ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trouver les requêtes que vos concurrents ratent', 'native',
          'https://demo.invalid/seo-et-contenu/trouver-les-requetes-que-vos-concurrents-ratent.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'SEO technique', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les fondations', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'indexation-et-exploration', 'Indexation et exploration',
          '## Indexation et exploration

Cette leçon fait partie du chapitre « Les fondations », dans le module « SEO technique ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Indexation et exploration', 'native',
          'https://demo.invalid/seo-et-contenu/indexation-et-exploration.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'vitesse-et-core-web-vitals', 'Vitesse et Core Web Vitals',
          '## Vitesse et Core Web Vitals

Cette leçon fait partie du chapitre « Les fondations », dans le module « SEO technique ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Vitesse et Core Web Vitals', 'native',
          'https://demo.invalid/seo-et-contenu/vitesse-et-core-web-vitals.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structure-d-url-et-maillage-interne', 'Structure d''URL et maillage interne',
          '## Structure d''URL et maillage interne

Cette leçon fait partie du chapitre « Les fondations », dans le module « SEO technique ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structure d''URL et maillage interne', 'native',
          'https://demo.invalid/seo-et-contenu/structure-d-url-et-maillage-interne.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Contenu qui classe', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Écrire pour deux lecteurs', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structurer-un-article-qui-repond-vraiment', 'Structurer un article qui répond vraiment',
          '## Structurer un article qui répond vraiment

Cette leçon fait partie du chapitre « Écrire pour deux lecteurs », dans le module « Contenu qui classe ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structurer un article qui répond vraiment', 'native',
          'https://demo.invalid/seo-et-contenu/structurer-un-article-qui-repond-vraiment.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'optimiser-sans-sur-optimiser', 'Optimiser sans sur-optimiser',
          '## Optimiser sans sur-optimiser

Cette leçon fait partie du chapitre « Écrire pour deux lecteurs », dans le module « Contenu qui classe ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Optimiser sans sur-optimiser', 'native',
          'https://demo.invalid/seo-et-contenu/optimiser-sans-sur-optimiser.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Netlinking', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Gagner en autorité', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-fait-un-bon-lien', 'Ce qui fait un bon lien',
          '## Ce qui fait un bon lien

Cette leçon fait partie du chapitre « Gagner en autorité », dans le module « Netlinking ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui fait un bon lien', 'native',
          'https://demo.invalid/seo-et-contenu/ce-qui-fait-un-bon-lien.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trois-methodes-d-acquisition-tenables', 'Trois méthodes d''acquisition tenables',
          '## Trois méthodes d''acquisition tenables

Cette leçon fait partie du chapitre « Gagner en autorité », dans le module « Netlinking ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trois méthodes d''acquisition tenables', 'native',
          'https://demo.invalid/seo-et-contenu/trois-methodes-d-acquisition-tenables.mp4',
          780, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Suivi des positions', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Mesurer le retour', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'search-console-au-quotidien', 'Search Console au quotidien',
          '## Search Console au quotidien

Cette leçon fait partie du chapitre « Mesurer le retour », dans le module « Suivi des positions ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Search Console au quotidien', 'native',
          'https://demo.invalid/seo-et-contenu/search-console-au-quotidien.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'decider-quoi-mettre-a-jour', 'Décider quoi mettre à jour',
          '## Décider quoi mettre à jour

Cette leçon fait partie du chapitre « Mesurer le retour », dans le module « Suivi des positions ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Décider quoi mettre à jour', 'native',
          'https://demo.invalid/seo-et-contenu/decider-quoi-mettre-a-jour.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Réseaux sociaux et personal branding
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'reseaux-sociaux-personal-branding', 'Réseaux sociaux et personal branding', 'Construire une audience qui achète, pas une audience qui applaudit.', 'Une audience n''a de valeur que si elle est composée des bonnes personnes et qu''elle vous fait confiance. Le reste, ce sont des chiffres de vanité.

Cette formation privilégie un système de production tenable sur un an à une stratégie brillante tenue trois semaines.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'marketing-digital'),
    'beginner', 'published', 14, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Choisir ses plateformes', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Ne pas être partout', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ou-se-trouve-reellement-votre-audience', 'Où se trouve réellement votre audience',
          '## Où se trouve réellement votre audience

Cette leçon fait partie du chapitre « Ne pas être partout », dans le module « Choisir ses plateformes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Où se trouve réellement votre audience', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/ou-se-trouve-reellement-votre-audience.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'une-plateforme-principale-une-secondaire', 'Une plateforme principale, une secondaire',
          '## Une plateforme principale, une secondaire

Cette leçon fait partie du chapitre « Ne pas être partout », dans le module « Choisir ses plateformes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Une plateforme principale, une secondaire', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/une-plateforme-principale-une-secondaire.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Ligne éditoriale', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Savoir de quoi on parle', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trois-piliers-de-contenu', 'Trois piliers de contenu',
          '## Trois piliers de contenu

Cette leçon fait partie du chapitre « Savoir de quoi on parle », dans le module « Ligne éditoriale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trois piliers de contenu', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/trois-piliers-de-contenu.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'trouver-son-angle-sans-se-deguiser', 'Trouver son angle sans se déguiser',
          '## Trouver son angle sans se déguiser

Cette leçon fait partie du chapitre « Savoir de quoi on parle », dans le module « Ligne éditoriale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Trouver son angle sans se déguiser', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/trouver-son-angle-sans-se-deguiser.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Formats courts', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Produire régulièrement', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'anatomie-d-un-format-court-qui-retient', 'Anatomie d''un format court qui retient',
          '## Anatomie d''un format court qui retient

Cette leçon fait partie du chapitre « Produire régulièrement », dans le module « Formats courts ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Anatomie d''un format court qui retient', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/anatomie-d-un-format-court-qui-retient.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recycler-un-contenu-en-cinq-formats', 'Recycler un contenu en cinq formats',
          '## Recycler un contenu en cinq formats

Cette leçon fait partie du chapitre « Produire régulièrement », dans le module « Formats courts ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Recycler un contenu en cinq formats', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/recycler-un-contenu-en-cinq-formats.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Rythme et système', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Tenir dans la durée', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-batch-produire-en-serie', 'Le batch : produire en série',
          '## Le batch : produire en série

Cette leçon fait partie du chapitre « Tenir dans la durée », dans le module « Rythme et système ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le batch : produire en série', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/le-batch-produire-en-serie.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'un-calendrier-realiste', 'Un calendrier réaliste',
          '## Un calendrier réaliste

Cette leçon fait partie du chapitre « Tenir dans la durée », dans le module « Rythme et système ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 540, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Un calendrier réaliste', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/un-calendrier-realiste.mp4',
          540, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Convertir son audience', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'De l''abonné au client', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'faire-passer-de-la-plateforme-a-votre-liste', 'Faire passer de la plateforme à votre liste',
          '## Faire passer de la plateforme à votre liste

Cette leçon fait partie du chapitre « De l''abonné au client », dans le module « Convertir son audience ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Faire passer de la plateforme à votre liste', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/faire-passer-de-la-plateforme-a-votre-liste.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'vendre-sans-casser-la-relation', 'Vendre sans casser la relation',
          '## Vendre sans casser la relation

Cette leçon fait partie du chapitre « De l''abonné au client », dans le module « Convertir son audience ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Vendre sans casser la relation', 'native',
          'https://demo.invalid/reseaux-sociaux-personal-branding/vendre-sans-casser-la-relation.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Page de vente qui convertit
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'page-de-vente-qui-convertit', 'Page de vente qui convertit', 'Structure, preuves, objections, tests : la page qui transforme l''intérêt en achat.', 'La page de vente est l''endroit où tout le travail précédent se transforme en chiffre d''affaires — ou se perd.

On construit ici une page complète, section par section, en s''appuyant sur ce que le visiteur se demande à chaque instant.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'vente-conversion'),
    'intermediate', 'published', 15, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Structure d''une page de vente', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le squelette', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-douze-sections-et-leur-ordre', 'Les douze sections et leur ordre',
          '## Les douze sections et leur ordre

Cette leçon fait partie du chapitre « Le squelette », dans le module « Structure d''une page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les douze sections et leur ordre', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/les-douze-sections-et-leur-ordre.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-doit-tenir-au-dessus-de-la-ligne-de-flottaison', 'Ce qui doit tenir au-dessus de la ligne de flottaison',
          '## Ce qui doit tenir au-dessus de la ligne de flottaison

Cette leçon fait partie du chapitre « Le squelette », dans le module « Structure d''une page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui doit tenir au-dessus de la ligne de flottaison', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/ce-qui-doit-tenir-au-dessus-de-la-ligne-de-flottaison.mp4',
          720, 0);

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Rédiger chaque section', 1, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'promesse-probleme-solution', 'Promesse, problème, solution',
          '## Promesse, problème, solution

Cette leçon fait partie du chapitre « Rédiger chaque section », dans le module « Structure d''une page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Promesse, problème, solution', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/promesse-probleme-solution.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'presenter-le-contenu-sans-lister-des-modules', 'Présenter le contenu sans lister des modules',
          '## Présenter le contenu sans lister des modules

Cette leçon fait partie du chapitre « Rédiger chaque section », dans le module « Structure d''une page de vente ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Présenter le contenu sans lister des modules', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/presenter-le-contenu-sans-lister-des-modules.mp4',
          720, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Squelette de page de vente', 'Les douze sections dans l''ordre, avec les questions auxquelles chacune répond.',
          'https://demo.invalid/page-de-vente-qui-convertit/ressources/squelette-de-page-de-vente', 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Structure d''une page de vente',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Que doit-on trouver au-dessus de la ligne de flottaison ?', 'Le visiteur décide en quelques secondes s''il continue. La promesse doit être immédiatement lisible.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'La promesse et l''appel à l''action principal', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Les témoignages', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'La FAQ', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Le détail des modules', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'multiple_choice', 'Qu''est-ce qui renforce réellement la crédibilité d''une page de vente ?', 'La preuve vérifiable rassure. La preuve inventée finit par se retourner contre vous, en plus d''être illégale.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Des témoignages précis et vérifiables', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Des résultats chiffrés que vous pouvez prouver', true, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Des logos de médias sans lien avec vous', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Un compteur de vente artificiel', false, null, 3);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Preuve sociale', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Rendre crédible', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'temoignages-utiles-contre-temoignages-decoratifs', 'Témoignages utiles contre témoignages décoratifs',
          '## Témoignages utiles contre témoignages décoratifs

Cette leçon fait partie du chapitre « Rendre crédible », dans le module « Preuve sociale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Témoignages utiles contre témoignages décoratifs', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/temoignages-utiles-contre-temoignages-decoratifs.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recueillir-des-retours-exploitables', 'Recueillir des retours exploitables',
          '## Recueillir des retours exploitables

Cette leçon fait partie du chapitre « Rendre crédible », dans le module « Preuve sociale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Recueillir des retours exploitables', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/recueillir-des-retours-exploitables.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Objections et FAQ', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Répondre avant qu''on demande', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'identifier-les-vraies-objections', 'Identifier les vraies objections',
          '## Identifier les vraies objections

Cette leçon fait partie du chapitre « Répondre avant qu''on demande », dans le module « Objections et FAQ ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Identifier les vraies objections', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/identifier-les-vraies-objections.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'une-faq-qui-vend', 'Une FAQ qui vend',
          '## Une FAQ qui vend

Cette leçon fait partie du chapitre « Répondre avant qu''on demande », dans le module « Objections et FAQ ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Une FAQ qui vend', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/une-faq-qui-vend.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Design et lisibilité', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Ne pas gêner la lecture', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'rythme-visuel-et-respiration', 'Rythme visuel et respiration',
          '## Rythme visuel et respiration

Cette leçon fait partie du chapitre « Ne pas gêner la lecture », dans le module « Design et lisibilité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Rythme visuel et respiration', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/rythme-visuel-et-respiration.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'version-mobile-la-majorite-de-vos-lecteurs', 'Version mobile : la majorité de vos lecteurs',
          '## Version mobile : la majorité de vos lecteurs

Cette leçon fait partie du chapitre « Ne pas gêner la lecture », dans le module « Design et lisibilité ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Version mobile : la majorité de vos lecteurs', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/version-mobile-la-majorite-de-vos-lecteurs.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Tests A/B', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Améliorer par la mesure', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-vaut-la-peine-d-etre-teste', 'Ce qui vaut la peine d''être testé',
          '## Ce qui vaut la peine d''être testé

Cette leçon fait partie du chapitre « Améliorer par la mesure », dans le module « Tests A/B ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui vaut la peine d''être testé', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/ce-qui-vaut-la-peine-d-etre-teste.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'volume-necessaire-pour-conclure', 'Volume nécessaire pour conclure',
          '## Volume nécessaire pour conclure

Cette leçon fait partie du chapitre « Améliorer par la mesure », dans le module « Tests A/B ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Volume nécessaire pour conclure', 'native',
          'https://demo.invalid/page-de-vente-qui-convertit/volume-necessaire-pour-conclure.mp4',
          720, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- VSL et webinaire de vente
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'vsl-et-webinaire', 'VSL et webinaire de vente', 'Vendre en vidéo : script, structure et relances.', 'La vidéo de vente permet de dérouler un argumentaire complet sans que le visiteur puisse survoler. C''est un levier puissant — et un exercice d''écriture exigeant.

Formation avancée : elle suppose une offre déjà construite et une page de vente existante.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'vente-conversion'),
    'advanced', 'published', 16, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Script d''une VSL', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'La trame', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-huit-blocs-d-une-vsl', 'Les huit blocs d''une VSL',
          '## Les huit blocs d''une VSL

Cette leçon fait partie du chapitre « La trame », dans le module « Script d''une VSL ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les huit blocs d''une VSL', 'native',
          'https://demo.invalid/vsl-et-webinaire/les-huit-blocs-d-une-vsl.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ecrire-l-ouverture-qui-retient', 'Écrire l''ouverture qui retient',
          '## Écrire l''ouverture qui retient

Cette leçon fait partie du chapitre « La trame », dans le module « Script d''une VSL ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Écrire l''ouverture qui retient', 'native',
          'https://demo.invalid/vsl-et-webinaire/ecrire-l-ouverture-qui-retient.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'amener-le-prix-sans-rupture', 'Amener le prix sans rupture',
          '## Amener le prix sans rupture

Cette leçon fait partie du chapitre « La trame », dans le module « Script d''une VSL ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Amener le prix sans rupture', 'native',
          'https://demo.invalid/vsl-et-webinaire/amener-le-prix-sans-rupture.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Webinaire evergreen ou live', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Choisir son format', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'live-automatise-hybride-comparaison-honnete', 'Live, automatisé, hybride : comparaison honnête',
          '## Live, automatisé, hybride : comparaison honnête

Cette leçon fait partie du chapitre « Choisir son format », dans le module « Webinaire evergreen ou live ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Live, automatisé, hybride : comparaison honnête', 'native',
          'https://demo.invalid/vsl-et-webinaire/live-automatise-hybride-comparaison-honnete.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structure-d-un-webinaire-de-60-minutes', 'Structure d''un webinaire de 60 minutes',
          '## Structure d''un webinaire de 60 minutes

Cette leçon fait partie du chapitre « Choisir son format », dans le module « Webinaire evergreen ou live ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structure d''un webinaire de 60 minutes', 'native',
          'https://demo.invalid/vsl-et-webinaire/structure-d-un-webinaire-de-60-minutes.mp4',
          900, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Techniques de conversion', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le moment de la vente', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'transition-contenu-vers-offre', 'Transition contenu vers offre',
          '## Transition contenu vers offre

Cette leçon fait partie du chapitre « Le moment de la vente », dans le module « Techniques de conversion ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Transition contenu vers offre', 'native',
          'https://demo.invalid/vsl-et-webinaire/transition-contenu-vers-offre.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'gerer-les-questions-en-direct', 'Gérer les questions en direct',
          '## Gérer les questions en direct

Cette leçon fait partie du chapitre « Le moment de la vente », dans le module « Techniques de conversion ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Gérer les questions en direct', 'native',
          'https://demo.invalid/vsl-et-webinaire/gerer-les-questions-en-direct.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Relances', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Après la diffusion', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'sequence-de-relance-post-webinaire', 'Séquence de relance post-webinaire',
          '## Séquence de relance post-webinaire

Cette leçon fait partie du chapitre « Après la diffusion », dans le module « Relances ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Séquence de relance post-webinaire', 'native',
          'https://demo.invalid/vsl-et-webinaire/sequence-de-relance-post-webinaire.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'segmenter-selon-le-comportement', 'Segmenter selon le comportement',
          '## Segmenter selon le comportement

Cette leçon fait partie du chapitre « Après la diffusion », dans le module « Relances ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Segmenter selon le comportement', 'native',
          'https://demo.invalid/vsl-et-webinaire/segmenter-selon-le-comportement.mp4',
          720, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Closing et appels de vente
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'closing-appels-de-vente', 'Closing et appels de vente', 'Qualifier, structurer l''appel, traiter les objections, conclure proprement.', 'Pour les offres à plusieurs milliers d''euros, l''appel reste le canal le plus efficace. Encore faut-il qu''il soit structuré et que la qualification soit faite en amont.

Cette formation assume une position claire : le closing efficace est celui qui n''essaie pas de convaincre quelqu''un qui n''a pas le problème.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'vente-conversion'),
    'advanced', 'published', 17, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Qualification', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Filtrer avant l''appel', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-formulaire-de-prise-de-rendez-vous', 'Le formulaire de prise de rendez-vous',
          '## Le formulaire de prise de rendez-vous

Cette leçon fait partie du chapitre « Filtrer avant l''appel », dans le module « Qualification ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le formulaire de prise de rendez-vous', 'native',
          'https://demo.invalid/closing-appels-de-vente/le-formulaire-de-prise-de-rendez-vous.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'reconnaitre-un-prospect-non-qualifie', 'Reconnaître un prospect non qualifié',
          '## Reconnaître un prospect non qualifié

Cette leçon fait partie du chapitre « Filtrer avant l''appel », dans le module « Qualification ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Reconnaître un prospect non qualifié', 'native',
          'https://demo.invalid/closing-appels-de-vente/reconnaitre-un-prospect-non-qualifie.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Trame d''appel', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Structurer la conversation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-six-etapes-d-un-appel-de-vente', 'Les six étapes d''un appel de vente',
          '## Les six étapes d''un appel de vente

Cette leçon fait partie du chapitre « Structurer la conversation », dans le module « Trame d''appel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les six étapes d''un appel de vente', 'native',
          'https://demo.invalid/closing-appels-de-vente/les-six-etapes-d-un-appel-de-vente.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'poser-des-questions-plutot-que-presenter', 'Poser des questions plutôt que présenter',
          '## Poser des questions plutôt que présenter

Cette leçon fait partie du chapitre « Structurer la conversation », dans le module « Trame d''appel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Poser des questions plutôt que présenter', 'native',
          'https://demo.invalid/closing-appels-de-vente/poser-des-questions-plutot-que-presenter.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'faire-dire-le-probleme-par-le-prospect', 'Faire dire le problème par le prospect',
          '## Faire dire le problème par le prospect

Cette leçon fait partie du chapitre « Structurer la conversation », dans le module « Trame d''appel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Faire dire le problème par le prospect', 'native',
          'https://demo.invalid/closing-appels-de-vente/faire-dire-le-probleme-par-le-prospect.mp4',
          720, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'pdf', 'Trame d''appel imprimable', 'Les six étapes et les questions à poser à chacune.',
          'https://demo.invalid/closing-appels-de-vente/ressources/trame-d-appel-imprimable', 0);

  insert into public.quizzes
    (scope, lesson_id, course_id, title, description, passing_score,
     max_attempts, shuffle_questions, show_explanations, status, sort_order)
  values ('lesson', v_lesson, v_course, 'Trame d''appel',
          'Vérifiez que l''essentiel du module est acquis avant de passer à la suite.',
          70, null, true, true, 'published', 0)
  returning id into v_quiz;

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'single_choice', 'Quelle est la première étape d''un appel de vente structuré ?', 'Cadrer réduit l''anxiété des deux côtés et vous autorise à poser des questions sans paraître intrusif.', 1, 0)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Cadrer l''appel et son déroulé', true, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Présenter l''offre', false, null, 1);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Annoncer le prix', false, null, 2);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Traiter les objections', false, null, 3);

  insert into public.questions (quiz_id, type, prompt, explanation, points, sort_order)
  values (v_quiz, 'true_false', 'Un bon appel de vente est celui où le vendeur parle le plus.', 'Le prospect doit formuler lui-même son problème. Un vendeur qui monopolise la parole vend à quelqu''un qu''il n''a pas compris.', 1, 1)
  returning id into v_question;
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Vrai', false, null, 0);
  insert into public.answers (question_id, label, is_correct, match_pattern, sort_order)
  values (v_question, 'Faux', true, null, 1);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Objections', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Les cinq objections récurrentes', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'c-est-trop-cher', '« C''est trop cher »',
          '## « C''est trop cher »

Cette leçon fait partie du chapitre « Les cinq objections récurrentes », dans le module « Objections ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, '« C''est trop cher »', 'native',
          'https://demo.invalid/closing-appels-de-vente/c-est-trop-cher.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'je-dois-reflechir', '« Je dois réfléchir »',
          '## « Je dois réfléchir »

Cette leçon fait partie du chapitre « Les cinq objections récurrentes », dans le module « Objections ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, '« Je dois réfléchir »', 'native',
          'https://demo.invalid/closing-appels-de-vente/je-dois-reflechir.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-n-est-pas-le-bon-moment', '« Ce n''est pas le bon moment »',
          '## « Ce n''est pas le bon moment »

Cette leçon fait partie du chapitre « Les cinq objections récurrentes », dans le module « Objections ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 2, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, '« Ce n''est pas le bon moment »', 'native',
          'https://demo.invalid/closing-appels-de-vente/ce-n-est-pas-le-bon-moment.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Suivi et relance', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Après l''appel', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'recapitulatif-ecrit-et-prochaine-etape', 'Récapitulatif écrit et prochaine étape',
          '## Récapitulatif écrit et prochaine étape

Cette leçon fait partie du chapitre « Après l''appel », dans le module « Suivi et relance ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Récapitulatif écrit et prochaine étape', 'native',
          'https://demo.invalid/closing-appels-de-vente/recapitulatif-ecrit-et-prochaine-etape.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'relancer-sans-harceler', 'Relancer sans harceler',
          '## Relancer sans harceler

Cette leçon fait partie du chapitre « Après l''appel », dans le module « Suivi et relance ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Relancer sans harceler', 'native',
          'https://demo.invalid/closing-appels-de-vente/relancer-sans-harceler.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Éthique commerciale', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Vendre sans regretter', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'quand-refuser-une-vente', 'Quand refuser une vente',
          '## Quand refuser une vente

Cette leçon fait partie du chapitre « Vendre sans regretter », dans le module « Éthique commerciale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Quand refuser une vente', 'native',
          'https://demo.invalid/closing-appels-de-vente/quand-refuser-une-vente.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-que-promet-votre-discours-engage-votre-produit', 'Ce que promet votre discours engage votre produit',
          '## Ce que promet votre discours engage votre produit

Cette leçon fait partie du chapitre « Vendre sans regretter », dans le module « Éthique commerciale ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce que promet votre discours engage votre produit', 'native',
          'https://demo.invalid/closing-appels-de-vente/ce-que-promet-votre-discours-engage-votre-produit.mp4',
          600, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Lancement orchestré
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'lancement-orchestre', 'Lancement orchestré', 'Pré-lancement, ouverture, urgence, débrief : concentrer les ventes sur une fenêtre.', 'Un lancement concentre en une semaine ce qu''une vente permanente met des mois à produire. En contrepartie, tout ce qui n''a pas été préparé se voit.

Cette formation déroule un calendrier complet, du pré-lancement au débrief.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'vente-conversion'),
    'advanced', 'published', 18, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Pré-lancement', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Préparer le terrain', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'liste-d-attente-et-promesse-d-ouverture', 'Liste d''attente et promesse d''ouverture',
          '## Liste d''attente et promesse d''ouverture

Cette leçon fait partie du chapitre « Préparer le terrain », dans le module « Pré-lancement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Liste d''attente et promesse d''ouverture', 'native',
          'https://demo.invalid/lancement-orchestre/liste-d-attente-et-promesse-d-ouverture.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'calendrier-des-quatre-semaines', 'Calendrier des quatre semaines',
          '## Calendrier des quatre semaines

Cette leçon fait partie du chapitre « Préparer le terrain », dans le module « Pré-lancement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Calendrier des quatre semaines', 'native',
          'https://demo.invalid/lancement-orchestre/calendrier-des-quatre-semaines.mp4',
          840, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Rétroplanning de lancement', 'Calendrier sur quatre semaines, tâche par tâche.',
          'https://demo.invalid/lancement-orchestre/ressources/retroplanning-de-lancement', 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Contenu de lancement', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Créer l''attente', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-serie-de-contenus-gratuits', 'La série de contenus gratuits',
          '## La série de contenus gratuits

Cette leçon fait partie du chapitre « Créer l''attente », dans le module « Contenu de lancement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 900, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La série de contenus gratuits', 'native',
          'https://demo.invalid/lancement-orchestre/la-serie-de-contenus-gratuits.mp4',
          900, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'repondre-publiquement-aux-objections', 'Répondre publiquement aux objections',
          '## Répondre publiquement aux objections

Cette leçon fait partie du chapitre « Créer l''attente », dans le module « Contenu de lancement ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Répondre publiquement aux objections', 'native',
          'https://demo.invalid/lancement-orchestre/repondre-publiquement-aux-objections.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Ouverture des ventes', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le jour J', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'sequence-d-ouverture', 'Séquence d''ouverture',
          '## Séquence d''ouverture

Cette leçon fait partie du chapitre « Le jour J », dans le module « Ouverture des ventes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Séquence d''ouverture', 'native',
          'https://demo.invalid/lancement-orchestre/sequence-d-ouverture.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'gerer-le-support-pendant-le-pic', 'Gérer le support pendant le pic',
          '## Gérer le support pendant le pic

Cette leçon fait partie du chapitre « Le jour J », dans le module « Ouverture des ventes ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Gérer le support pendant le pic', 'native',
          'https://demo.invalid/lancement-orchestre/gerer-le-support-pendant-le-pic.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Urgence et rareté', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Sans mentir', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-formes-d-urgence-defendables', 'Les formes d''urgence défendables',
          '## Les formes d''urgence défendables

Cette leçon fait partie du chapitre « Sans mentir », dans le module « Urgence et rareté ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les formes d''urgence défendables', 'native',
          'https://demo.invalid/lancement-orchestre/les-formes-d-urgence-defendables.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-qui-detruit-la-confiance', 'Ce qui détruit la confiance',
          '## Ce qui détruit la confiance

Cette leçon fait partie du chapitre « Sans mentir », dans le module « Urgence et rareté ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce qui détruit la confiance', 'native',
          'https://demo.invalid/lancement-orchestre/ce-qui-detruit-la-confiance.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Débriefer', 4, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Capitaliser', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-chiffres-a-relever-apres-un-lancement', 'Les chiffres à relever après un lancement',
          '## Les chiffres à relever après un lancement

Cette leçon fait partie du chapitre « Capitaliser », dans le module « Débriefer ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les chiffres à relever après un lancement', 'native',
          'https://demo.invalid/lancement-orchestre/les-chiffres-a-relever-apres-un-lancement.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'preparer-le-lancement-suivant', 'Préparer le lancement suivant',
          '## Préparer le lancement suivant

Cette leçon fait partie du chapitre « Capitaliser », dans le module « Débriefer ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Préparer le lancement suivant', 'native',
          'https://demo.invalid/lancement-orchestre/preparer-le-lancement-suivant.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Affiliation et partenariats
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'affiliation-et-partenariats', 'Affiliation et partenariats', 'Faire vendre par d''autres : recrutement, commissions, kit promotionnel.', 'L''affiliation permet d''acheter du trafic à la performance : vous ne payez qu''après la vente. Encore faut-il donner aux affiliés de quoi vendre.

Cette formation traite autant du recrutement que de l''outillage.',
    (select id from public.levels   where slug = 'intermediaire'),
    (select id from public.subjects where slug = 'vente-conversion'),
    'intermediate', 'published', 19, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Recruter des affiliés', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Trouver les bonnes personnes', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ou-chercher-des-affilies-pertinents', 'Où chercher des affiliés pertinents',
          '## Où chercher des affiliés pertinents

Cette leçon fait partie du chapitre « Trouver les bonnes personnes », dans le module « Recruter des affiliés ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Où chercher des affiliés pertinents', 'native',
          'https://demo.invalid/affiliation-et-partenariats/ou-chercher-des-affilies-pertinents.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'le-message-d-approche', 'Le message d''approche',
          '## Le message d''approche

Cette leçon fait partie du chapitre « Trouver les bonnes personnes », dans le module « Recruter des affiliés ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Le message d''approche', 'native',
          'https://demo.invalid/affiliation-et-partenariats/le-message-d-approche.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Commissions et suivi', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Cadrer la relation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'fixer-un-taux-de-commission-viable', 'Fixer un taux de commission viable',
          '## Fixer un taux de commission viable

Cette leçon fait partie du chapitre « Cadrer la relation », dans le module « Commissions et suivi ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Fixer un taux de commission viable', 'native',
          'https://demo.invalid/affiliation-et-partenariats/fixer-un-taux-de-commission-viable.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'suivi-des-ventes-et-paiements', 'Suivi des ventes et paiements',
          '## Suivi des ventes et paiements

Cette leçon fait partie du chapitre « Cadrer la relation », dans le module « Commissions et suivi ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Suivi des ventes et paiements', 'native',
          'https://demo.invalid/affiliation-et-partenariats/suivi-des-ventes-et-paiements.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Kit promotionnel', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Outiller ses affiliés', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'ce-que-contient-un-bon-kit', 'Ce que contient un bon kit',
          '## Ce que contient un bon kit

Cette leçon fait partie du chapitre « Outiller ses affiliés », dans le module « Kit promotionnel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Ce que contient un bon kit', 'native',
          'https://demo.invalid/affiliation-et-partenariats/ce-que-contient-un-bon-kit.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'e-mails-et-creatives-prets-a-l-emploi', 'E-mails et créatives prêts à l''emploi',
          '## E-mails et créatives prêts à l''emploi

Cette leçon fait partie du chapitre « Outiller ses affiliés », dans le module « Kit promotionnel ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'E-mails et créatives prêts à l''emploi', 'native',
          'https://demo.invalid/affiliation-et-partenariats/e-mails-et-creatives-prets-a-l-emploi.mp4',
          660, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Partenariats', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Au-delà de l''affiliation', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'co-marketing-et-echanges-d-audience', 'Co-marketing et échanges d''audience',
          '## Co-marketing et échanges d''audience

Cette leçon fait partie du chapitre « Au-delà de l''affiliation », dans le module « Partenariats ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Co-marketing et échanges d''audience', 'native',
          'https://demo.invalid/affiliation-et-partenariats/co-marketing-et-echanges-d-audience.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'structurer-un-partenariat-gagnant-gagnant', 'Structurer un partenariat gagnant-gagnant',
          '## Structurer un partenariat gagnant-gagnant

Cette leçon fait partie du chapitre « Au-delà de l''affiliation », dans le module « Partenariats ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Structurer un partenariat gagnant-gagnant', 'native',
          'https://demo.invalid/affiliation-et-partenariats/structurer-un-partenariat-gagnant-gagnant.mp4',
          660, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Stack d'outils et automatisation
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'stack-outils-automatisation', 'Stack d''outils et automatisation', 'Choisir, connecter et automatiser sans transformer son business en usine à gaz.', 'Chaque outil ajouté est une dette : il faut le payer, l''apprendre, le maintenir et le connecter aux autres.

Cette formation aide à construire une stack minimale qui tient, plutôt qu''une collection d''abonnements.',
    (select id from public.levels   where slug = 'debutant'),
    (select id from public.subjects where slug = 'business-ops'),
    'beginner', 'published', 20, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Choisir ses outils', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Le minimum viable', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-cinq-briques-indispensables', 'Les cinq briques indispensables',
          '## Les cinq briques indispensables

Cette leçon fait partie du chapitre « Le minimum viable », dans le module « Choisir ses outils ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les cinq briques indispensables', 'native',
          'https://demo.invalid/stack-outils-automatisation/les-cinq-briques-indispensables.mp4',
          720, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'quand-un-outil-gratuit-suffit', 'Quand un outil gratuit suffit',
          '## Quand un outil gratuit suffit

Cette leçon fait partie du chapitre « Le minimum viable », dans le module « Choisir ses outils ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Quand un outil gratuit suffit', 'native',
          'https://demo.invalid/stack-outils-automatisation/quand-un-outil-gratuit-suffit.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Connecter son écosystème', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Faire circuler l''information', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'paiement-e-mail-plateforme-les-liaisons', 'Paiement, e-mail, plateforme : les liaisons',
          '## Paiement, e-mail, plateforme : les liaisons

Cette leçon fait partie du chapitre « Faire circuler l''information », dans le module « Connecter son écosystème ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Paiement, e-mail, plateforme : les liaisons', 'native',
          'https://demo.invalid/stack-outils-automatisation/paiement-e-mail-plateforme-les-liaisons.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'automatisation-sans-code', 'Automatisation sans code',
          '## Automatisation sans code

Cette leçon fait partie du chapitre « Faire circuler l''information », dans le module « Connecter son écosystème ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Automatisation sans code', 'native',
          'https://demo.invalid/stack-outils-automatisation/automatisation-sans-code.mp4',
          720, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Automatiser la livraison', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Vendre en dormant', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'de-l-achat-a-l-acces-en-trente-secondes', 'De l''achat à l''accès en trente secondes',
          '## De l''achat à l''accès en trente secondes

Cette leçon fait partie du chapitre « Vendre en dormant », dans le module « Automatiser la livraison ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'De l''achat à l''accès en trente secondes', 'native',
          'https://demo.invalid/stack-outils-automatisation/de-l-achat-a-l-acces-en-trente-secondes.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'gerer-les-cas-particuliers', 'Gérer les cas particuliers',
          '## Gérer les cas particuliers

Cette leçon fait partie du chapitre « Vendre en dormant », dans le module « Automatiser la livraison ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Gérer les cas particuliers', 'native',
          'https://demo.invalid/stack-outils-automatisation/gerer-les-cas-particuliers.mp4',
          600, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Support et SAV', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Tenir le service', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'une-faq-qui-reduit-vraiment-les-demandes', 'Une FAQ qui réduit vraiment les demandes',
          '## Une FAQ qui réduit vraiment les demandes

Cette leçon fait partie du chapitre « Tenir le service », dans le module « Support et SAV ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 660, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Une FAQ qui réduit vraiment les demandes', 'native',
          'https://demo.invalid/stack-outils-automatisation/une-faq-qui-reduit-vraiment-les-demandes.mp4',
          660, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'modeles-de-reponse-aux-cas-frequents', 'Modèles de réponse aux cas fréquents',
          '## Modèles de réponse aux cas fréquents

Cette leçon fait partie du chapitre « Tenir le service », dans le module « Support et SAV ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Modèles de réponse aux cas fréquents', 'native',
          'https://demo.invalid/stack-outils-automatisation/modeles-de-reponse-aux-cas-frequents.mp4',
          600, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;

-- ===========================================================================
-- Piloter son business par les chiffres
-- ===========================================================================
do $seed$
declare
  v_course  uuid;
  v_module  uuid;
  v_chapter uuid;
  v_lesson  uuid;
  v_quiz    uuid;
  v_question uuid;
begin
  insert into public.courses
    (slug, title, summary, description, level_id, subject_id, difficulty,
     status, sort_order, published_at, thumbnail_url)
  values (
    'piloter-par-les-chiffres', 'Piloter son business par les chiffres', 'Les indicateurs qui comptent, le tableau de bord hebdomadaire, le prévisionnel.', 'Beaucoup d''entrepreneurs digitaux connaissent leur chiffre d''affaires et ignorent leur marge. C''est suffisant pour se croire rentable, pas pour l''être.

Cette formation installe une routine de pilotage simple et hebdomadaire.',
    (select id from public.levels   where slug = 'avance'),
    (select id from public.subjects where slug = 'business-ops'),
    'advanced', 'published', 21, now(), null
  )
  on conflict (slug) do update
    set title = excluded.title, summary = excluded.summary,
        description = excluded.description, level_id = excluded.level_id,
        subject_id = excluded.subject_id, difficulty = excluded.difficulty,
        status = excluded.status, sort_order = excluded.sort_order
  returning id into v_course;

  -- Reconstruction complète de la structure : le seed reste rejouable.
  delete from public.modules where course_id = v_course;


  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Les KPI qui comptent', 0, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Trier l''essentiel', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'chiffres-de-vanite-contre-chiffres-de-decision', 'Chiffres de vanité contre chiffres de décision',
          '## Chiffres de vanité contre chiffres de décision

Cette leçon fait partie du chapitre « Trier l''essentiel », dans le module « Les KPI qui comptent ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, true, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Chiffres de vanité contre chiffres de décision', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/chiffres-de-vanite-contre-chiffres-de-decision.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'les-huit-indicateurs-d-un-business-digital', 'Les huit indicateurs d''un business digital',
          '## Les huit indicateurs d''un business digital

Cette leçon fait partie du chapitre « Trier l''essentiel », dans le module « Les KPI qui comptent ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Les huit indicateurs d''un business digital', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/les-huit-indicateurs-d-un-business-digital.mp4',
          840, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Tableau de bord hebdomadaire', 1, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Une routine tenable', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'construire-son-tableau-en-une-heure', 'Construire son tableau en une heure',
          '## Construire son tableau en une heure

Cette leçon fait partie du chapitre « Une routine tenable », dans le module « Tableau de bord hebdomadaire ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Construire son tableau en une heure', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/construire-son-tableau-en-une-heure.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'la-revue-du-lundi-matin', 'La revue du lundi matin',
          '## La revue du lundi matin

Cette leçon fait partie du chapitre « Une routine tenable », dans le module « Tableau de bord hebdomadaire ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 600, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'La revue du lundi matin', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/la-revue-du-lundi-matin.mp4',
          600, 0);

  insert into public.resources
    (lesson_id, type, title, description, url, sort_order)
  values (v_lesson, 'document', 'Tableau de bord hebdomadaire', 'Les huit indicateurs, prêts à remplir chaque lundi.',
          'https://demo.invalid/piloter-par-les-chiffres/ressources/tableau-de-bord-hebdomadaire', 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Marge et coût d''acquisition', 2, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Savoir ce qu''on gagne', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'calculer-sa-marge-nette-reelle', 'Calculer sa marge nette réelle',
          '## Calculer sa marge nette réelle

Cette leçon fait partie du chapitre « Savoir ce qu''on gagne », dans le module « Marge et coût d''acquisition ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 840, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Calculer sa marge nette réelle', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/calculer-sa-marge-nette-reelle.mp4',
          840, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'cac-ltv-et-ratio-de-securite', 'CAC, LTV et ratio de sécurité',
          '## CAC, LTV et ratio de sécurité

Cette leçon fait partie du chapitre « Savoir ce qu''on gagne », dans le module « Marge et coût d''acquisition ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'CAC, LTV et ratio de sécurité', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/cac-ltv-et-ratio-de-securite.mp4',
          780, 0);

  insert into public.modules (course_id, title, sort_order, status)
  values (v_course, 'Prévisionnel simple', 3, 'published')
  returning id into v_module;

  insert into public.chapters (module_id, course_id, title, sort_order, status)
  values (v_module, v_course, 'Anticiper', 0, 'published')
  returning id into v_chapter;

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'projeter-trois-mois-sans-tableur-monstrueux', 'Projeter trois mois sans tableur monstrueux',
          '## Projeter trois mois sans tableur monstrueux

Cette leçon fait partie du chapitre « Anticiper », dans le module « Prévisionnel simple ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 780, 0, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Projeter trois mois sans tableur monstrueux', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/projeter-trois-mois-sans-tableur-monstrueux.mp4',
          780, 0);

  insert into public.lessons
    (chapter_id, module_id, course_id, slug, title, content_md,
     duration_seconds, sort_order, is_free_preview, status)
  values (v_chapter, v_module, v_course, 'decider-d-un-investissement-avec-les-chiffres', 'Décider d''un investissement avec les chiffres',
          '## Décider d''un investissement avec les chiffres

Cette leçon fait partie du chapitre « Anticiper », dans le module « Prévisionnel simple ».

> Contenu de démonstration. Remplacez-le depuis l''administration : **Formations → cette formation → la leçon → Contenu et réglages**.

### À retenir

- Le point central de la leçon, formulé en une phrase
- L''erreur la plus fréquente sur ce sujet
- L''action concrète à mener avant la leçon suivante', 720, 1, false, 'published')
  returning id into v_lesson;

  insert into public.videos
    (lesson_id, title, provider, url, duration_seconds, sort_order)
  values (v_lesson, 'Décider d''un investissement avec les chiffres', 'native',
          'https://demo.invalid/piloter-par-les-chiffres/decider-d-un-investissement-avec-les-chiffres.mp4',
          720, 0);

  perform public.refresh_course_counters(v_course);
end;
$seed$;


-- ===========================================================================
-- Badges
-- ===========================================================================
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('first_lesson', 'Premier pas', 'Terminer sa première leçon.', '🎯', 'progression', '{"type":"lessons_completed","value":1}'::jsonb, 10, 1, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('ten_lessons', 'En rythme', 'Terminer 10 leçons.', '📈', 'progression', '{"type":"lessons_completed","value":10}'::jsonb, 25, 2, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('fifty_lessons', 'Assidu', 'Terminer 50 leçons.', '🧗', 'progression', '{"type":"lessons_completed","value":50}'::jsonb, 75, 3, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('first_course', 'Première formation', 'Terminer une formation complète.', '🏆', 'progression', '{"type":"courses_completed","value":1}'::jsonb, 50, 4, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('streak_7', 'Une semaine sans faille', '7 jours consécutifs de travail.', '🔥', 'regularite', '{"type":"streak_days","value":7}'::jsonb, 40, 5, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('streak_30', 'Discipline', '30 jours consécutifs de travail.', '💎', 'regularite', '{"type":"streak_days","value":30}'::jsonb, 150, 6, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('quiz_10', 'Théorie maîtrisée', 'Réussir 10 quiz.', '🧠', 'evaluation', '{"type":"quizzes_passed","value":10}'::jsonb, 60, 7, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('perfect_quiz', 'Sans faute', 'Obtenir 100 % à un quiz.', '⭐', 'evaluation', '{"type":"perfect_quiz","value":1}'::jsonb, 30, 8, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('builder', 'Builder', 'Terminer toutes les formations Produit digital.', '📦', 'domaine', '{"type":"subject_completed","subject":"produit-digital"}'::jsonb, 120, 9, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('media_buyer', 'Media Buyer', 'Terminer toutes les formations Media Buying.', '🎯', 'domaine', '{"type":"subject_completed","subject":"media-buying"}'::jsonb, 120, 10, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('marketer', 'Marketer', 'Terminer toutes les formations Marketing digital.', '📣', 'domaine', '{"type":"subject_completed","subject":"marketing-digital"}'::jsonb, 120, 11, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('closer', 'Closer', 'Terminer toutes les formations Vente & Conversion.', '🤝', 'domaine', '{"type":"subject_completed","subject":"vente-conversion"}'::jsonb, 120, 12, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;
insert into public.badges (code, name, description, icon, category, criteria, xp_reward, sort_order, is_active)
values ('full_stack', 'Full-stack business', 'Terminer toutes les formations du catalogue.', '👑', 'domaine', '{"type":"all_courses_completed"}'::jsonb, 400, 13, true)
on conflict (code) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      category = excluded.category, criteria = excluded.criteria,
      xp_reward = excluded.xp_reward, sort_order = excluded.sort_order;


-- ===========================================================================
-- Codes d'activation de démonstration
-- ===========================================================================
insert into public.access_codes (code, label, scope, max_uses, access_days, is_active)
values
  ('DEMO-FULL-2026', 'Démonstration — catalogue complet', 'all', 100, null, true),
  ('DEMO-YEAR-2026', 'Démonstration — accès 12 mois',     'all', 100, 365,  true)
on conflict (code) do nothing;

insert into public.access_codes (code, label, scope, subject_id, max_uses, is_active)
select 'DEMO-MEDIA-BUY', 'Démonstration — domaine Media Buying', 'subject', id, 100, true
from public.subjects where slug = 'media-buying'
on conflict (code) do nothing;

commit;

-- ===========================================================================
-- Récapitulatif
-- ===========================================================================
select
  (select count(*) from public.levels)   as parcours,
  (select count(*) from public.subjects) as domaines,
  (select count(*) from public.courses)  as formations,
  (select count(*) from public.modules)  as modules,
  (select count(*) from public.chapters) as chapitres,
  (select count(*) from public.lessons)  as lecons,
  (select count(*) from public.videos)   as videos,
  (select count(*) from public.quizzes)  as quiz,
  (select count(*) from public.questions) as questions,
  (select count(*) from public.exercises) as exercices,
  (select count(*) from public.resources) as ressources,
  (select count(*) from public.badges)    as badges;
