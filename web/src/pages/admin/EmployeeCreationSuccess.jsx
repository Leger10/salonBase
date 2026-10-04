// /src/components/admin/EmployeeCreationSuccess.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { CheckCircle, Users, ArrowLeft, User, Phone, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeCreationSuccess({ 
  email, 
  name, 
  firstName,
  lastName,
  phone,
  adminName,
  adminEmail,
  adminId,
  adminReference,
  employeeId,
  tenantId,
  onClose 
}) {
  const navigate = useNavigate();
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || name || 'Employé';

  // Enregistrer dans les logs au montage du composant
  useEffect(() => {
    const logEmployeeCreation = async () => {
      try {
        console.log('📝 Enregistrement de la création d\'employé dans les logs...');
        
        // Récupérer l'utilisateur actuel
        const { data: { user } } = await supabase.auth.getUser();
        
        // Enregistrer dans activity_logs
        const { error } = await supabase
          .from('activity_logs')
          .insert({
            user_id: adminId || user?.id,
            user_email: adminEmail || user?.email,
            action: `Création d'employé: ${fullName}`,
            action_type: 'create',
            details: JSON.stringify({
              employee_id: employeeId,
              employee_name: fullName,
              employee_email: email,
              employee_phone: phone,
              admin_id: adminId || user?.id,
              admin_email: adminEmail || user?.email,
              admin_reference: adminReference,
              tenant_id: tenantId,
              created_at: new Date().toISOString()
            }),
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('❌ Erreur lors de l\'enregistrement du log:', error);
        } else {
          console.log('✅ Log de création d\'employé enregistré avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du log:', error);
      }
    };

    logEmployeeCreation();
  }, []);

  // Fonction pour récupérer l'IP du client (optionnel)
  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'IP:', error);
      return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card 
        className="max-w-md w-full mx-4 shadow-2xl border-0"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-8 text-center">
          {/* Icône de succès */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">✅ Employé ajouté avec succès !</h2>
          
          {/* Informations de l'employé */}
          <div className="bg-muted/30 rounded-lg p-4 mb-4 text-left space-y-2">
            <p className="text-sm text-muted-foreground mb-1 font-medium">👤 Informations de l'employé</p>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">{fullName}</span>
            </div>
            
            {email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📧</span>
                <span>{email}</span>
              </div>
            )}
            
            {phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{phone}</span>
              </div>
            )}
          </div>

          {/* Informations de l'admin */}
          <div className="bg-primary/5 rounded-lg p-4 mb-6 text-left space-y-2 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-1 font-medium">👔 Créé par</p>
            
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">{adminName || 'Administrateur'}</span>
            </div>
            
            {adminEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📧</span>
                <span>{adminEmail}</span>
              </div>
            )}
            
            {adminReference && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🆔</span>
                <span className="font-mono text-xs">Réf: {adminReference}</span>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <Button 
              className="w-full gap-2"
              onClick={() => {
                onClose?.();
                navigate('/admin/team');
              }}
            >
              <Users className="h-4 w-4" />
              Voir mon équipe
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
              Continuer
            </Button>
          </div>

          {/* Message de log */}
          <p className="text-xs text-muted-foreground mt-4">
            💡 Action enregistrée dans les logs système
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}