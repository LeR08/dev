import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const PAGES = {
  mentions: {
    title: 'Mentions légales',
    body: `## Éditeur du site

Ce site est édité par l'exploitant de la plateforme AtelierDigital.
Les coordonnées complètes (dénomination, adresse, numéro d'immatriculation,
directeur de la publication) doivent être renseignées avant toute mise en
production.

## Hébergement

Application hébergée par Vercel Inc. Base de données et authentification
fournies par Supabase.

## Propriété intellectuelle

L'ensemble des contenus pédagogiques — vidéos, textes, ressources
téléchargeables — est protégé par le droit d'auteur. Toute reproduction ou
rediffusion, y compris partielle, est interdite sans autorisation écrite.

## Accès aux formations

L'accès aux contenus réservés est personnel et non transmissible. Le partage
d'un code d'activation entraîne la révocation de l'accès concerné.`,
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    body: `## Données collectées

Sont collectés : votre adresse e-mail, votre nom, votre progression
pédagogique (leçons vues, résultats de quiz, temps d'étude) et vos notes
personnelles.

## Finalité

Ces données servent exclusivement à faire fonctionner la plateforme :
authentification, reprise de lecture, suivi de progression et recommandations.
Elles ne sont ni vendues, ni transmises à des tiers à des fins publicitaires.

## Vos notes

Vos notes personnelles sont privées. Les règles de sécurité de la base de
données garantissent techniquement qu'aucun autre membre ne peut y accéder.

## Conservation

Les données sont conservées tant que votre compte est actif. La suppression du
compte entraîne l'effacement de l'ensemble des données associées.

## Vos droits

Conformément au RGPD, vous disposez d'un droit d'accès, de rectification,
d'effacement et de portabilité de vos données. Ces demandes s'exercent auprès
du support.

## Cookies

Seuls des cookies strictement nécessaires au fonctionnement sont déposés :
ils portent votre session d'authentification. Aucun cookie publicitaire ni de
mesure d'audience tierce n'est utilisé.`,
  },
} as const;

type Slug = keyof typeof PAGES;

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug as Slug];
  return page ? { title: page.title } : { title: 'Page introuvable' };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug as Slug];
  if (!page) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="mt-8 space-y-4 text-[0.9375rem] leading-relaxed">
        {page.body.split('\n\n').map((block, index) =>
          block.startsWith('## ') ? (
            <h2 key={index} className="pt-4 text-lg font-semibold">
              {block.slice(3)}
            </h2>
          ) : (
            <p key={index} className="text-muted-foreground">
              {block}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
