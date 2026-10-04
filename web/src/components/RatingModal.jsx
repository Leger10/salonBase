import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RatingModal({ appointment, open, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez donner une note');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          rating: rating,
          review: review,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Merci pour votre avis !');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error('Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmitting(false);
    }
  };

  // Messages personnalisés selon la note
  const getRatingMessage = (rating) => {
    const messages = {
      1: 'Nous sommes désolés que votre expérience n\'ait pas été à la hauteur.',
      2: 'Nous allons travailler pour nous améliorer.',
      3: 'Merci pour votre retour, nous allons continuer à progresser.',
      4: 'Ravis que vous ayez apprécié votre expérience !',
      5: 'Merci beaucoup ! Votre satisfaction est notre plus belle récompense.'
    };
    return messages[rating] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Noter votre expérience
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Comment avez-vous apprécié le service ?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-all ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400 scale-110'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {getRatingMessage(rating)}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              Votre avis <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <Textarea
              placeholder="Partagez votre expérience en détail..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              className="mt-2 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2">
              {submitting ? (
                'Envoi...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}