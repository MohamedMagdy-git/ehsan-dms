// services/offline-storage.ts
// IndexedDB storage engine for Ehsan platform offline survey drafts and sync queue.

export interface SurveyDraft {
  id: string; // 'new_case' or caseId
  caseId?: string;
  caseName?: string;
  surveyMode: 'update_existing' | 'new_case';
  lastSaved: string; // ISO date string
  currentStep: number;
  data: {
    selectedCaseId?: string;
    primaryName: string;
    secondaryName?: string;
    nationalId: string;
    phone: string;
    governorate: string;
    district: string;
    address: string;
    directionsNote?: string;
    caseSummary: string;
    requestedAidType: string;
    hasChronicIllness: boolean;
    chronicIllnessDetails?: string;
    medicalExpenses: number;
    healthInsuranceCoverage: string;
    healthInsuranceDetails: string;
    directIncome: number;
    indirectIncome: number;
    basicExpenses: number;
    debtAndIncomeDetails: string;
    priorityScoreLevel: 1 | 2 | 3 | 4 | 5;
    housingCondition: string;
    checklist: Record<string, boolean>;
    householdMembers: any[];
    observations: string;
    recommendations: string;
    gpsData?: any;
    capturedPhotos: Record<string, string>;
    recordedAudioUrl?: string | null;
  };
}

export interface OfflineQueuedSurvey {
  id: string;
  timestamp: string;
  surveyMode: 'update_existing' | 'new_case';
  caseId?: string;
  caseName: string;
  payload: {
    caseUpdates?: any;
    newCaseData?: any;
    visitRecord: any;
  };
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

const DB_NAME = 'ehsan_field_survey_db';
const DB_VERSION = 1;
const STORE_DRAFTS = 'survey_drafts';
const STORE_SYNC_QUEUE = 'sync_queue';

let dbInstance: IDBDatabase | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ----------------------------------------------------
// Draft Operations (Auto-save & Restore)
// ----------------------------------------------------

export async function saveSurveyDraft(draft: SurveyDraft): Promise<void> {
  if (!isIndexedDBSupported()) {
    // Fallback to localStorage
    try {
      localStorage.setItem(`ehsan_draft_${draft.id}`, JSON.stringify(draft));
    } catch {
      // ignore
    }
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DRAFTS], 'readwrite');
    const store = transaction.objectStore(STORE_DRAFTS);
    const req = store.put(draft);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSurveyDraft(id: string): Promise<SurveyDraft | null> {
  if (!isIndexedDBSupported()) {
    try {
      const item = localStorage.getItem(`ehsan_draft_${id}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DRAFTS], 'readonly');
    const store = transaction.objectStore(STORE_DRAFTS);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSurveyDrafts(): Promise<SurveyDraft[]> {
  if (!isIndexedDBSupported()) {
    return [];
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DRAFTS], 'readonly');
    const store = transaction.objectStore(STORE_DRAFTS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSurveyDraft(id: string): Promise<void> {
  if (!isIndexedDBSupported()) {
    try {
      localStorage.removeItem(`ehsan_draft_${id}`);
    } catch {
      // ignore
    }
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DRAFTS], 'readwrite');
    const store = transaction.objectStore(STORE_DRAFTS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------
// Sync Queue Operations (Offline Finalization & Auto-Sync)
// ----------------------------------------------------

export async function enqueueOfflineSurvey(record: {
  surveyMode: 'update_existing' | 'new_case';
  caseId?: string;
  caseName: string;
  payload: {
    caseUpdates?: any;
    newCaseData?: any;
    visitRecord: any;
  };
}): Promise<string> {
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: OfflineQueuedSurvey = {
    id: syncId,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
    ...record,
  };

  if (!isIndexedDBSupported()) {
    // Fallback queue in localStorage
    try {
      const q = JSON.parse(localStorage.getItem('ehsan_sync_queue_fallback') || '[]');
      q.push(item);
      localStorage.setItem('ehsan_sync_queue_fallback', JSON.stringify(q));
    } catch {
      // ignore
    }
    return syncId;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    const req = store.put(item);

    req.onsuccess = () => resolve(syncId);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSyncQueue(): Promise<OfflineQueuedSurvey[]> {
  if (!isIndexedDBSupported()) {
    try {
      return JSON.parse(localStorage.getItem('ehsan_sync_queue_fallback') || '[]');
    } catch {
      return [];
    }
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    const req = store.getAll();

    req.onsuccess = () => {
      const results: OfflineQueuedSurvey[] = req.result || [];
      // Sort oldest first
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  if (!isIndexedDBSupported()) {
    try {
      const q: OfflineQueuedSurvey[] = JSON.parse(localStorage.getItem('ehsan_sync_queue_fallback') || '[]');
      const filtered = q.filter((i) => i.id !== id);
      localStorage.setItem('ehsan_sync_queue_fallback', JSON.stringify(filtered));
    } catch {
      // ignore
    }
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  if (!isIndexedDBSupported()) {
    localStorage.removeItem('ehsan_sync_queue_fallback');
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueueCount(): Promise<number> {
  try {
    const items = await getPendingSyncQueue();
    return items.length;
  } catch {
    return 0;
  }
}
