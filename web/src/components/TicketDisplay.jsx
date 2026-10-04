// /src/components/client/TicketDisplay.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Clock, User, Users, Bell, CheckCircle, Zap, Award, Phone, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TicketDisplay({ tickets, currentTicket, onServe, onCall }) {
  const waitingTickets = tickets?.filter(t => t.status === 'waiting') || [];
  const servingTickets = tickets?.filter(t => t.status === 'called' || t.status === 'in_progress') || [];
  const servedTickets = tickets?.filter(t => t.status === 'served') || [];

  return (
    <div className="space-y-6">
      {/* ✅ Current serving - Version élégante avec animation */}
      <AnimatePresence mode="wait">
        {currentTicket ? (
          <motion.div
            key="current-ticket"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
              {/* Effet de fond animé */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 animate-pulse" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-foreground/5 via-primary-foreground/10 to-primary-foreground/5 blur-3xl" />
              
              <CardContent className="p-8 text-center relative">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Bell className="h-6 w-6 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-wider opacity-90">
                    Numéro en cours d'appel
                  </p>
                </div>
                
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className="text-8xl font-bold tracking-tight drop-shadow-lg">
                    #{currentTicket.ticket_number}
                  </p>
                </motion.div>
                
                {currentTicket && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-2 rounded-full bg-white/20">
                        <User className="h-5 w-5" />
                      </div>
                      <span className="text-xl font-medium">
                        {currentTicket.client_name || currentTicket.client?.profile?.full_name || 'Client'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm opacity-90">
                      {currentTicket.service_type && (
                        <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                          {currentTicket.service_type}
                        </Badge>
                      )}
                      {currentTicket.client_sector && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {currentTicket.client_sector}
                        </span>
                      )}
                      {currentTicket.client_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {currentTicket.client_phone}
                        </span>
                      )}
                      {currentTicket.created_at && (
                        <span className="flex items-center gap-1 opacity-80">
                          <Clock className="h-4 w-4" />
                          {format(new Date(currentTicket.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => onServe?.(currentTicket.id)}
                    className="rounded-2xl bg-white/20 backdrop-blur-sm px-8 py-3 text-sm font-medium hover:bg-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Servir le client
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="no-ticket"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50">
              <CardContent className="p-12 text-center">
                <div className="p-4 rounded-full bg-muted/30 mx-auto w-fit mb-4">
                  <Users className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <p className="text-xl font-medium text-muted-foreground">
                  Aucun client en cours
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  La file d'attente est vide ou en attente
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Waiting queue - Version améliorée */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              File d'attente
            </h3>
          </div>
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 px-4 py-1.5 font-medium">
            {waitingTickets.length} en attente
          </Badge>
        </div>
        
        <CardContent className="p-4 max-h-[400px] overflow-y-auto">
          {waitingTickets.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-3 rounded-full bg-muted/20 mx-auto w-fit mb-3">
                <Ticket className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">
                Aucun client en attente 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {waitingTickets.map((ticket, index) => (
                <motion.div 
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center justify-between rounded-2xl border border-transparent hover:border-amber-200/50 dark:hover:border-amber-800/30 p-4 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 group-hover:from-amber-500/20 group-hover:to-amber-600/10 transition-all">
                      <Ticket className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">#{ticket.ticket_number}</p>
                        <Badge variant="outline" className="text-xs border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                          Position {index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ticket.client_name || ticket.client?.profile?.full_name || 'Client'}
                      </p>
                      {ticket.service_type && (
                        <span className="text-xs text-muted-foreground/60">
                          {ticket.service_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onCall?.(ticket.id)}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Appeler
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Currently serving - Version améliorée */}
      {servingTickets.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10">
                <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-300">
                En cours de service
              </h3>
            </div>
            <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-0 px-4 py-1.5 font-medium">
              {servingTickets.length}
            </Badge>
          </div>
          
          <CardContent className="p-4">
            <div className="space-y-2">
              {servingTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 border border-indigo-200/50 dark:border-indigo-800/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
                    <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">Ticket #{ticket.ticket_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.client_name || ticket.client?.profile?.full_name || 'Client'}
                    </p>
                  </div>
                  <Badge className={`${
                    ticket.status === 'called' 
                      ? 'bg-emerald-500 text-white animate-pulse' 
                      : 'bg-indigo-500 text-white'
                  } border-0 px-4 py-1.5 font-medium`}>
                    {ticket.status === 'called' ? '📢 Appelé' : '💆 En cours'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}