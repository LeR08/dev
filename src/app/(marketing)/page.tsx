import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  KeyRound,
  Megaphone,
  NotebookPen,
  Package,
  PlayCircle,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { createClient } from '@/lib/supabase/server';
import { routes } from '@/lib/constants/routes';
import { formatNumber } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Créer, promouvoir et vendre un produit digital',
  description:
    "La formation complète : créer votre produit digital, acheter du trafic rentable, construire votre tunnel et convertir. Media buying, marketing digital, copywriting et closing.",
  alternates: { canonical: '/' },
};

// Rendu statique : cette page ne dépend d'aucune donnée personnelle.
export const revalidate = 3600;

const DOMAINS: Array<{ icon: LucideIcon; name: string; description: string; topics: string[] }> = [
  {
    icon: Package,
    name: 'Produit digital',
    description: 'De l’idée au produit livrable, sans y passer six mois.',
    topics: ['Valider son idée', 'Créer sa formation', 'Ebook et templates', 'Construire son offre'],
  },
  {
    icon: Target,
    name: 'Media Buying',
    description: 'Acheter du trafic qui rapporte plus qu’il ne coûte.',
    topics: ['Meta Ads', 'TikTok Ads', 'Google Ads', 'Créatives', 'Tracking'],
  },
  {
    icon: Megaphone,
    name: 'Marketing digital',
    description: 'Attirer, capter et entretenir une audience.',
    topics: ['Tunnels de vente', 'Email marketing', 'Copywriting', 'SEO', 'Réseaux sociaux'],
  },
  {
    icon: TrendingUp,
    name: 'Vente & Conversion',
    description: 'Transformer l’attention en chiffre d’affaires.',
    topics: ['Page de vente', 'VSL & webinaire', 'Closing', 'Lancement', 'Affiliation'],
  },
];

const FEATURES: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: PlayCircle,
    title: 'Lecteur pensé pour apprendre',
    description:
      'Vitesse de 0,5× à 2×, reprise automatique exactement là où vous vous êtes arrêté, et progression enregistrée en continu.',
  },
  {
    icon: NotebookPen,
    title: 'Notes horodatées',
    description:
      'Notez une idée pendant la vidéo : la note garde le timecode et vous y ramène en un clic.',
  },
  {
    icon: BarChart3,
    title: 'Progression détaillée',
    description:
      'Par leçon, chapitre, module et formation. Vous savez toujours ce qu’il vous reste à faire.',
  },
  {
    icon: Trophy,
    title: 'Quiz et exercices corrigés',
    description:
      'Quatre types de questions, correction expliquée, et des exercices pratiques avec corrigé.',
  },
  {
    icon: Target,
    title: 'Objectifs et série',
    description:
      'Fixez un rythme quotidien ou hebdomadaire. La série de jours consécutifs fait le reste.',
  },
  {
    icon: Settings2,
    title: 'Ressources téléchargeables',
    description:
      'Tableurs de calcul de ROAS, templates de structure de compte, checklists de lancement.',
  },
];

const STEPS = [
  { title: 'Créez votre compte', description: 'Gratuit, en trente secondes. Les leçons en accès libre sont immédiatement disponibles.' },
  { title: 'Activez votre code', description: 'Le code reçu après votre achat débloque les formations qu’il couvre.' },
  { title: 'Suivez votre parcours', description: 'La plateforme retient où vous en êtes et vous propose la suite logique.' },
];

const FAQ = [
  {
    question: 'Faut-il déjà avoir un produit pour commencer ?',
    answer:
      'Non. Le domaine « Produit digital » part de zéro : trouver une idée, la valider avant de créer quoi que ce soit, puis construire l’offre. Si vous avez déjà un produit, commencez directement par le Media Buying.',
  },
  {
    question: 'Combien de temps faut-il y consacrer ?',
    answer:
      'Chaque leçon dure entre 5 et 15 minutes. Un objectif de 30 minutes par jour permet de terminer une formation complète en deux à trois semaines. La plateforme suit votre temps d’étude pour vous aider à tenir le rythme.',
  },
  {
    question: 'Comment fonctionne l’accès ?',
    answer:
      'L’inscription est gratuite et donne accès aux leçons offertes de chaque formation. Le reste se débloque avec le code d’activation reçu après votre achat. Selon le code, l’accès porte sur une formation, un domaine ou le catalogue complet.',
  },
  {
    question: 'Les formations sont-elles mises à jour ?',
    answer:
      'Oui. Le media buying évolue vite : quand une plateforme change son interface ou ses règles, les leçons concernées sont retournées et vous êtes notifié.',
  },
  {
    question: 'Puis-je suivre les formations sur mobile ?',
    answer:
      'Oui. La plateforme est conçue pour le mobile autant que pour l’ordinateur : le lecteur, les notes et le suivi de progression fonctionnent de la même façon sur les deux.',
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Chiffres réels du catalogue — jamais de promesse de revenus inventée.
  const [{ count: courseCount }, { data: courses }, { data: subjects }] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('courses').select('lessons_count, duration_seconds').eq('status', 'published'),
    supabase.from('subjects').select('id').eq('status', 'published'),
  ]);

  const lessonTotal = (courses ?? []).reduce((sum, row) => sum + row.lessons_count, 0);
  const hoursTotal = Math.round(
    (courses ?? []).reduce((sum, row) => sum + row.duration_seconds, 0) / 3600,
  );

  return (
    <>
      {/* Hero */}
      <section className="surface-gradient relative overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <Badge variant="primary" className="mb-6">
            <Sparkles /> Formation complète · 4 domaines
          </Badge>

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Créez un produit digital, achetez du trafic,{' '}
            <span className="text-primary">et vendez-le</span>
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">
            La chaîne complète, de l&apos;idée à la vente : création de produit, media buying,
            marketing digital et conversion. Des leçons courtes, des ressources concrètes, et un
            suivi de progression qui vous garde en mouvement.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.register}>
                Créer mon compte gratuitement <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={routes.login}>
                <KeyRound /> J&apos;ai un code d&apos;accès
              </Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            Inscription gratuite · Leçons en accès libre disponibles immédiatement
          </p>
        </div>
      </section>

      {/* Chiffres du catalogue.
          Masqués tant que le catalogue est vide — ou si la base est
          momentanément injoignable : afficher « 0 formation » ferait paraître
          la plateforme abandonnée, ce qui est pire que de ne rien afficher. */}
      {(courseCount ?? 0) > 0 && (
        <section className="border-y">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x px-5 sm:grid-cols-4 sm:px-8">
            <Stat value={formatNumber(courseCount ?? 0)} label="formations" />
            <Stat value={formatNumber(lessonTotal)} label="leçons" />
            <Stat value={`${formatNumber(hoursTotal)} h`} label="de contenu" />
            <Stat value={formatNumber(subjects?.length ?? 0)} label="domaines" />
          </div>
        </section>
      )}

      {/* Le problème */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Trois blocages, toujours les mêmes
          </h2>
          <p className="text-muted-foreground text-lg">
            La plupart des projets ne butent pas sur la motivation, mais sur un maillon manquant de
            la chaîne.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { title: 'Pas d’offre claire', text: 'Un produit conçu avant d’avoir validé que quelqu’un le voulait.' },
            { title: 'Pas de trafic rentable', text: 'Des campagnes lancées sans comprendre le coût d’acquisition ni la marge.' },
            { title: 'Pas de conversion', text: 'Des visiteurs qui arrivent, lisent, et repartent sans acheter.' },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-xl border p-6">
              <p className="font-semibold">{item.title}</p>
              <p className="text-muted-foreground mt-2 text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Les domaines */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Quatre domaines, une seule chaîne
            </h2>
            <p className="text-muted-foreground text-lg">
              Chaque domaine règle un maillon. Ensemble, ils forment un système complet.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {DOMAINS.map((domain) => (
              <div key={domain.name} className="bg-card rounded-xl border p-6">
                <span className="bg-primary-muted text-primary grid size-11 place-items-center rounded-xl">
                  <domain.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{domain.name}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{domain.description}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {domain.topics.map((topic) => (
                    <li key={topic}>
                      <Badge variant="outline">{topic}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Une plateforme, pas une liste de vidéos
          </h2>
          <p className="text-muted-foreground text-lg">
            Tout ce qui aide à finir ce qu&apos;on a commencé.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="space-y-2.5">
              <span className="bg-primary-muted text-primary grid size-10 place-items-center rounded-xl">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Comment ça marche
          </h2>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-sm font-semibold">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Parcours */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Trois parcours selon votre point de départ
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { name: 'Débutant', text: 'Je pars de zéro et je veux lancer mon premier produit.', items: ['Valider une idée', 'Créer son produit', 'Premier tunnel', 'Bases du media buying'] },
            { name: 'Intermédiaire', text: 'J’ai lancé, je veux structurer et acquérir.', items: ['Meta & TikTok Ads', 'Email marketing', 'Page de vente', 'Créatives qui performent'] },
            { name: 'Avancé', text: 'Je veux scaler mon acquisition et mes marges.', items: ['Google Ads & PMax', 'Tracking et attribution', 'Lancement orchestré', 'Pilotage par les KPI'] },
          ].map((level) => (
            <div key={level.name} className="bg-card rounded-xl border p-6">
              <Badge variant="primary">{level.name}</Badge>
              <p className="text-muted-foreground mt-3 text-sm">{level.text}</p>
              <ul className="mt-4 space-y-2">
                {level.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Questions fréquentes
          </h2>

          <Accordion type="single" collapsible className="bg-card mt-10 divide-y rounded-xl border px-5">
            {FAQ.map((item) => (
              <AccordionItem key={item.question} value={item.question} className="border-b-0">
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="from-primary/12 via-card to-card rounded-2xl border bg-gradient-to-br p-10 text-center sm:p-14">
          <BookOpen className="text-primary mx-auto size-9" aria-hidden />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Commencez par les leçons offertes
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            L&apos;inscription est gratuite et sans engagement. Vous verrez le programme complet et
            pourrez suivre les leçons en accès libre avant toute décision.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={routes.register}>
              Créer mon compte <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      <p className="text-muted-foreground mt-1 text-sm">{label}</p>
    </div>
  );
}
