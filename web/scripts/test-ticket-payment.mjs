import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const PORT = 4133;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'http://localhost:3000';
const SUPER_ADMIN_EMAIL = process.env.TEST_SUPER_ADMIN_EMAIL ?? 'digihouse10@gmail.com';
const PASSWORD = process.env.TEST_AUTH_PASSWORD ?? '00000000';
const prisma = new PrismaClient();
const checks = [];

function check(label, condition, detail = '') {
  checks.push(condition);
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` :: ${detail}` : ''}`);
}

function createClient() {
  const cookies = new Map();
  return async (pathname, { method = 'GET', body } = {}) => {
    const headers = { Origin: ORIGIN };
    if (cookies.size) {
      headers.Cookie = [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${BASE}${pathname}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(';')[0];
      const separator = pair.indexOf('=');
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return { status: response.status, data: await response.json().catch(() => null) };
  };
}

function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, API_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (data) => { logs += data; });
  child.stderr.on('data', (data) => { logs += data; });
  return { child, getLogs: () => logs };
}

async function waitReady(child, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) return false;
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function summaryUrl() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const params = new URLSearchParams({
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowStart.toISOString(),
    monthStart: monthStart.toISOString(),
  });
  return `/api/admin/cashier/summary?${params}`;
}

async function main() {
  const server = startServer();
  const cleanupIds = { adminId: null, ticketId: null, transactionIds: [] };
  let failed = false;

  try {
    if (!(await waitReady(server.child))) {
      throw new Error(`API did not start:\n${server.getLogs()}`);
    }

    const root = createClient();
    const login = await root('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: SUPER_ADMIN_EMAIL, password: PASSWORD },
    });
    if (login.status !== 200) throw new Error(`Super-admin login failed (${login.status}).`);

    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true, employees: { some: { isActive: true } } },
      select: { id: true },
    });
    if (!tenant) throw new Error('No active test tenant with an employee.');
    const employee = await prisma.employee.findFirst({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true },
    });
    if (!employee) throw new Error('No active test employee.');

    const adminEmail = `ticket.payment.admin.${Date.now()}@salonstore.local`;
    const adminCreated = await root('/api/admin/users', {
      method: 'POST',
      body: {
        email: adminEmail,
        password: 'TicketPaymentTest123!',
        full_name: 'Ticket Payment Test Admin',
        role: 'admin',
        tenant_id: tenant.id,
      },
    });
    if (adminCreated.status !== 201) {
      throw new Error(`Test admin creation failed: ${JSON.stringify(adminCreated.data)}`);
    }
    cleanupIds.adminId = adminCreated.data.user.id;

    const admin = createClient();
    const adminLogin = await admin('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: adminEmail, password: 'TicketPaymentTest123!' },
    });
    if (adminLogin.status !== 200) throw new Error(`Tenant-admin login failed (${adminLogin.status}).`);

    const baselineResponse = await admin(summaryUrl());
    if (baselineResponse.status !== 200) {
      throw new Error(`Baseline revenue summary failed (${baselineResponse.status}).`);
    }
    const baseline = baselineResponse.data;

    const lastTicket = await prisma.ticket.aggregate({
      where: { tenantId: tenant.id },
      _max: { ticketNumber: true },
    });
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        ticketNumber: (lastTicket._max.ticketNumber ?? 0) + 1,
        assignedEmployeeId: employee.id,
        clientName: 'Ticket Payment Test Client',
        serviceType: 'Test service',
        status: 'completed',
        completedAt: new Date(),
        paymentStatus: 'pending',
        servicePrice: 15000,
      },
    });
    cleanupIds.ticketId = ticket.id;

    const bulkIds = Array.from({ length: 205 }, () => randomUUID());
    await prisma.transaction.createMany({
      data: bulkIds.map((id, index) => ({
        id,
        tenantId: tenant.id,
        employeeId: employee.id,
        amount: 1,
        totalAfterDiscount: 1,
        paymentMethod: 'cash',
        receiptNumber: `TEST-TICKET-${Date.now()}-${index}`,
        status: 'completed',
        transactionType: 'ticket_payment',
        source: 'ticket_completed',
        transactionDate: new Date(),
      })),
    });
    cleanupIds.transactionIds.push(...bulkIds);

    const bulkSummaryResponse = await admin(summaryUrl());
    const bulkSummary = bulkSummaryResponse.data;
    check(
      'Revenue summary includes all transactions beyond the previous 200-row limit',
      bulkSummaryResponse.status === 200 &&
        Number(bulkSummary.totalRevenue) - Number(baseline.totalRevenue) === bulkIds.length &&
        Number(bulkSummary.ticketRevenue) - Number(baseline.ticketRevenue) === bulkIds.length,
      `added=${bulkSummary.totalRevenue - baseline.totalRevenue}`
    );

    const paymentRequest = {
      method: 'POST',
      body: {
        amount: 15000,
        receivedAmount: 20000,
        paymentMethod: 'cash',
        receiptNumber: `TEST-TICKET-PAY-${Date.now()}`,
      },
    };
    const paymentPath = `/api/admin/tickets/${ticket.id}/payment`;
    const [first, retry] = await Promise.all([
      admin(paymentPath, paymentRequest),
      admin(paymentPath, paymentRequest),
    ]);

    check('Concurrent retries both return the same successful payment', first.status === 200 &&
      retry.status === 200 && first.data.transaction.id === retry.data.transaction.id);
    check('Retry is identified as already paid', first.data.already_paid !== retry.data.already_paid);
    check('Change is computed from received cash', Number(first.data.change) === 5000);

    const ticketAfter = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    const ticketTransactions = await prisma.transaction.findMany({
      where: { ticketId: ticket.id },
      select: { id: true, employeeId: true, amount: true },
    });
    cleanupIds.transactionIds.push(...ticketTransactions.map((transaction) => transaction.id));
    check('Ticket and transaction are linked and paid exactly once',
      ticketAfter.paymentStatus === 'paid' &&
        ticketTransactions.length === 1 &&
        ticketAfter.transactionId === ticketTransactions[0]?.id);
    check('Collected amount is attributed to the assigned employee',
      ticketTransactions[0]?.employeeId === employee.id &&
        Number(ticketTransactions[0]?.amount) === 15000);

    const finalResponse = await admin(summaryUrl());
    check('Ticket payment is included in salon and ticket revenue',
      finalResponse.status === 200 &&
        Number(finalResponse.data.totalRevenue) - Number(bulkSummary.totalRevenue) === 15000 &&
        Number(finalResponse.data.ticketRevenue) - Number(bulkSummary.ticketRevenue) === 15000);
  } catch (error) {
    failed = true;
    console.error(error);
  } finally {
    try {
      if (cleanupIds.transactionIds.length) {
        await prisma.transaction.deleteMany({ where: { id: { in: cleanupIds.transactionIds } } });
      }
      if (cleanupIds.ticketId) {
        await prisma.ticket.deleteMany({ where: { id: cleanupIds.ticketId } });
      }
      if (cleanupIds.adminId) {
        await prisma.session.deleteMany({ where: { userId: cleanupIds.adminId } });
        await prisma.account.deleteMany({ where: { userId: cleanupIds.adminId } });
        await prisma.profile.deleteMany({ where: { id: cleanupIds.adminId } });
      }
    } catch (error) {
      failed = true;
      console.error('Test data cleanup failed:', error);
    }
    server.child.kill();
    await new Promise((resolve) => {
      if (server.child.exitCode !== null) return resolve();
      server.child.once('exit', resolve);
      setTimeout(resolve, 3000);
    });
    await prisma.$disconnect();
  }

  const passed = checks.filter(Boolean).length;
  console.log(`\n${passed}/${checks.length} ticket payment checks passed.`);
  if (failed || checks.some((condition) => !condition)) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
