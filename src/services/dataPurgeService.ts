import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

export interface PurgeResult {
  billsDeleted: number;
  billItemsDeleted: number;
  kotsDeleted: number;
  kotItemsDeleted: number;
  movementsDeleted: number;
  localStorageCleared: boolean;
}

/**
 * Purges all test transactions, bills, KOTs, and temporary test data
 * from both Firestore and client local storage. Preserves categories,
 * menu items, user credentials, and restaurant settings.
 */
export async function purgeAllTestData(): Promise<PurgeResult> {
  const result: PurgeResult = {
    billsDeleted: 0,
    billItemsDeleted: 0,
    kotsDeleted: 0,
    kotItemsDeleted: 0,
    movementsDeleted: 0,
    localStorageCleared: false
  };

  // Helper to batch-delete all documents in a collection
  const purgeCollection = async (colName: string): Promise<number> => {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) return 0;

      let batch = writeBatch(db);
      let count = 0;
      let total = 0;

      for (const d of snap.docs) {
        batch.delete(doc(db, colName, d.id));
        count++;
        total++;
        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      return total;
    } catch (err) {
      console.warn(`Error purging collection ${colName}:`, err);
      return 0;
    }
  };

  // 1. Purge Firestore test transaction data
  result.billsDeleted = await purgeCollection('bills');
  result.billItemsDeleted = await purgeCollection('bill_items');
  result.kotsDeleted = await purgeCollection('kots');
  result.kotItemsDeleted = await purgeCollection('kot_items');
  result.movementsDeleted = await purgeCollection('inventory_movements');

  // Purge test probe users if any exist
  const probeIds = ['test_delete_probe', 'test_doc_probe'];
  for (const pid of probeIds) {
    try {
      await purgeCollection(`users/${pid}`);
    } catch {
      // ignore
    }
  }

  // 2. Clear client-side test local storage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove = [
        'pos_local_completed_bills',
        'pos_local_completed_items',
        'pos_last_printed_bill',
        'pos_local_kots',
        'pos_last_created_kot',
        'pos_draft_billing_cart',
        'pos_draft_cart',
        'pos_test_print_logs',
        'pos_print_diagnostics',
        'pos_offline_kots',
        'pos_last_kot_print'
      ];

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }

      // Also clean any pos_pending_bills_ keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pos_pending_bills_')) {
          localStorage.removeItem(k);
        }
      }

      result.localStorageCleared = true;

      // 3. Dispatch live window events to immediately reset UI states
      window.dispatchEvent(new CustomEvent('pos_bills_updated', { detail: { cleared: true } }));
      window.dispatchEvent(new CustomEvent('pos_kots_updated', { detail: { cleared: true } }));
    } catch (e) {
      console.warn('Error clearing local storage test data:', e);
    }
  }

  return result;
}
