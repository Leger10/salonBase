// /src/pages/AdminSupportPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import {
  Loader2, Mail, Phone, CheckCircle, Eye, RefreshCw,
  Search, MessageSquare, Clock, Send, Trash2, Inbox, MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'unread', label: 'Non lus' },
  { value: 'replied', label: 'Répondu' },
  { value: 'unreplied', label: 'Sans réponse' },
];

export default function AdminSupportPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, unread: 0, replied: 0 });

  const tenantId = currentUser?.profile?.tenant_id;

  useEffect(() => {
    if (!tenantId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    fetchMessages();
  }, [tenantId]);

  const fetchMessages = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      setMessages(rows);
      setStats({
        total: rows.length,
        unread: rows.filter((m) => !m.is_read).length,
        replied: rows.filter((m) => m.replied).length,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)),
      );
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSendReply = async (message) => {
    if (!replyText.trim()) {
      toast.error('Veuillez écrire une réponse');
      return;
    }

    setReplying(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({
          replied: true,
          reply: replyText,
          reply_date: new Date().toISOString(),
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id);

      if (error) throw error;

      await handleMarkAsRead(message.id);

      // Ouvre la messagerie du client avec la réponse pré-remplie
      if (message.email) {
        const subject = encodeURIComponent(
          `Re: ${message.subject || 'Votre message'}`,
        );
        const body = encodeURIComponent(replyText);
        window.open(`mailto:${message.email}?subject=${subject}&body=${body}`);
      }

      toast.success('Réponse enregistrée et ouverte dans votre messagerie');
      setReplyText('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error("Erreur lors de l'envoi de la réponse");
    } finally {
      setReplying(false);
    }
  };

  const handleWhatsAppReply = (message) => {
    const phone = String(message.phone || '').replace(/\D/g, '');
    if (!phone) {
      toast.error('Numéro de téléphone manquant');
      return;
    }
    const text = encodeURIComponent(replyText || '');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      const removed = messages.find((m) => m.id === messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setStats((prev) => ({
        total: Math.max(0, prev.total - 1),
        unread: Math.max(0, prev.unread - (removed && !removed.is_read ? 1 : 0)),
        replied: Math.max(0, prev.replied - (removed && removed.replied ? 1 : 0)),
      }));
      if (selectedMessage?.id === messageId) setSelectedMessage(null);
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'unread'
          ? !msg.is_read
          : filter === 'replied'
            ? Boolean(msg.replied)
            : !msg.replied;

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === '' ||
      msg.name?.toLowerCase().includes(q) ||
      msg.email?.toLowerCase().includes(q) ||
      msg.subject?.toLowerCase().includes(q) ||
      msg.message?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const MessageCard = ({ message }) => {
    const isUnread = !message.is_read;

    return (
      <Card
        className={`hover:shadow-md transition-all ${isUnread ? 'border-l-4 border-l-primary' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{message.name}</span>
                {message.subject && (
                  <span className="text-sm text-muted-foreground truncate">
                    · {message.subject}
                  </span>
                )}
                {!message.is_read && (
                  <Badge className="bg-primary text-white text-xs">Non lu</Badge>
                )}
                {message.replied && (
                  <Badge className="text-xs bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Répondu
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {message.message}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {message.email}
                </span>
                {message.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {message.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(message.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMessage(message);
                      setReplyText('');
                      handleMarkAsRead(message.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Message de {message.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="break-all">{message.email}</p>
                      </div>
                      {message.phone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                          <p>{message.phone}</p>
                        </div>
                      )}
                      {message.subject && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Sujet</p>
                          <p>{message.subject}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Message</p>
                        <p className="whitespace-pre-wrap">{message.message}</p>
                      </div>
                      {message.reply && (
                        <div className="col-span-2 border-t pt-2">
                          <p className="text-sm font-medium text-muted-foreground">Réponse envoyée</p>
                          <p className="whitespace-pre-wrap text-green-700">{message.reply}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Répondre</p>
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Écrire votre réponse..."
                        rows={4}
                      />
                      <DialogFooter className="mt-3 flex justify-end gap-2">
                        {message.phone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!replyText.trim()}
                            onClick={() => handleWhatsAppReply(message)}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMessage(null)}
                        >
                          Fermer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSendReply(message)}
                          disabled={replying || !replyText.trim()}
                        >
                          {replying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Envoyer
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {!message.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Marquer comme lu"
                  onClick={() => handleMarkAsRead(message.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => handleDelete(message.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun salon associé à votre compte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Support & messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Répondez aux demandes reçues depuis votre site et votre formulaire de
            contact.
          </p>
        </div>
        <Button variant="outline" onClick={fetchMessages} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary/20" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Non lus</p>
              <p className="text-2xl font-bold text-primary">{stats.unread}</p>
            </div>
            <Inbox className="h-8 w-8 text-primary/20" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Répondu</p>
              <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-200" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun message trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </div>
    </div>
  );
}
