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
  const mounted = useRef(true);

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

  const addEntry = useCallback(
    async (input: EntryInput) => {
      const entry = await store.createEntry(input);
      setEntries((current) => sortEntries([entry, ...current]));
      return entry;
    },
    [store]
  );

  const editEntry = useCallback(
    async (id: string, patch: Partial<EntryInput>) => {
      const updated = await store.updateEntry(id, patch);
      setEntries((current) => sortEntries(current.map((item) => (item.id === id ? updated : item))));
      return updated;
    },
    [store]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await store.deleteEntry(id);
      setEntries((current) => current.filter((item) => item.id !== id));
    },
    [store]
  );

  const addDrink = useCallback(
    async (input: DrinkInput) => {
      const drink = await store.createDrink(input);
      setDrinks((current) => sortDrinks([...current, drink]));
      return drink;
    },
    [store]
  );

  const editDrink = useCallback(
    async (id: string, patch: Partial<DrinkInput> & { archived?: boolean }) => {
      const drink = await store.updateDrink(id, patch);
      setDrinks((current) =>
        sortDrinks(current.map((item) => (item.id === id ? drink : item)).filter((item) => !item.archived))
      );
      return drink;
    },
    [store]
  );

  const removeDrink = useCallback(
    async (id: string) => {
      await store.deleteDrink(id);
      setDrinks((current) => current.filter((item) => item.id !== id));
      // Past entries keep their snapshot; only the link to the preset is gone.
      setEntries((current) =>
        current.map((entry) => (entry.drinkId === id ? { ...entry, drinkId: null } : entry))
      );
    },
    [store]
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next: Settings = {
        ...settings,
        ...patch,
        goals: { ...settings.goals, ...(patch.goals ?? {}) },
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
    },
    [store]
  );

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
