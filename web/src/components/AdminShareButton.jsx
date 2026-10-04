// /src/components/AdminShareButton.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Copy,
  CheckCircle,
  Globe,
  QrCode,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ✅ Import correct selon la version
// Version 4.x
import { QRCodeCanvas } from "qrcode.react";
// OU Version 3.x
// import QRCode from "qrcode.react";

export default function AdminShareButton({ tenantId, tenantName, tenantSlug }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/showcase/${tenantSlug || tenantId}`;
  const shareText = `Découvrez ${tenantName} sur BeautyFlow ! ✨`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      try {
        const link = document.createElement('a');
        link.download = `qr-code-${tenantName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success("QR Code téléchargé !");
      } catch (error) {
        toast.error("Erreur lors du téléchargement");
      }
    } else {
      toast.error("QR Code non trouvé");
    }
  };

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877f2] hover:bg-[#1877f2]/90",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-[#1da1f2] hover:bg-[#1da1f2]/90",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-[#0a66c2] hover:bg-[#0a66c2]/90",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "WhatsApp",
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "bg-[#25D366] hover:bg-[#25D366]/90",
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-[#ea4335] hover:bg-[#ea4335]/90",
      url: `mailto:?subject=${encodeURIComponent(`Découvrez ${tenantName}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Share2 className="h-4 w-4" />
          Partager mon salon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Partager {tenantName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Lien direct */}
          <div className="space-y-2">
            <Label>Lien de partage</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 bg-muted"
                onClick={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Partagez ce lien pour que vos clients puissent découvrir votre salon
            </p>
          </div>

          {/* QR Code - Version avec vérification */}
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              {showQR ? "Masquer le QR Code" : "Afficher le QR Code"}
            </Button>

            {showQR && (
              <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl shadow-lg border w-full">
                <div className="bg-white p-3 rounded-lg">
                  {typeof QRCodeCanvas !== 'undefined' ? (
                    <QRCodeCanvas 
                      id="qr-code-canvas"
                      value={shareUrl} 
                      size={180} 
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-500 text-center px-2">
                        QR Code non disponible
                        <br />
                        <span className="text-[10px]">Installez qrcode.react</span>
                      </p>
                    </div>
                  )}
                </div>
                {typeof QRCodeCanvas !== 'undefined' && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">
                      Scannez ce QR Code pour découvrir {tenantName}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadQRCode}
                      className="mt-2 gap-1 text-xs"
                    >
                      <Download className="h-3 w-3" />
                      Télécharger
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou partager sur
              </span>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="grid grid-cols-3 gap-2">
            {shareLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.name}
                  variant="outline"
                  className={`${link.color} text-white hover:text-white border-none h-auto py-3 flex flex-col gap-1 group`}
                  onClick={() => {
                    window.open(link.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs">{link.name}</span>
                </Button>
              );
            })}
          </div>

          {/* Aperçu */}
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              🔗 Vos clients verront une page dédiée à votre salon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tenantName} - Page vitrine personnalisée
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}