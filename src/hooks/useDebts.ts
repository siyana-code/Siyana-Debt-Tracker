/**
 * Debts data hook.
 *
 * Because everything is local, there is no fetching and no cache invalidation
 * from a server. `reload` re-runs the SQL queries; the hook also subscribes to
 * a lightweight app-wide change bus so that saving a payment on one screen
 * refreshes the dashboard, the list and the person page without prop drilling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listDebts, summarise, monthlyTrend } from '../db/repositories/debts';
import { loadSettings, saveSetting } from '../db';
import type { Debt, DebtDirection, Person, Settings } from '../types';
import { todayISO } from '../utils/date';

/* ------------------------------------------------------------------ */
/* Change bus                                                          */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyDataChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  summary: {
    lentTotal: number;
    borrowedTotal: number;
    net: number;
    currency: string;
    openCount: number;
    overdueCount: number;
    settledCount: number;
    overdueTotal: number;
  };
  overdue: Array<Debt & { person: Person }>;
  dueSoon: Array<Debt & { person: Person }>;
  recent: Array<Debt & { person: Person }>;
  trend: Array<{ key: string; lent: number; borrowed: number }>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDashboard(): DashboardData {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [overdue, setOverdue] = useState<Array<Debt & { person: Person }>>([]);
  const [dueSoon, setDueSoon] = useState<Array<Debt & { person: Person }>>([]);
  const [recent, setRecent] = useState<Array<Debt & { person: Person }>>([]);
  const [trend, setTrend] = useState<DashboardData['trend']>([]);
  const [totals, setTotals] = useState({
    lentTotal: 0,
    borrowedTotal: 0,
    openCount: 0,
    overdueCount: 0,
    settledCount: 0,
    overdueTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = todayISO();
      const s = await loadSettings();
      setSettings(s);

      const [all, sum, tr] = await Promise.all([
        listDebts({ status: 'open' }),
        summarise(s.currency, today),
        monthlyTrend(s.currency),
      ]);

      // Filtering in JS keeps the SQL simple and the datasets small by design.
      const openDebts = all.filter((d) => d.principal > d.paid);
      setOverdue(
        openDebts
          .filter((d) => d.dueAt && d.dueAt < today)
          .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1))
          .slice(0, 3),
      );
      setDueSoon(
        openDebts
          .filter((d) => d.dueAt && d.dueAt >= today)
          .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1))
          .slice(0, 3),
      );
      setRecent(all.slice(0, 5));
      setTotals(sum);
      setTrend(tr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribe(() => {
      void load();
    });
  }, [load]);

  const summary = useMemo(
    () => ({
      ...totals,
      net: totals.lentTotal - totals.borrowedTotal,
      currency: settings?.currency ?? 'LKR',
    }),
    [totals, settings?.currency],
  );

  return { summary, overdue, dueSoon, recent, trend, loading, error, reload: load };
}

export function useDebts(filters?: {
  direction?: DebtDirection | 'all';
  status?: 'open' | 'settled' | 'all';
}) {
  const [debts, setDebts] = useState<Array<Debt & { person: Person }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = `${filters?.direction ?? 'all'}:${filters?.status ?? 'all'}`;

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await listDebts({
        direction: filters?.direction,
        status: filters?.status,
      });
      setDebts(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load debts');
    } finally {
      setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
    return subscribe(() => {
      void load();
    });
  }, [load]);

  return { debts, loading, error, reload: load };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await loadSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return subscribe(() => {
      void load();
    });
  }, [load]);

  const update = useCallback(async (patch: Partial<Settings>) => {
    for (const [key, value] of Object.entries(patch)) {
      await saveSetting(key as keyof Settings, value as string | number | boolean);
    }
    notifyDataChanged();
  }, []);

  return { settings, loading, update, reload: load };
}