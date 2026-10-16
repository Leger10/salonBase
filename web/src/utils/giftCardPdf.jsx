import { createElement } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";

const PAGE_W = 210;
const PAGE_H = 148;
const CARD_W = 800;
const CARD_H = 400;

// Carte 2:1 recentrée sur une page A5 paysage, avec ombre, en-tête et pied.
const CARD_X = 10;
const CARD_Y = 26.5;
const CARD_IMG_W = 190;
const CARD_IMG_H = 95;

async function renderCardCanvas({ card, CardComponent }) {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${CARD_W}px;height:${CARD_H}px;background:#ffffff;z-index:-9999;overflow:hidden;`;
  const root = document.createElement("div");
  root.style.cssText = "width:100%;height:100%;";
  container.appendChild(root);
  document.body.appendChild(container);

  const { createRoot } = await import("react-dom/client");
  const reactRoot = createRoot(root);
  reactRoot.render(createElement(CardComponent, { giftCard: card, isPDF: true }));

  let canvas;
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));
    canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: CARD_W,
      height: CARD_H,
      windowWidth: CARD_W,
      windowHeight: CARD_H,
      onclone: (clonedDoc) => {
        const images = Array.from(clonedDoc.querySelectorAll("img"));
        return Promise.all(
          images.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      },
    });
  } finally {
    reactRoot.unmount();
    if (container.parentNode) container.parentNode.removeChild(container);
  }

  return canvas;
}

function composePdf(card, imgData) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
  });

  const tenantName = card.tenant_name || "SalonApp";
  const issuedAt = card.created_at
    ? format(new Date(card.created_at), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");

  doc.setProperties({
    title: card.code ? `Carte cadeau ${card.code}` : "Carte cadeau",
    subject: `Carte cadeau ${card.code || ""} — ${tenantName}`,
    author: tenantName,
  });

  // En-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setCharSpace(1.4);
  doc.setTextColor(176, 128, 40);
  doc.text("CARTE CADEAU", PAGE_W / 2, 12.5, { align: "center" });
  doc.setCharSpace(0);

  doc.setFontSize(14);
  doc.setTextColor(28, 16, 48);
  doc.text(tenantName, PAGE_W / 2, 20.5, { align: "center" });

  doc.setDrawColor(224, 165, 60);
  doc.setLineWidth(0.7);
  doc.line(95, 24, 115, 24);

  // Ombre puis carte
  doc.setFillColor(236, 236, 243);
  doc.roundedRect(CARD_X + 0.8, CARD_Y + 1, CARD_IMG_W, CARD_IMG_H, 7, 7, "F");
  doc.addImage(imgData, "JPEG", CARD_X, CARD_Y, CARD_IMG_W, CARD_IMG_H, undefined, "FAST");

  // Pied
  doc.setDrawColor(226, 226, 234);
  doc.setLineWidth(0.4);
  doc.line(35, 126.5, 175, 126.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 16, 48);
  const footer = card.code
    ? `Code : ${card.code}  ·  Émise le ${issuedAt}`
    : `Émise le ${issuedAt}`;
  doc.text(footer, PAGE_W / 2, 132.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(122, 126, 140);
  doc.text(
    "Présentez ce document ou scannez le QR code pour utiliser votre carte cadeau.",
    PAGE_W / 2,
    139,
    { align: "center" }
  );

  return doc;
}

export async function downloadGiftCardPdf({ card, CardComponent }) {
  if (!card) throw new Error("Aucune carte à télécharger");
  if (typeof CardComponent !== "function" && typeof CardComponent !== "object") {
    throw new Error("Composant de carte manquant");
  }

  const canvas = await renderCardCanvas({ card, CardComponent });
  const doc = composePdf(card, canvas.toDataURL("image/jpeg", 0.92));
  doc.save(`carte-cadeau-${card.code || "gift-card"}.pdf`);
}
