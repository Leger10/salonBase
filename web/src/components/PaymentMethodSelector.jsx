import React from 'react';
import { CreditCard, Smartphone, Wallet, Building2, Gift } from 'lucide-react';

export default function PaymentMethodSelector({ onSelect, selectedMethod, disabled = false }) {
  const methods = [
    { id: 'cash', label: 'Espèces', icon: Wallet, description: 'Paiement en espèces' },
    { id: 'card', label: 'Carte bancaire', icon: CreditCard, description: 'CB, Visa, Mastercard' },
    { id: 'orange_money', label: 'Orange Money', icon: Smartphone, description: 'Paiement mobile Orange' },
    { id: 'moov_money', label: 'Moov Money', icon: Smartphone, description: 'Paiement mobile Moov' },
    { id: 'wave', label: 'Wave', icon: Smartphone, description: 'Paiement mobile Wave' },
    { id: 'gift_card', label: 'Carte cadeau', icon: Gift, description: 'Utiliser une carte cadeau' }
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Mode de paiement</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => !disabled && onSelect(method.id)}
              disabled={disabled}
              className={`
                flex items-start gap-3 rounded-lg border p-4 text-left transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'}
                ${isSelected 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30' 
                  : 'border-border bg-card'
                }
              `}
            >
              <div className={`rounded-lg p-2 shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{method.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
              </div>
              {isSelected && (
                <div className="shrink-0 mt-1">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}