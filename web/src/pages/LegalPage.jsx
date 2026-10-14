// /src/pages/LegalPage.jsx
import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import { useMetaTags } from "@/utils/seo.js";
import { ShieldCheck, FileText, Cookie, ArrowLeft } from "lucide-react";

const CONTENT = {
  privacy: {
    icon: ShieldCheck,
    title: "Politique de Confidentialité",
    subtitle:
      "Comment nous collectons, utilisons et protégeons vos données personnelles.",
    description:
      "Politique de confidentialité de la plateforme : données collectées, finalités, conservation et droits des utilisateurs.",
    updatedAt: "Janvier 2026",
    sections: [
      {
        title: "1. Données que nous collectons",
        body: [
          "Nous collectons les informations que vous nous fournissez directement : nom, adresse e-mail, numéro de téléphone, ainsi que les informations liées à vos réservations et achats.",
          "Nous enregistrons également certaines données techniques (adresse IP, type d'appareil, pages consultées) afin d'assurer la sécurité et l'amélioration du service.",
        ],
      },
      {
        title: "2. Utilisation des données",
        body: [
          "Vos données servent à gérer vos réservations, vos paiements et votre programme de fidélité, à vous envoyer des notifications et rappels, et à améliorer nos services.",
          "Nous ne vendons ni ne louons vos données personnelles à des tiers.",
        ],
      },
      {
        title: "3. Partage des données",
        body: [
          "Vos données peuvent être transmises au salon concerné par votre réservation, ainsi qu'à nos prestataires techniques (hébergement, paiement) strictement pour les besoins du service.",
        ],
      },
      {
        title: "4. Conservation",
        body: [
          "Les données sont conservées pendant la durée nécessaire à la fourniture du service et au respect de nos obligations légales.",
        ],
      },
      {
        title: "5. Vos droits",
        body: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition sur vos données. Pour exercer ces droits, contactez-nous depuis la page Contact.",
        ],
      },
      {
        title: "6. Sécurité",
        body: [
          "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé.",
        ],
      },
    ],
  },
  terms: {
    icon: FileText,
    title: "Conditions Générales",
    subtitle: "Les règles d'utilisation de la plateforme et des services.",
    description:
      "Conditions générales d'utilisation de la plateforme : compte, réservations, paiements et responsabilités.",
    updatedAt: "Janvier 2026",
    sections: [
      {
        title: "1. Objet",
        body: [
          "Les présentes conditions régissent l'accès et l'utilisation de la plateforme de gestion et de réservation de salons de beauté, ainsi que des services associés.",
        ],
      },
      {
        title: "2. Compte utilisateur",
        body: [
          "Vous êtes responsable de l'exactitude des informations fournies lors de la création de votre compte et de la confidentialité de vos identifiants.",
        ],
      },
      {
        title: "3. Réservations et annulations",
        body: [
          "Les réservations sont soumises aux disponibilités des salons. Les conditions d'annulation peuvent varier selon l'établissement ; nous vous invitons à les consulter avant toute réservation.",
        ],
      },
      {
        title: "4. Paiements",
        body: [
          "Les paiements sont effectués selon les moyens proposés par le salon. Les montants, réductions et éventuels remboursements sont gérés par le salon concerné.",
        ],
      },
      {
        title: "5. Responsabilités",
        body: [
          "La plateforme met en relation les clients et les salons. Chaque salon reste responsable des prestations qu'il fournit et des informations qu'il publie.",
        ],
      },
      {
        title: "6. Comportement",
        body: [
          "Tout usage abusif, frauduleux ou contraire à la loi peut entraîner la suspension ou la suppression du compte.",
        ],
      },
      {
        title: "7. Modification des conditions",
        body: [
          "Nous pouvons modifier ces conditions à tout moment. La version en vigueur est celle publiée sur cette page.",
        ],
      },
    ],
  },
  cookies: {
    icon: Cookie,
    title: "Cookies",
    subtitle: "Comment nous utilisons les cookies et technologies similaires.",
    description:
      "Politique relative aux cookies : cookies essentiels, de mesure et de préférences, et gestion du consentement.",
    updatedAt: "Janvier 2026",
    sections: [
      {
        title: "1. Qu'est-ce qu'un cookie ?",
        body: [
          "Un cookie est un petit fichier déposé sur votre appareil lors de la visite d'un site. Il permet de reconnaître votre navigateur et de mémoriser certaines informations.",
        ],
      },
      {
        title: "2. Cookies essentiels",
        body: [
          "Ces cookies sont nécessaires au fonctionnement du service : maintien de votre session, sécurité et préférences de base. Ils ne peuvent pas être désactivés.",
        ],
      },
      {
        title: "3. Cookies de mesure et de préférences",
        body: [
          "Ils nous aident à comprendre l'utilisation de la plateforme et à mémoriser vos préférences (langue, affichage).",
        ],
      },
      {
        title: "4. Gestion du consentement",
        body: [
          "Vous pouvez à tout moment accepter, refuser ou supprimer les cookies via les paramètres de votre navigateur.",
        ],
      },
      {
        title: "5. Cookies tiers",
        body: [
          "Certains services tiers (paiement, mesure d'audience) peuvent déposer leurs propres cookies, soumis à leurs politiques respectives.",
        ],
      },
    ],
  },
};

export default function LegalPage({ page = "privacy" }) {
  const content = CONTENT[page] || CONTENT.privacy;
  const Icon = content.icon;

  const metaTags = useMetaTags({
    title: content.title,
    description: content.description,
  });

  return (
    <>
      <Helmet {...metaTags} />
      <PublicHeader />
      <main className="min-h-screen bg-background">
        <section className="border-b bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {content.title}
                </h1>
                <p className="mt-1 text-muted-foreground">{content.subtitle}</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Dernière mise à jour : {content.updatedAt}
            </p>
          </div>
        </section>

        <article className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="space-y-10">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  {section.body.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <PublicFooter />
    </>
  );
}
