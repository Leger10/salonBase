// /src/pages/PartnershipContractPage.jsx
//
// Contrat de partenariat imprimable (PDF via "Imprimer"). Les taux sont ceux
// appliques par le tableau de bord : 20 % de charges de survie puis 50/50.
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { ArrowLeft, Printer } from "lucide-react";

const APP_NAME = "BeautyFlow / SalonAfrique.net";
const COMPANY = "DigiHouse";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{title}</h2>
      <div className="space-y-2 text-[13px] leading-relaxed text-gray-800">{children}</div>
    </section>
  );
}

export default function PartnershipContractPage() {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .contract-sheet { box-shadow: none !important; margin: 0 !important; border: none !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Button asChild variant="ghost">
            <Link to="/super-admin/partnership">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour au partenariat
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              Imprimez en PDF, puis signez les deux exemplaires.
            </span>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer / PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="contract-sheet mx-auto my-6 max-w-4xl border bg-white px-8 py-10 shadow-sm md:px-12 md:py-14">
        <header className="mb-8 border-b-2 border-gray-900 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Contrat de partenariat commercial
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Exploite par {COMPANY} - Plateforme de gestion et de visibilite pour salons de beaute
          </p>
        </header>

        <div className="space-y-7">
          <Section title="Entre les soussignes">
            <p>
              <strong>Partenaire A (fondateur et editeur de la plateforme) :</strong>{" "}
              {COMPANY}, representee par ______________________________,
              ci-apres designe <strong>« le Partenaire A »</strong>.
            </p>
            <p>
              <strong>Partenaire B (associe en charge de la promotion et de la communication) :</strong>{" "}
              M./Mme ______________________________, demeurant a ______________________________,
              ci-apres designe <strong>« le Partenaire B »</strong>.
            </p>
            <p className="text-gray-600">
              Ensemble designes <strong>« les Parties »</strong>.
            </p>
          </Section>

          <Section title="Preambule">
            <p>
              Le Partenaire A exploite la plateforme {APP_NAME}, qui permet aux salons de beaute de
              gerer leurs rendez-vous, leurs ventes, leur equipe et leur vitrine en ligne. Le
              Partenaire B dispose d'un reseau, d'une capacite de communication et d'une credibilite
              commerciale permettant d'accelerer l'adoption de la plateforme.
            </p>
            <p>
              Les Parties souhaitent formaliser un partenariat <strong>gagnant-gagnant</strong>, dans
              lequel les revenus generes par les abonnements des salons sont partages de maniere
              transparente, equitable et verifiable.
            </p>
          </Section>

          <Section title="Article 1 - Objet du partenariat">
            <p>
              Le present contrat a pour objet de definir les conditions dans lesquelles le Partenaire B
              participe a la promotion et au developpement commercial de {APP_NAME}, et les modalites
              de partage des revenus issus des abonnements des salons.
            </p>
            <p>
              Le partenariat porte sur la commercialisation des abonnements a la plateforme aupres des
              salons de beaute, ainsi que sur les actions de communication et de notoriete associees.
            </p>
          </Section>

          <Section title="Article 2 - Duree">
            <p>
              Le contrat prend effet a la date de signature pour une duree initiale de{" "}
              <strong>douze (12) mois</strong>, renouvelable automatiquement pour la meme duree, sauf
              denonciation par l'une des Parties avec un preavis ecrit de trente (30) jours.
            </p>
            <p>
              Les revenus dus au titre des abonnements encaisses avant la fin du contrat restent dus
              apres la fin de celui-ci, conformement a l'article 7.
            </p>
          </Section>

          <Section title="Article 3 - Chiffre d'affaires de reference">
            <p>
              Le chiffre d'affaires de reference est constitue par l'ensemble des montants encaisses
              au titre des <strong>abonnements des salons</strong> a la plateforme {APP_NAME} pendant
              le mois considere : abonnements nouveaux et renouvellements effectivement valides.
            </p>
            <p>
              Sont exclus du chiffre d'affaires de reference : les encaissements propres aux salons
              (prestations, ventes de produits, cartes cadeaux), les remboursements, les abonnements
              annules ou impayes, ainsi que les taxes et frais bancaires.
            </p>
          </Section>

          <Section title="Article 4 - Charges de survie de l'application (20 %)">
            <p>
              Avant tout partage, <strong>vingt pour cent (20 %)</strong> du chiffre d'affaires de
              reference sont retenus par le Partenaire A pour assurer la survie et la qualite de la
              plateforme, notamment : hebergement et nom de domaine, maintenance technique et
              securite, support client, sauvegardes, outils de paiement, communication institutionnelle
              et frais administratifs.
            </p>
            <p>
              Ces charges sont <strong>forfaitaires et non justificatives au-dela du present contrat</strong> :
              elles sont appliquees de maniere identique chaque mois, sans negotiation, afin de
              garantir la perennite du service.
            </p>
          </Section>

          <Section title="Article 5 - Partage du solde (50 / 50)">
            <p>
              Le solde restant, soit <strong>quatre-vingts pour cent (80 %)</strong> du chiffre
              d'affaires de reference, est partage <strong>a parts egales (50 / 50)</strong> entre les
              Parties. Chaque Partie percoit donc <strong>quarante pour cent (40 %)</strong> du chiffre
              d'affaires de reference.
            </p>
            <div className="rounded border border-gray-300 bg-gray-50 p-3">
              <p className="mb-2 font-semibold text-gray-900">Exemple de calcul</p>
              <table className="w-full text-[12px]">
                <tbody>
                  <tr>
                    <td className="py-1">Chiffre d'affaires du mois (abonnements encaisses)</td>
                    <td className="py-1 text-right font-semibold">100 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="py-1">Charges de survie de l'application (20 %)</td>
                    <td className="py-1 text-right">- 20 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="border-t py-1">Solde a partager</td>
                    <td className="border-t py-1 text-right font-semibold">80 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="py-1">Part du Partenaire A (50 % du solde)</td>
                    <td className="py-1 text-right font-semibold">40 000 FCFA</td>
                  </tr>
                  <tr>
                    <td className="py-1">Part du Partenaire B (50 % du solde)</td>
                    <td className="py-1 text-right font-semibold">40 000 FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Article 6 - Transparence et reddition de comptes">
            <p>
              Le Partenaire A met a disposition du Partenaire B, dans le tableau de bord super
              administrateur de la plateforme, une section dediee <strong>« Partenariat &amp; revenus »</strong>{" "}
              qui affiche pour chaque mois : le chiffre d'affaires, la liste des salons abonnes
              enregistres, les charges de 20 %, le solde a partager et la part de chaque Partie.
            </p>
            <p>
              Le Partenaire B peut consulter ces informations a tout moment. Chaque montant affiche
              provient d'un abonnement valide enregistre dans la plateforme. Les Parties peuvent
              demander une verification contradictoire des donnees une fois par trimestre.
            </p>
          </Section>

          <Section title="Article 7 - Modalites de paiement">
            <p>
              Le calcul est arrete a la fin de chaque mois civil. La part du Partenaire B lui est
              versee <strong>au plus tard le 10 du mois suivant</strong>, par mobile money ou virement
              bancaire, sur les coordonnees qu'il aura communiquees.
            </p>
            <p>
              Un recapitulatif mensuel (chiffre d'affaires, charges, solde, part de chaque Partie)
              vaut justificatif de paiement. Tout retard de paiement de plus de quinze (15) jours
              ouvre droit, pour le Partenaire B, a une suspension de ses obligations de promotion
              jusqu'a regularisation.
            </p>
          </Section>

          <Section title="Article 8 - Obligations du Partenaire A">
            <ul className="list-disc space-y-1 pl-5">
              <li>Maintenir la plateforme operationnelle, securisee et conforme a la reglementation.</li>
              <li>Facturer et encaisser les abonnements des salons de maniere tracable.</li>
              <li>Tenir a jour le tableau de bord de partenariat et les justificatifs mensuels.</li>
              <li>Assurer le support de premier niveau des salons et la maintenance corrective.</li>
              <li>Informer le Partenaire B de toute evolution tarifaire ou fonctionnelle majeure.</li>
              <li>Ne pas modifier unilateralement les taux de 20 % et du partage 50/50 sans accord ecrit.</li>
            </ul>
          </Section>

          <Section title="Article 9 - Obligations du Partenaire B">
            <ul className="list-disc space-y-1 pl-5">
              <li>Promouvoir {APP_NAME} aupres des salons de beaute avec des informations exactes.</li>
              <li>Developper et entretenir un reseau de salons clients, dans le respect de l'image de la marque.</li>
              <li>Transmettre a la plateforme les salons inscrits afin qu'ils soient identifies et suivis.</li>
              <li>Ne pas percevoir de sommes au nom de la plateforme sans accord ecrit prealable.</li>
              <li>Respecter la confidentialite des donnees des salons et des clients.</li>
              <li>Signaler sans delai toute difficulte commerciale ou tout litige avec un salon.</li>
            </ul>
          </Section>

          <Section title="Article 10 - Marque et propriete intellectuelle">
            <p>
              La plateforme, sa marque, son code source, ses contenus et ses bases de donnees restent
              la propriete exclusive du Partenaire A. Le Partenaire B est autorise a utiliser les
              elements de communication fournis, pendant la duree du contrat, dans le seul cadre de la
              promotion de {APP_NAME}. Cette autorisation prend fin avec le contrat.
            </p>
          </Section>

          <Section title="Article 11 - Confidentialite et donnees personnelles">
            <p>
              Chaque Partie s'engage a proteger les informations confidentielles de l'autre Partie et
              a ne pas les divulguer a des tiers. Les donnees des salons et de leurs clients sont
              traitees conformement a la reglementation applicable et restent hebergees par le
              Partenaire A. Le Partenaire B n'y accede que dans la mesure necessaire au suivi de son
              portefeuille.
            </p>
          </Section>

          <Section title="Article 12 - Gestion des influenceurs">
            <p>
              Le Partenaire B peut recommander des influenceurs. Chaque influenceur dispose d'un
              espace personnel listant les salons qu'il a inscrits, les abonnements correspondants,
              sa commission (20 % par defaut, taux fixe par le Partenaire A) et la possibilite de
              demander un retrait de son solde.
            </p>
            <p>
              Les commissions des influenceurs sont deduites du chiffre d'affaires avant application
              des 20 % de charges et du partage 50/50, afin qu'aucune Partie ne supporte seule ce
              cout. Le taux de commission d'un influenceur est valide par le Partenaire A.
            </p>
            <p>
              Chaque retrait demande par un influenceur supporte des frais de 5 % du montant
              demande, retenus par la plateforme pour couvrir les frais de transaction : le montant
              effectivement verse a l'influenceur correspond a 95 % du montant demande. Ces frais de
              retrait ne font pas partie du chiffre d'affaires des abonnements partage entre les
              Parties.
            </p>
          </Section>

          <Section title="Article 13 - Resiliation">
            <p>
              En cas de manquement grave d'une Partie a ses obligations, non corrige dans les quinze
              (15) jours suivant une mise en demeure ecrite, l'autre Partie peut resilier le contrat
              de plein droit.
            </p>
            <p>
              En cas de resiliation, les sommes dues au titre du dernier mois sont reglees dans les
              conditions de l'article 7, et chaque Partie cesse immediatement d'utiliser la marque de
              l'autre.
            </p>
          </Section>

          <Section title="Article 14 - Droit applicable et litiges">
            <p>
              Le present contrat est regi par le droit en vigueur au Burkina Faso. Les Parties
              s'efforceront de resoudre a l'amiable tout differend. A defaut d'accord dans un delai de
              trente (30) jours, le litige sera porte devant la juridiction competente de
              Ouagadougou.
            </p>
          </Section>

          <Section title="Article 15 - Prise d'effet">
            <p>
              Le present contrat prend effet a la date de sa signature par les deux Parties. Il est
              etabli en deux (2) exemplaires originaux, chacun valant original.
            </p>
          </Section>

          <div className="mt-10 grid gap-8 break-inside-avoid md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-[13px] font-semibold uppercase text-gray-700">
                Partenaire A - {COMPANY}
              </p>
              <p className="text-[13px] text-gray-600">
                Nom : ______________________________
                <br />
                Qualite : ___________________________
                <br />
                Date : _____________________________
              </p>
              <div className="h-20 border-b border-gray-400" />
              <p className="text-[11px] text-gray-500">Signature et cachet</p>
            </div>
            <div className="space-y-4">
              <p className="text-[13px] font-semibold uppercase text-gray-700">
                Partenaire B - Associe
              </p>
              <p className="text-[13px] text-gray-600">
                Nom : ______________________________
                <br />
                Qualite : ___________________________
                <br />
                Date : _____________________________
              </p>
              <div className="h-20 border-b border-gray-400" />
              <p className="text-[11px] text-gray-500">Signature</p>
            </div>
          </div>

          <footer className="mt-8 border-t pt-3 text-center text-[10px] text-gray-500">
            {APP_NAME} - Contrat de partenariat - Charges application 20 % - Partage du solde 50/50.
          </footer>
        </div>
      </div>
    </div>
  );
}
