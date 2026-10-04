// /src/components/ReceiptPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ✅ Enregistrer la police Helvetica
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' }
  ]
});

// ✅ Format A6 (105mm x 148mm)
const A6_WIDTH = 105 * 2.83465;
const A6_HEIGHT = 148 * 2.83465;

const styles = StyleSheet.create({
  page: {
    padding: 14,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    width: A6_WIDTH,
    height: A6_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottom: 1.5,
    borderBottomColor: '#ec4899',
    paddingBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    textAlign: 'right',
    flex: 1,
  },
  logo: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ec4899',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 6,
    color: '#666',
    marginBottom: 1,
  },
  receiptTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
    color: '#333',
    letterSpacing: 1,
  },
  receiptNumber: {
    fontSize: 6.5,
    textAlign: 'center',
    color: '#888',
    marginBottom: 3,
    fontFamily: 'Helvetica',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 7,
    color: '#666',
    width: '30%',
  },
  infoValue: {
    fontSize: 7,
    color: '#333',
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'right',
  },
  table: {
    marginVertical: 4,
    borderWidth: 0.5,
    borderColor: '#ddd',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  tableCell: {
    fontSize: 6.5,
    color: '#333',
  },
  tableCellSmall: {
    fontSize: 5.5,
    color: '#666',
  },
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '25%', textAlign: 'right' },
  totals: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#ec4899',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  totalLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  totalValueLarge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  footer: {
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 5.5,
    color: '#888',
    marginBottom: 1,
  },
  changeBox: {
    marginVertical: 2,
    padding: 3,
    backgroundColor: '#f0fdf4',
    borderWidth: 0.5,
    borderColor: '#22c55e',
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#166534',
  },
  changeValue: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#166534',
  },
  separator: {
    height: 1,
    backgroundColor: '#ec4899',
    marginVertical: 2,
  },
  highlightBox: {
    backgroundColor: '#fdf2f8',
    padding: 3,
    borderRadius: 2,
    marginVertical: 3,
    borderWidth: 0.5,
    borderColor: '#ec4899',
  },
  calculationRow: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    backgroundColor: '#fafafa',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
  },
  calculationLabel: {
    fontSize: 5.5,
    color: '#666',
    fontStyle: 'italic',
    width: '40%',
  },
  calculationValue: {
    fontSize: 5.5,
    color: '#666',
    fontStyle: 'italic',
    width: '60%',
    textAlign: 'right',
  },
});

// ✅ Fonction ULTRA-ROBUSTE pour extraire le nombre
const extractNumberFromString = (value) => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  
  if (typeof value === 'string') {
    let str = value;
    str = str.replace(/FCFA/g, '');
    str = str.replace(/=/g, '');
    str = str.replace(/\//g, '');
    str = str.replace(/\s/g, '');
    str = str.replace(/,/g, '');
    str = str.replace(/\./g, '');
    str = str.replace(/[^0-9]/g, '');
    const num = parseFloat(str);
    if (!isNaN(num)) return num;
  }
  
  if (value && typeof value === 'object') {
    if (value.price !== undefined) return extractNumberFromString(value.price);
    if (value.unit_price !== undefined) return extractNumberFromString(value.unit_price);
    if (value.total_price !== undefined) return extractNumberFromString(value.total_price);
    if (value.amount !== undefined) return extractNumberFromString(value.amount);
    if (value.selling_price !== undefined) return extractNumberFromString(value.selling_price);
  }
  
  return 0;
};

// ✅ Fonction pour formater le montant AVEC ESPACE (15 000 FCFA)
const formatAmount = (amount) => {
  const num = extractNumberFromString(amount);
  if (isNaN(num) || num === 0) return '0 FCFA';
  return num.toLocaleString('fr-FR') + ' FCFA';
};

// ✅ Fonction pour formater le montant sans "FCFA" AVEC ESPACE (15 000)
const formatAmountOnly = (amount) => {
  const num = extractNumberFromString(amount);
  if (isNaN(num) || num === 0) return '0';
  return num.toLocaleString('fr-FR');
};

// ✅ Fonction pour formater le numéro de reçu - 4 caractères
const formatReceiptNumber = (receiptNumber) => {
  if (!receiptNumber) return 'RCP-0001';
  
  const str = String(receiptNumber);
  if (str.startsWith('RCP-')) {
    const parts = str.split('-');
    if (parts.length === 2) {
      const numStr = parts[1].replace(/\D/g, '');
      const num = parseInt(numStr);
      if (!isNaN(num) && num > 0) {
        return `RCP-${String(num).padStart(4, '0')}`;
      }
    }
    return str;
  }
  
  const numbers = str.replace(/\D/g, '');
  if (!numbers) return 'RCP-0001';
  
  const lastFour = numbers.slice(-4);
  return `RCP-${lastFour.padStart(4, '0')}`;
};

// ✅ Fonction pour formater le téléphone
const formatPhone = (phone) => {
  if (!phone) return 'Non renseigné';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{1})/, '$1 $2 $3 $4 $5');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

// ✅ Fonction pour nettoyer le texte
const cleanText = (text) => {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  cleaned = cleaned.replace(/[=ÍÞËÅñ]/g, '');
  return cleaned.trim();
};

const getClientName = (transaction, client) => {
  if (transaction?.customer_name) {
    return cleanText(transaction.customer_name);
  }
  if (client) {
    const name = client.profile?.full_name || client.full_name || client.name;
    return cleanText(name) || 'Client inconnu';
  }
  return 'Client inconnu';
};

const getClientPhone = (transaction, client) => {
  if (transaction?.customer_phone) {
    return transaction.customer_phone;
  }
  if (client) {
    return client.profile?.phone || client.phone || null;
  }
  return null;
};

const getServiceName = (transaction, service) => {
  if (transaction?.cart_items && transaction.cart_items.length > 0) {
    const names = transaction.cart_items.map(item => item.name).join(', ');
    return cleanText(names) || 'Produits';
  }
  if (service) {
    return cleanText(service.name) || 'Service';
  }
  return 'Service';
};

const getTransactionType = (transaction) => {
  if (transaction?.source === 'gallery_order') {
    return '🛒 Commande';
  }
  if (transaction?.transaction_type === 'product_sale') {
    return '🛍️ Vente produit';
  }
  if (transaction?.transaction_type === 'appointment') {
    return '📅 Rendez-vous';
  }
  return 'Transaction';
};

const getTenantName = (tenant) => {
  if (!tenant) return 'Salon';
  return cleanText(tenant.name) || 'Salon';
};

const getTenantAddress = (tenant) => {
  if (!tenant) return '';
  return cleanText(tenant.address) || '';
};

const getMethodLabel = (method) => {
  const labels = {
    cash: 'Espèces',
    card: 'Carte Bancaire',
    orange_money: 'Orange Money',
    moov_money: 'Moov Money',
    wave: 'Wave',
    pending: 'En attente',
  };
  return labels[method] || method || 'N/A';
};

const getCartItems = (transaction) => {
  if (transaction?.cart_items && transaction.cart_items.length > 0) {
    return transaction.cart_items.map(item => ({
      name: cleanText(item.name) || 'Produit',
      quantity: parseInt(item.quantity) || 1,
      price: extractNumberFromString(item.price || item.unit_price || item.selling_price || 0),
      total: extractNumberFromString(item.total || item.total_price || 0)
    }));
  }
  
  if (transaction?.transaction_lines && transaction.transaction_lines.length > 0) {
    return transaction.transaction_lines.map(line => {
      const product = line.products || line.product || {};
      let price = extractNumberFromString(line.unit_price);
      if (price === 0) {
        price = extractNumberFromString(product.selling_price || product.price || 0);
      }
      const qty = parseInt(line.quantity) || 1;
      return {
        name: cleanText(product.name || line.product_name) || 'Produit',
        quantity: qty,
        price: price,
        total: extractNumberFromString(line.total_price) || (price * qty)
      };
    });
  }
  
  return [];
};

export const ReceiptPDF = ({ transaction, tenant, client, service, change }) => {
  const clientName = getClientName(transaction, client);
  const clientPhone = getClientPhone(transaction, client);
  const serviceName = getServiceName(transaction, service);
  const transactionType = getTransactionType(transaction);
  const tenantName = getTenantName(tenant);
  const tenantAddress = getTenantAddress(tenant);
  const methodLabel = getMethodLabel(transaction?.payment_method);
  const receiptNumber = formatReceiptNumber(transaction?.receipt_number);
  const date = transaction?.transaction_date 
    ? format(new Date(transaction.transaction_date), "dd/MM/yyyy HH:mm", { locale: fr })
    : format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });
  
  const amount = extractNumberFromString(transaction?.amount || 0);
  const changeAmount = extractNumberFromString(change || 0);
  const receivedAmount = amount + changeAmount;

  const formattedAmount = formatAmount(amount);
  const formattedReceived = formatAmount(receivedAmount);
  const formattedChange = formatAmount(changeAmount);

  const isGalleryOrder = transaction?.source === 'gallery_order';
  const isPending = transaction?.status === 'pending';
  
  const cartItems = getCartItems(transaction);
  const hasItems = cartItems.length > 0;

  const getCalculationDetails = () => {
    if (!hasItems) return '';
    return cartItems.map((item) => {
      const unitPrice = item.price || 0;
      const qty = item.quantity || 1;
      const total = unitPrice * qty;
      return `${formatAmountOnly(unitPrice)} x ${qty} = ${formatAmountOnly(total)} FCFA`;
    }).join(' ; ');
  };

  return (
    <Document>
      <Page size={[A6_WIDTH, A6_HEIGHT]} style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {tenant?.logo_url && <Image src={tenant.logo_url} style={styles.logo} />}
            <Text style={styles.title}>{tenantName}</Text>
            {tenantAddress && <Text style={styles.subtitle}>{tenantAddress}</Text>}
            {tenant?.phone && <Text style={styles.subtitle}>Tel: {tenant.phone}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.subtitle, { fontSize: 6.5, fontWeight: 'bold' }]}>Reçu de paiement</Text>
            <Text style={[styles.receiptNumber, { fontSize: 6.5, fontWeight: 'bold', color: '#ec4899' }]}>
              N° {receiptNumber}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 6 }]}>{date}</Text>
          </View>
        </View>

        <Text style={styles.receiptTitle}>
          {isGalleryOrder ? 'REÇU DE COMMANDE' : 'REÇU DE PAIEMENT'}
        </Text>

        <View style={{ marginBottom: 3 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{transactionType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>{clientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{formatPhone(clientPhone)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Méthode</Text>
            <Text style={styles.infoValue}>{methodLabel}</Text>
          </View>
          {isPending && (
            <View style={[styles.infoRow, { borderBottomColor: '#f59e0b' }]}>
              <Text style={[styles.infoLabel, { color: '#f59e0b' }]}>Statut</Text>
              <Text style={[styles.infoValue, { color: '#f59e0b' }]}>⏳ En attente de paiement</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Prix unit.</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Total</Text>
          </View>
          
          {hasItems ? (
            cartItems.map((item, idx) => {
              const unitPrice = item.price || 0;
              const qty = item.quantity || 1;
              const total = unitPrice * qty;
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.col1]}>{item.name}</Text>
                  <Text style={[styles.tableCell, styles.col2]}>{qty}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{formatAmount(unitPrice)}</Text>
                  <Text style={[styles.tableCell, styles.col4]}>{formatAmount(total)}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>{serviceName}</Text>
              <Text style={[styles.tableCell, styles.col2]}>1</Text>
              <Text style={[styles.tableCell, styles.col3]}>{formattedAmount}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{formattedAmount}</Text>
            </View>
          )}
          
          {hasItems && cartItems.length > 0 && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Détail du calcul</Text>
              <Text style={styles.calculationValue}>{getCalculationDetails()}</Text>
            </View>
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{formattedAmount}</Text>
          </View>
          {receivedAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Montant reçu</Text>
              <Text style={styles.totalValue}>{formattedReceived}</Text>
            </View>
          )}
          {changeAmount > 0 && (
            <View style={styles.changeBox}>
              <Text style={styles.changeLabel}>Monnaie à rendre</Text>
              <Text style={styles.changeValue}>{formattedChange}</Text>
            </View>
          )}
          <View style={styles.separator} />
          <View style={[styles.totalRow, { paddingVertical: 2 }]}>
            <Text style={[styles.totalLabel, { fontSize: 8 }]}>Total réglé</Text>
            <Text style={[styles.totalValueLarge, { fontSize: 10 }]}>
              {formattedAmount}
            </Text>
          </View>
        </View>

        <View style={styles.highlightBox}>
          <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#ec4899', textAlign: 'center' }}>
            {isPending ? '📋 Commande enregistrée' : 'Merci pour votre confiance !'}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: 5.5, color: '#666' }]}>
            {isPending 
              ? 'Ce reçu fait office de bon de commande. Paiement à la caisse.'
              : 'Ce reçu fait office de justificatif de paiement.'}
          </Text>
          <Text style={[styles.footerText, { marginTop: 1, color: '#aaa', fontSize: 5 }]}>
            {date}
          </Text>
        </View>
      </Page>
    </Document>
  );
};