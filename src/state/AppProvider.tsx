import * as Localization from 'expo-localization';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getStore } from '@/db';
import type { Store } from '@/db/store';
import {
  DEFAULT_SETTINGS,
  type Drink,
  type DrinkInput,
  type Entry,
  type EntryInput,
  type Profile,
  type Settings,
  type Ticket,
  type TicketInput,
  type TicketStatus,
} from '@/domain/types';
import { detectCurrency, detectLanguage, detectResourceCountry } from '@/i18n/detectLocale';
import { onAuthChange, type User } from '@/sync/auth';
import { isFirebaseConfigured } from '@/sync/firebaseApp';
import { enqueueOp } from '@/sync/outbox';
import {
  migrateLocalDataOnSignIn,
  resetSyncStateOnSignOut,
  scheduleDebouncedPush,
  syncNow as runSyncCycle,
  type SyncResult,
} from '@/sync/syncEngine';
import type { SyncOp } from '@/sync/types';

type Status = 'loading' | 'ready' | 'error';

type AppContextValue = {
  status: Status;
  error: string | null;
  store: Store;
  entries: Entry[];
  drinks: Drink[];
  settings: Settings;
  /** Null until onboarding collects one (spec v1.2 §4). */
  profile: Profile | null;
  tickets: Ticket[];
  addEntry: (input: EntryInput) => Promise<Entry>;
  editEntry: (id: string, patch: Partial<EntryInput>) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
  addDrink: (input: DrinkInput) => Promise<Drink>;
  editDrink: (id: string, patch: Partial<DrinkInput> & { archived?: boolean }) => Promise<Drink>;
  removeDrink: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  addTicket: (input: TicketInput) => Promise<Ticket>;
  setTicketStatus: (id: string, status: TicketStatus) => Promise<Ticket>;
  removeTicket: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  reload: () => Promise<void>;
  /** True while a cloud sync pass (pull-to-refresh, foreground, or post-sign-in) is running. */
  syncing: boolean;
  /** No-op when signed out or Firebase isn't configured — safe to call unconditionally (e.g. pull-to-refresh). */
  syncNow: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Single source of truth for the app's data.
 *
 * The whole log is held in memory. At personal scale that is a few thousand
 * rows at most, and it means every screen renders from the same array — charts
 * and history can never disagree, and logging a drink updates everything
 * instantly with no refetch.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [syncing, setSyncing] = useState(false);
  const mounted = useRef(true);

  // Cloud sync (spec v2.0) needs a fresh read of the latest local state from
  // inside an async Firebase auth callback that's only ever (re)subscribed
  // once — refs, updated on every render, sidestep the stale-closure problem
  // that plain state would have there.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const drinksRef = useRef(drinks);
  drinksRef.current = drinks;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const load = useCallback(async () => {
    const [loadedEntries, loadedDrinks, storedSettings, loadedProfile, loadedTickets] = await Promise.all([
      store.listEntries(),
      store.listDrinks(),
      store.getSettings(),
      store.getProfile(),
      store.listTickets(),
    ]);
    if (!mounted.current) return;
    setEntries(loadedEntries);
    setDrinks(loadedDrinks);

    // On a genuinely fresh install — nothing saved yet — the language,
    // help-resources country and currency default from the device locale
    // when it's one we recognise, else fall back to English / general / EUR
    // (spec v1.2 §3.2, §8.1). Anything the user has explicitly set (or that a
    // previous session wrote) is left untouched. Currency detection also
    // replaces the currency step onboarding used to have, now that the first
    // run goes straight from sign-in to the profile screen.
    let detectedDefaults: Partial<Settings> = {};
    if (
      !('language' in storedSettings) ||
      !('resourceCountry' in storedSettings) ||
      !('currency' in storedSettings)
    ) {
      const locales = Localization.getLocales();
      detectedDefaults = {
        ...(!('language' in storedSettings) && {
          language: detectLanguage(locales.map((locale) => locale.languageCode)),
        }),
        ...(!('resourceCountry' in storedSettings) && {
          resourceCountry: detectResourceCountry(locales[0]?.regionCode),
        }),
        ...(!('currency' in storedSettings) && {
          currency: detectCurrency(locales[0]?.regionCode),
        }),
      };
    }

    setSettings({
      ...DEFAULT_SETTINGS,
      ...detectedDefaults,
      ...storedSettings,
      goals: { ...DEFAULT_SETTINGS.goals, ...(storedSettings.goals ?? {}) },
      subscription: { ...DEFAULT_SETTINGS.subscription, ...(storedSettings.subscription ?? {}) },
    });
    setProfile(loadedProfile);
    setTickets(loadedTickets);
  }, [store]);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        await store.init();
        await load();
        if (mounted.current) setStatus('ready');
      } catch (cause) {
        if (!mounted.current) return;
        // A message from a real Error is shown verbatim (it is diagnostic, not
        // UI copy); anything else falls through to Boot's own translated
        // fallback text rather than hardcoding an English string here, since
        // this provider sits outside I18nProvider and has no t() of its own.
        setError(cause instanceof Error ? cause.message : null);
        setStatus('error');
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [load, store]);

  // Queues a write for the next sync pass — a no-op whenever there's no
  // signed-in account, so every call site below stays correct whether or not
  // this device has ever used the cloud sync feature at all.
  const enqueueIfSignedIn = useCallback((op: Omit<SyncOp, 'timestamp'>) => {
    const uid = settingsRef.current.account?.uid;
    if (!uid) return;
    void enqueueOp({ ...op, timestamp: Date.now() }).then(() => {
      scheduleDebouncedPush(uid, () => {});
    });
  }, []);

  const addEntry = useCallback(
    async (input: EntryInput) => {
      const entry = await store.createEntry(input);
      setEntries((current) => sortEntries([entry, ...current]));
      enqueueIfSignedIn({ collection: 'entries', recordId: entry.id, type: 'upsert', payload: entry });
      return entry;
    },
    [store, enqueueIfSignedIn]
  );

  const editEntry = useCallback(
    async (id: string, patch: Partial<EntryInput>) => {
      const updated = await store.updateEntry(id, patch);
      setEntries((current) => sortEntries(current.map((item) => (item.id === id ? updated : item))));
      enqueueIfSignedIn({ collection: 'entries', recordId: updated.id, type: 'upsert', payload: updated });
      return updated;
    },
    [store, enqueueIfSignedIn]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await store.deleteEntry(id);
      setEntries((current) => current.filter((item) => item.id !== id));
      enqueueIfSignedIn({ collection: 'entries', recordId: id, type: 'delete', payload: null });
    },
    [store, enqueueIfSignedIn]
  );

  const addDrink = useCallback(
    async (input: DrinkInput) => {
      const drink = await store.createDrink(input);
      setDrinks((current) => sortDrinks([...current, drink]));
      enqueueIfSignedIn({ collection: 'drinks', recordId: drink.id, type: 'upsert', payload: drink });
      return drink;
    },
    [store, enqueueIfSignedIn]
  );

  const editDrink = useCallback(
    async (id: string, patch: Partial<DrinkInput> & { archived?: boolean }) => {
      const drink = await store.updateDrink(id, patch);
      setDrinks((current) =>
        sortDrinks(current.map((item) => (item.id === id ? drink : item)).filter((item) => !item.archived))
      );
      // Catalog drinks aren't synced (see src/sync/syncEngine.ts's migration
      // step) — only ever queue a write here for the user's own presets.
      if (drink.isCustom) {
        enqueueIfSignedIn({ collection: 'drinks', recordId: drink.id, type: 'upsert', payload: drink });
      }
      return drink;
    },
    [store, enqueueIfSignedIn]
  );

  const removeDrink = useCallback(
    async (id: string) => {
      const wasCustom = drinksRef.current.find((item) => item.id === id)?.isCustom ?? false;
      await store.deleteDrink(id);
      setDrinks((current) => current.filter((item) => item.id !== id));
      // Past entries keep their snapshot; only the link to the preset is gone.
      setEntries((current) =>
        current.map((entry) => (entry.drinkId === id ? { ...entry, drinkId: null } : entry))
      );
      if (wasCustom) {
        enqueueIfSignedIn({ collection: 'drinks', recordId: id, type: 'delete', payload: null });
      }
    },
    [store, enqueueIfSignedIn]
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next: Settings = {
        ...settings,
        ...patch,
        goals: { ...settings.goals, ...(patch.goals ?? {}) },
        subscription: { ...settings.subscription, ...(patch.subscription ?? {}) },
      };
      setSettings(next);
      await store.saveSettings(next);
    },
    [settings, store]
  );

  const saveProfile = useCallback(
    async (next: Profile) => {
      await store.saveProfile(next);
      setProfile(next);
      enqueueIfSignedIn({ collection: 'profile', recordId: 'profile', type: 'upsert', payload: next });
    },
    [store, enqueueIfSignedIn]
  );

  // Persists a merged snapshot from the sync engine into local storage and
  // React state in one go, so a synced drink list is re-read from the store
  // rather than trusted as-is — replaceSyncedData only touches custom drinks,
  // catalog entries stay whatever the store already had.
  const applySyncResult = useCallback(
    async (result: SyncResult) => {
      await store.replaceSyncedData(result);
      const refreshedDrinks = await store.listDrinks();
      if (!mounted.current) return;
      setEntries(sortEntries(result.entries));
      setDrinks(sortDrinks(refreshedDrinks));
      if (result.profile) setProfile(result.profile);
    },
    [store]
  );

  const syncNow = useCallback(async () => {
    const uid = settingsRef.current.account?.uid;
    if (!uid || !isFirebaseConfigured()) return;
    setSyncing(true);
    try {
      const result = await runSyncCycle(uid, {
        entries: entriesRef.current,
        drinks: drinksRef.current,
        profile: profileRef.current,
      });
      await applySyncResult(result);
      if (!mounted.current) return;
      await updateSettings({
        account: { ...settingsRef.current.account!, uid, lastSyncedAt: Date.now() },
      });
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, [applySyncResult, updateSettings]);

  // Firebase Auth is the source of truth for sign-in state; this subscribes
  // once (empty deps) and reacts to sign-in, account switch and sign-out.
  // Entirely inert — never even subscribes — when the app is running without
  // its own Firebase project configured, so local-only mode is unaffected
  // (spec v2.0: "local-only mode remains fully functional... not degraded").
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribe = onAuthChange((user: User | null) => {
      void (async () => {
        if (!mounted.current) return;
        if (!user) {
          if (settingsRef.current.account) {
            await resetSyncStateOnSignOut();
            await updateSettings({ account: null });
          }
          return;
        }
        const isNewSignIn = settingsRef.current.account?.uid !== user.uid;
        if (isNewSignIn) {
          await migrateLocalDataOnSignIn({
            entries: entriesRef.current,
            drinks: drinksRef.current,
            profile: profileRef.current,
          });
        }
        setSyncing(true);
        try {
          const result = await runSyncCycle(user.uid, {
            entries: entriesRef.current,
            drinks: drinksRef.current,
            profile: profileRef.current,
          });
          await applySyncResult(result);
        } finally {
          if (mounted.current) setSyncing(false);
        }
        if (!mounted.current) return;
        await updateSettings({
          account: {
            uid: user.uid,
            email: user.email,
            migratedAt: isNewSignIn ? Date.now() : (settingsRef.current.account?.migratedAt ?? Date.now()),
            lastSyncedAt: Date.now(),
          },
        });
      })();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "sync on app foreground" (spec v2.0 §3) — a no-op via syncNow's own guard
  // whenever there's no signed-in account or Firebase isn't configured.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void syncNow();
    });
    return () => subscription.remove();
  }, [syncNow]);

  const addTicket = useCallback(
    async (input: TicketInput) => {
      const ticket = await store.createTicket(input);
      setTickets((current) => [ticket, ...current]);
      return ticket;
    },
    [store]
  );

  const setTicketStatus = useCallback(
    async (id: string, ticketStatus: TicketStatus) => {
      const updated = await store.updateTicket(id, { status: ticketStatus });
      setTickets((current) => current.map((ticket) => (ticket.id === id ? updated : ticket)));
      return updated;
    },
    [store]
  );

  const removeTicket = useCallback(
    async (id: string) => {
      await store.deleteTicket(id);
      setTickets((current) => current.filter((ticket) => ticket.id !== id));
    },
    [store]
  );

  const clearAllData = useCallback(async () => {
    await store.clearAll();
    setEntries([]);
    setSettings(DEFAULT_SETTINGS);
    setDrinks(await store.listDrinks());
    // Wiped along with everything else (spec v1.2 §4.4): the profile table is
    // gone and the caller is expected to route back to onboarding.
    setProfile(null);
    setTickets([]);
  }, [store]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      error,
      store,
      entries,
      drinks,
      settings,
      profile,
      tickets,
      addEntry,
      editEntry,
      removeEntry,
      addDrink,
      editDrink,
      removeDrink,
      updateSettings,
      saveProfile,
      addTicket,
      setTicketStatus,
      removeTicket,
      clearAllData,
      reload: load,
      syncing,
      syncNow,
    }),
    [
      status,
      error,
      store,
      entries,
      drinks,
      settings,
      profile,
      tickets,
      addEntry,
      editEntry,
      removeEntry,
      addDrink,
      editDrink,
      removeDrink,
      updateSettings,
      saveProfile,
      addTicket,
      setTicketStatus,
      removeTicket,
      clearAllData,
      load,
      syncing,
      syncNow,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.consumedAt - a.consumedAt || b.createdAt - a.createdAt);
}

function sortDrinks(drinks: Drink[]): Drink[] {
  return [...drinks].sort((a, b) => {
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

export function useSettings(): Settings {
  return useApp().settings;
}

export function useEntries(): Entry[] {
  return useApp().entries;
}
