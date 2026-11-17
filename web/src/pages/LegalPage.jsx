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
    title: "Conditions de service et d'utilisation",
    subtitle:
      "Les règles qui encadrent l'utilisation de la plateforme par les clients, les salons et leurs équipes.",
    description:
      "Conditions générales de service et d'utilisation de la plateforme : compte, réservations, paiements, abonnements, responsabilités et contact.",
    updatedAt: "Novembre 2026",
    sections: [
      {
        title: "1. Objet et acceptation",
        body: [
          "Les présentes conditions de service et d'utilisation régissent l'accès à la plateforme BeautyFlow, à ses pages publiques, à ses espaces administrateurs et à l'ensemble des services associés (réservation, gestion des salons, fidélité, paiements et support).",
          "En créant un compte, en réservant une prestation ou en utilisant la plateforme, vous déclarez avoir lu, compris et accepté ces conditions ainsi que la politique de confidentialité. Si vous agissez pour le compte d'un salon, vous confirmez disposer de l'autorité nécessaire pour l'engager.",
        ],
      },
      {
        title: "2. Définitions",
        body: [
          "« Plateforme » désigne BeautyFlow, ses sites, applications, pages vitrines et services en ligne.",
          "« Salon » désigne l'établissement professionnel référencé sur la plateforme. « Client » désigne toute personne qui consulte une vitrine ou réserve une prestation. « Utilisateur » désigne toute personne qui accède à la plateforme, quel que soit son rôle.",
        ],
      },
      {
        title: "3. Accès au service et compte utilisateur",
        body: [
          "L'accès à certaines fonctionnalités nécessite un compte. Vous vous engagez à fournir des informations exactes, à jour et complètes, et à maintenir la confidentialité de vos identifiants.",
          "Vous êtes responsable de toute activité réalisée depuis votre compte. En cas d'utilisation non autorisée, vous devez nous prévenir sans délai. Nous pouvons suspendre un compte en cas de suspicion raisonnable de fraude ou d'atteinte à la sécurité.",
        ],
      },
      {
        title: "4. Réservations et prestations",
        body: [
          "Les réservations sont proposées sous réserve des disponibilités communiquées par le salon. La confirmation définitive est celle qui apparaît dans votre espace personnel ou dans le message envoyé par la plateforme.",
          "Les prestations sont réalisées par le salon concerné. BeautyFlow facilite la mise en relation et la prise de rendez-vous mais n'exécute pas directement les soins. Les informations relatives aux horaires, tarifs et prestations sont publiées sous la responsabilité du salon.",
        ],
      },
      {
        title: "5. Annulation, report et absence",
        body: [
          "Les conditions d'annulation et de report peuvent varier selon le salon et la prestation. Elles doivent être consultées avant toute réservation. En cas d'absence non justifiée, le salon peut appliquer ses règles habituelles.",
          "Lorsqu'une prestation est annulée par le salon, celui-ci doit proposer un report ou un remboursement selon les règles qu'il a publiées et la réglementation applicable.",
        ],
      },
      {
        title: "6. Tarifs, paiements et remboursements",
        body: [
          "Les prix affichés sont ceux communiqués par les salons. Des frais ou options complémentaires peuvent être présentés avant la validation de la réservation ou de l'achat.",
          "Les paiements sont traités par les moyens proposés sur la plateforme. Les remboursements, lorsqu'ils sont dus, sont effectués selon le mode de paiement initial et dans les délais annoncés. BeautyFlow peut conserver une trace des transactions à des fins de preuve, de comptabilité et de lutte contre la fraude.",
        ],
      },
      {
        title: "7. Abonnements des salons",
        body: [
          "Les salons qui souscrivent à un abonnement bénéficient des fonctionnalités prévues dans leur formule pendant la durée de validité de celle-ci. Le renouvellement, la résiliation et les conditions de facturation sont ceux décrits dans l'espace de gestion de l'abonnement.",
          "L'absence de règlement ou l'expiration d'un abonnement peut entraîner la suspension de certaines fonctionnalités, sans suppression immédiate des données du salon.",
        ],
      },
      {
        title: "8. Programme de fidélité et cartes cadeaux",
        body: [
          "Les points de fidélité, avantages et cartes cadeaux sont gérés selon les règles définies par chaque salon. Ils sont personnels, non transmissibles et ne peuvent pas être échangés contre de l'espèce sauf mention contraire.",
          "Le salon reste responsable de la valeur, de la validité et de l'utilisation de ses avantages et cartes cadeaux.",
        ],
      },
      {
        title: "9. Obligations des salons et des utilisateurs",
        body: [
          "Les salons s'engagent à publier des informations véridiques, à respecter les réglementations applicables à leur activité et à traiter les données de leurs clients de manière conforme.",
          "Les utilisateurs s'engagent à ne pas perturber le fonctionnement de la plateforme, à ne pas tenter d'accéder à des comptes ou données qui ne leur appartiennent pas et à ne pas publier de contenu illicite, diffamatoire ou trompeur.",
        ],
      },
      {
        title: "10. Données personnelles",
        body: [
          "Le traitement des données personnelles est décrit dans la politique de confidentialité accessible depuis le pied de page. En utilisant la plateforme, vous acceptez ce traitement dans les limites qui y sont précisées.",
        ],
      },
      {
        title: "11. Propriété intellectuelle",
        body: [
          "La plateforme, sa structure, ses textes, ses éléments graphiques et ses marques sont protégés. Toute reproduction ou utilisation non autorisée est interdite.",
          "Les contenus publiés par les salons (photos, descriptions, logos) restent leur propriété. En les publiant, ils autorisent BeautyFlow à les afficher dans le cadre du service.",
        ],
      },
      {
        title: "12. Responsabilité",
        body: [
          "BeautyFlow met en relation les utilisateurs et les salons et fournit des outils de gestion. Elle n'est pas partie aux contrats de prestation conclus directement entre un client et un salon.",
          "BeautyFlow ne peut être tenue responsable des dommages résultant d'une prestation réalisée par un salon, d'informations erronées publiées par un salon ou d'une utilisation non conforme de la plateforme, sous réserve des dispositions légales impératives.",
        ],
      },
      {
        title: "13. Suspension et résiliation",
        body: [
          "Nous pouvons suspendre ou fermer un compte en cas de violation des présentes conditions, de comportement frauduleux ou sur demande de l'utilisateur. Les données restent conservées pendant la durée nécessaire au traitement des réservations et aux obligations légales.",
          "Vous pouvez demander la fermeture de votre compte depuis votre espace personnel ou en nous contactant.",
        ],
      },
      {
        title: "14. Force majeure",
        body: [
          "BeautyFlow ne saurait être tenue responsable d'un manquement à ses obligations résultant d'un événement de force majeure ou d'une cause indépendante de sa volonté (panne d'infrastructure, cyberattaque, catastrophe naturelle, décision administrative, etc.).",
        ],
      },
      {
        title: "15. Modification des conditions",
        body: [
          "Nous pouvons modifier ces conditions pour tenir compte de l'évolution du service ou des exigences légales. La version en vigueur est celle publiée sur cette page, avec indication de la date de dernière mise à jour.",
          "Pour les modifications substantielles, un avis peut être affiché sur la plateforme avant leur entrée en vigueur.",
        ],
      },
      {
        title: "16. Droit applicable et litiges",
        body: [
          "Les présentes conditions sont soumises au droit applicable, sans préjudice des dispositions impératives protectrices des consommateurs. En cas de litige, les parties s'engagent à rechercher d'abord une solution amiable via la page Contact.",
        ],
      },
      {
        title: "17. Contact",
        body: [
          "Pour toute question relative à ces conditions, utilisez la page Contact de la plateforme ou l'adresse e-mail indiquée dans le pied de page. Nous nous efforçons de répondre dans les plus brefs délais.",
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
