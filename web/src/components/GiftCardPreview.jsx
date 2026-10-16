import { format } from "date-fns";
import { Gift, Banknote } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const OCCASIONS_MAP = {
  birthday: ["🎂", "Anniversaire"],
  anniversaire: ["🎂", "Anniversaire"],
  anniversary: ["💑", "Anniversaire de mariage"],
  mariage_anniversaire: ["💑", "Anniversaire de mariage"],
  mariage: ["💍", "Mariage"],
  wedding: ["💍", "Mariage"],
  baby: ["👶", "Naissance"],
  naissance: ["👶", "Naissance"],
  birth: ["👶", "Naissance"],
  graduation: ["🎓", "Diplôme"],
  obtention_diplome: ["🎓", "Diplôme"],
  new_job: ["💼", "Nouvel emploi"],
  job: ["💼", "Nouvel emploi"],
  nouvel_emploi: ["💼", "Nouvel emploi"],
  goodbye: ["✈️", "Départ"],
  adieu: ["👋", "Au revoir"],
  au_revoir: ["👋", "Au revoir"],
  thank_you: ["🙏", "Remerciement"],
  thanks: ["🙏", "Remerciement"],
  thankyou: ["🙏", "Remerciement"],
  remerciement: ["🙏", "Remerciement"],
  christmas: ["🎄", "Noël"],
  noel: ["🎄", "Noël"],
  new_year: ["🎊", "Nouvel an"],
  valentine: ["❤️", "Saint-Valentin"],
  saint_valentin: ["❤️", "Saint-Valentin"],
  mothers_day: ["🌸", "Fête des mères"],
  mother: ["🌸", "Fête des mères"],
  fete_des_meres: ["🌸", "Fête des mères"],
  fathers_day: ["👔", "Fête des pères"],
  father: ["👔", "Fête des pères"],
  fete_des_peres: ["👔", "Fête des pères"],
  friends_day: ["🤝", "Journée des amis"],
  friendship: ["🤝", "Amitié"],
  amitie: ["🤝", "Amitié"],
  loyalty: ["⭐", "Fidélité"],
  house: ["🏠", "Nouvelle maison"],
  maison: ["🏠", "Nouvelle maison"],
  retirement: ["🌅", "Retraite"],
  retraite: ["🌅", "Retraite"],
  health: ["💪", "Rétablissement"],
  sante: ["💪", "Rétablissement"],
  other: ["🎁", "Autre"],
  autre: ["✨", "Autre"],
  others: ["✨", "Autre"],
};

const DELIVERY_LABELS = {
  whatsapp: "WhatsApp",
  physical: "En présentiel",
  presentielle: "En présentiel",
  email: "Par email",
};

export const formatAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "0";
};

// Fond doré en dégradé (écran) — html2canvas ne supporte pas
// background-clip:text, d'où une couleur pleine en mode PDF.
const GOLD_GRADIENT = {
  backgroundImage:
    "linear-gradient(135deg,#f9e08a,#e0a53c 45%,#fff6cf 60%,#c98a2b)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};
const GOLD_SOLID = { color: "#f5d98b" };

export default function GiftCardPreview({ giftCard, isPDF = false, onPay = null }) {
  if (!giftCard) return null;

  const {
    amount,
    recipient_name,
    recipient_phone,
    sender_name,
    sender_phone,
    message,
    occasion,
    delivery_method,
    tenant_name,
    tenant_logo,
    tenant_primary_color,
    created_at,
    code,
    status,
    payment_status,
  } = giftCard;

  const isPending =
    status === "pending" ||
    status === "en_attente" ||
    payment_status === "en_attente";

  const primaryColor = tenant_primary_color || "#ec4899";
  const bg = `radial-gradient(120% 120% at 0% 0%, ${primaryColor}66 0%, transparent 42%), radial-gradient(130% 130% at 100% 100%, ${primaryColor}55 0%, transparent 45%), linear-gradient(135deg, #1c1030 0%, #0b0616 100%)`;
  const goldStyle = isPDF ? GOLD_SOLID : GOLD_GRADIENT;
  const qrValue = code ? `CARTE-CADEAU:${code}` : "CARTE-CADEAU";
  const [occasionEmoji, occasionLabel] =
    OCCASIONS_MAP[occasion] || OCCASIONS_MAP.other;
  const deliveryLabel = DELIVERY_LABELS[delivery_method] || delivery_method || "—";
  const issuedAt = created_at ? format(new Date(created_at), "dd/MM/yyyy") : "";

  const Holo = (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: "-60%",
        left: "-10%",
        width: "60%",
        height: "220%",
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        transform: "rotate(18deg)",
        pointerEvents: "none",
      }}
    />
  );

  const Logo = tenant_logo ? (
    <img
      src={tenant_logo}
      alt={tenant_name}
      style={{
        width: isPDF ? "52px" : "40px",
        height: isPDF ? "52px" : "40px",
        borderRadius: isPDF ? "16px" : "12px",
        objectFit: "cover",
        border: "2px solid rgba(255,255,255,0.5)",
        flexShrink: 0,
      }}
    />
  ) : isPDF ? (
    <div
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "26px",
      }}
    >
      🎁
    </div>
  ) : (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 flex-shrink-0">
      <Gift className="h-5 w-5" />
    </div>
  );

  if (isPDF) {
    return (
      <div
        id="gift-card-pdf"
        style={{
          width: "800px",
          height: "400px",
          borderRadius: "28px",
          padding: "34px",
          display: "flex",
          flexDirection: "row",
          fontFamily: "Inter, Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          background: bg,
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        {Holo}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: "24px",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {Logo}
            <div>
              <p style={{ fontSize: "19px", fontWeight: 700, margin: 0 }}>
                {tenant_name || "SalonApp"}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  margin: 0,
                  ...goldStyle,
                }}
              >
                ✦ Carte cadeau
              </p>
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                opacity: 0.7,
                margin: 0,
              }}
            >
              Offert à
            </p>
            <p style={{ fontSize: "26px", fontWeight: 700, margin: "2px 0 0" }}>
              {recipient_name || "Non attribué"}
            </p>
            {recipient_phone && (
              <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>
                {recipient_phone}
              </p>
            )}
          </div>

          <div>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                opacity: 0.7,
                margin: 0,
              }}
            >
              Valeur
            </p>
            <p
              style={{
                fontSize: "40px",
                fontWeight: 800,
                margin: "2px 0 0",
                ...goldStyle,
              }}
            >
              {formatAmount(amount)} FCFA
            </p>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-end",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <span style={{ fontSize: "20px" }}>{occasionEmoji}</span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              {occasionLabel}
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                opacity: 0.7,
                margin: 0,
              }}
            >
              De la part de
            </p>
            <p style={{ fontSize: "20px", fontWeight: 700, margin: "2px 0 0" }}>
              {sender_name || "Anonyme"}
            </p>
            {sender_phone && (
              <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>
                {sender_phone}
              </p>
            )}
          </div>

          {message && (
            <div
              style={{
                fontSize: "14px",
                fontStyle: "italic",
                background: "rgba(255,255,255,0.1)",
                padding: "10px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.14)",
                maxWidth: "300px",
                textAlign: "right",
              }}
            >
              “{message}”
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "11px", opacity: 0.75, margin: 0 }}>
                {deliveryLabel} · {issuedAt}
              </p>
              {code && (
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    letterSpacing: "2px",
                    margin: "4px 0 0",
                  }}
                >
                  {code}
                </p>
              )}
            </div>
            <div
              style={{ background: "#ffffff", padding: "6px", borderRadius: "10px" }}
            >
              <QRCodeCanvas
                value={qrValue}
                size={64}
                bgColor="#ffffff"
                fgColor="#0b0616"
                level="M"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
      <div
        className="gift-card-container"
        style={{
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          background: bg,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "26px",
          padding: "20px",
          width: "100%",
          minHeight: "240px",
          boxShadow: `0 24px 70px ${primaryColor}33, 0 4px 20px rgba(0,0,0,0.2)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "14px",
        }}
      >
        {Holo}

        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {Logo}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {tenant_name || "SalonApp"}
              </p>
              <p
                className="text-[9px] uppercase tracking-[0.25em] font-semibold"
                style={goldStyle}
              >
                ✦ Carte cadeau
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 flex-shrink-0">
            <span className="text-base leading-none">{occasionEmoji}</span>
            <span className="text-[10px] font-medium truncate max-w-[110px]">
              {occasionLabel}
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">
              Offert à
            </p>
            <p className="text-lg font-bold truncate">
              {recipient_name || "Non attribué"}
            </p>
            {recipient_phone && (
              <p className="text-[11px] opacity-70 truncate">{recipient_phone}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">
              Valeur
            </p>
            <p
              className="text-3xl font-extrabold tracking-tight"
              style={goldStyle}
            >
              {formatAmount(amount)} FCFA
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-70">
              De la part de
            </p>
            <p className="text-sm font-bold truncate">
              {sender_name || "Anonyme"}
            </p>
            {message && (
              <p className="text-[11px] italic opacity-80 mt-1 line-clamp-2 max-w-[240px]">
                “{message}”
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] opacity-70">{deliveryLabel}</p>
              <p className="text-[10px] opacity-70">{issuedAt}</p>
              {code && (
                <p className="font-mono text-[10px] tracking-widest mt-0.5 bg-white/10 px-1.5 py-0.5 rounded">
                  {code}
                </p>
              )}
            </div>
            <div className="bg-white p-1.5 rounded-lg">
              <QRCodeCanvas
                value={qrValue}
                size={56}
                bgColor="#ffffff"
                fgColor="#0b0616"
                level="M"
              />
            </div>
          </div>
        </div>

        {status && (
          <div className="relative z-10">
            <Badge
              variant="outline"
              className="text-[10px] border-white/25 text-white/90 bg-white/5"
            >
              {status === "pending" && "⏳ En attente"}
              {status === "pending_cash" && "🏪 À régler en caisse"}
              {status === "paid" && "✅ Payée"}
              {status === "validated" && "🎉 Validée"}
              {status === "used" && "🎁 Utilisée"}
              {status === "cancelled" && "❌ Annulée"}
              {!["pending", "pending_cash", "paid", "validated", "used", "cancelled"].includes(status) && status}
            </Badge>
          </div>
        )}

        {isPending && onPay && (
          <div className="relative z-10">
            <Button
              onClick={() => onPay(giftCard)}
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              size="sm"
            >
              <Banknote className="h-4 w-4" />
              Payer à la caisse
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
