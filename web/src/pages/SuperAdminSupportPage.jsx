// /src/pages/SuperAdminSupportPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { 
  Loader2, Mail, Phone, User, Building2, 
  CheckCircle, XCircle, Eye, RefreshCw,
  Search, Filter, MessageSquare, Clock,
  Reply, Send, Trash2, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

export default function SuperAdminSupportPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, unread: 0, replied: 0 });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Récupérer tous les messages avec les infos des tenants
      const { data, error } = await supabase
        .from('contact_messages')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
      
      // Calculer les statistiques
      const total = data?.length || 0;
      const unread = data?.filter(m => !m.is_read).length || 0;
      const replied = data?.filter(m => m.replied).length || 0;
      setStats({ total, unread, replied });
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
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_read: true } : m
      ));
      
      // Mettre à jour les stats
      setStats(prev => ({ ...prev, unread: prev.unread - 1 }));
      toast.success('Message marqué comme lu');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSendReply = async (messageId) => {
    if (!replyText.trim()) {
      toast.error('Veuillez écrire une réponse');
      return;
    }

    setReplying(true);
    try {
      // Sauvegarder la réponse (vous pouvez créer une table replies si nécessaire)
      const { error } = await supabase
        .from('contact_messages')
        .update({ 
          replied: true,
          reply: replyText,
          reply_date: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      // Marquer comme lu
      await handleMarkAsRead(messageId);

      toast.success('Réponse envoyée avec succès !');
      setReplyText('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === 'all' ? true :
      filter === 'unread' ? !msg.is_read :
      filter === 'replied' ? msg.replied :
      filter === 'unreplied' ? !msg.replied : true;

    const matchesSearch = searchTerm === '' || 
      msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const MessageCard = ({ message }) => {
    const isUnread = !message.is_read;

    return (
      <Card className={`hover:shadow-md transition-all ${isUnread ? 'border-l-4 border-l-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{message.name}</span>
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {message.tenants?.name || 'Salon inconnu'}
                </Badge>
                {!message.is_read && (
                  <Badge className="bg-primary text-white text-xs">Non lu</Badge>
                )}
                {message.replied && (
                  <Badge variant="success" className="text-xs bg-green-100 text-green-700">
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(message)}>
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
                        <p>{message.email}</p>
                      </div>
                      {message.phone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                          <p>{message.phone}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Salon</p>
                        <p>{message.tenants?.name || 'Salon inconnu'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Message</p>
                        <p className="whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Répondre</p>
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Écrire votre réponse..."
                        rows={4}
                      />
                      <div className="flex justify-end mt-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedMessage(null)}
                        >
                          Annuler
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSendReply(message.id)}
                          disabled={replying}
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
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(message.id)}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(message.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Messages de Contact
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous les messages reçus des clients
          </p>
        </div>
        <Button variant="outline" onClick={fetchMessages} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Non lus</p>
                <p className="text-2xl font-bold text-primary">{stats.unread}</p>
              </div>
              <Mail className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Répondu</p>
                <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
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
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="unread">Non lus</SelectItem>
            <SelectItem value="replied">Répondu</SelectItem>
            <SelectItem value="unreplied">Sans réponse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des messages */}
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