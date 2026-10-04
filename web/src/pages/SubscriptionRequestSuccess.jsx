// /src/pages/SubscriptionRequestSuccess.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Building2, Mail, Clock, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';

export default function SubscriptionRequestSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50/30 to-blue-50/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-2 border-green-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white">Demande envoyée avec succès !</h1>
            <p className="text-white/90 mt-1">Votre demande d'abonnement a été enregistrée</p>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm py-1.5 px-4">
                <Clock className="h-4 w-4 mr-1" />
                En attente de validation
              </Badge>
            </div>

            <div className="space-y-3 bg-muted/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Votre salon</p>
                  <p className="font-medium">En attente d'activation</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prochaine étape</p>
                  <p className="font-medium">Validation par l'administrateur</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Délai estimé</p>
                  <p className="font-medium">24 à 48 heures ouvrées</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                💡 Vous recevrez une notification par email dès que votre abonnement sera validé.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1 gap-2" variant="default">
                <Link to="/admin/dashboard">
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2">
                <Link to="/admin/subscription">
                  <ArrowLeft className="h-4 w-4" />
                  Voir les plans
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Une question ? Contactez le support :{' '}
              <a href="mailto:support@beautyflow.com" className="text-primary hover:underline">
                support@beautyflow.com
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}