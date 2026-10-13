/**
 * firebase.ts - Firebase Firestore & Auth 集成服务
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  collection,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
  auth = getAuth(app);
} else {
  app = getApp();
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
  auth = getAuth(app);
}

// 自动匿名认证以便每个客户端拥有专属 UID
let currentUser: User | null = null;

export async function initFirebaseAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
          resolve(cred.user);
        } catch (e) {
          console.warn('Firebase 匿名登录未开启或出现网络波动，使用本地降级模式', e);
          resolve(null);
        }
      }
    });
  });
}

export function getCurrentUserId(): string {
  if (currentUser?.uid) return currentUser.uid;
  // Local fallback UID
  let localUid = localStorage.getItem('local_quant_user_id');
  if (!localUid) {
    localUid = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('local_quant_user_id', localUid);
  }
  return localUid;
}

// 连接状态测试
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore 离线或正在连接');
    }
    return false;
  }
}

// ==========================================
// 1. 自选股云端持久化 (Watchlist)
// ==========================================
export interface CloudWatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  industry: string;
  addedAt: string;
  quantScoreSnapshot?: number;
  notes?: string;
}

export async function saveWatchlistItem(item: Omit<CloudWatchlistItem, 'userId'>): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId, 'watchlists', item.id);
  await setDoc(docRef, {
    ...item,
    userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeWatchlistItem(itemId: string): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId, 'watchlists', itemId);
  await deleteDoc(docRef);
}

export function subscribeUserWatchlist(callback: (items: CloudWatchlistItem[]) => void): () => void {
  const userId = getCurrentUserId();
  const colRef = collection(db, 'users', userId, 'watchlists');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CloudWatchlistItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as CloudWatchlistItem);
      });
      items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('Watchlist snapshot error', err);
    }
  );
}

// ==========================================
// 2. 自定义多因子量化策略云端持久化 (Strategies)
// ==========================================
export interface CloudCustomStrategy {
  id: string;
  userId: string;
  strategyName: string;
  weights: Record<string, number>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveCustomStrategy(
  strategy: Omit<CloudCustomStrategy, 'userId'>
): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId, 'strategies', strategy.id);
  await setDoc(docRef, {
    ...strategy,
    userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function getUserStrategies(): Promise<CloudCustomStrategy[]> {
  const userId = getCurrentUserId();
  const colRef = collection(db, 'users', userId, 'strategies');
  const snap = await getDocs(colRef);
  const list: CloudCustomStrategy[] = [];
  snap.forEach((d) => {
    list.push(d.data() as CloudCustomStrategy);
  });
  return list;
}

// ==========================================
// 3. 回测记录云端持久化 (Backtest Records)
// ==========================================
export interface CloudBacktestRecord {
  id: string;
  userId: string;
  symbol: string;
  strategyName: string;
  startDate: string;
  endDate: string;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  createdAt: string;
}

export async function saveBacktestRecord(
  record: Omit<CloudBacktestRecord, 'userId'>
): Promise<void> {
  const userId = getCurrentUserId();
  const docRef = doc(db, 'users', userId, 'backtests', record.id);
  await setDoc(docRef, {
    ...record,
    userId,
    createdAt: record.createdAt || new Date().toISOString(),
  });
}

export async function getUserBacktests(): Promise<CloudBacktestRecord[]> {
  const userId = getCurrentUserId();
  const colRef = collection(db, 'users', userId, 'backtests');
  const snap = await getDocs(colRef);
  const list: CloudBacktestRecord[] = [];
  snap.forEach((d) => {
    list.push(d.data() as CloudBacktestRecord);
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==========================================
// 4. A股全市场股票数据库直读缓存 (Stock Cache)
// 策略：每次查询首先读 Firestore 数据库，命中则 0 延迟秒开；未命中才查外部 API 并回写数据库
// ==========================================
export interface CachedStockEntry {
  symbol: string;
  name: string;
  industry?: string;
  price?: number;
  changePct?: number;
  bundleJson: string;
  cachedAt: string;
}

export async function getCachedStockFromDb(
  cleanSymbol: string,
  timeoutMs: number = 1000
): Promise<any | null> {
  const fetchPromise = (async () => {
    const docRef = doc(db, 'stock_cache', cleanSymbol);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as CachedStockEntry;
    if (!data.bundleJson) {
      return null;
    }
    const parsedBundle = JSON.parse(data.bundleJson);
    return {
      bundle: parsedBundle,
      cachedAt: data.cachedAt,
      source: 'firestore_db',
    };
  })();

  const timeoutPromise = new Promise<null>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`数据库查询超时 (超过 ${timeoutMs}ms)`));
    }, timeoutMs);
    // 如果 fetchPromise 先完成，清理 timer
    fetchPromise.finally(() => clearTimeout(timer));
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err: any) {
    if (err.message && err.message.includes('超时')) {
      console.warn(`[Firestore DB Cache] 股票 ${cleanSymbol} 触发 ${timeoutMs}ms 超时熔断，立即降级切换至 API 查询`);
    } else {
      console.warn(`[Firestore DB Cache] 读取 ${cleanSymbol} 异常:`, err);
    }
    return null;
  }
}

export async function saveStockToDbCache(cleanSymbol: string, bundle: any): Promise<void> {
  try {
    const docRef = doc(db, 'stock_cache', cleanSymbol);
    const payload: CachedStockEntry = {
      symbol: cleanSymbol,
      name: bundle.meta?.name || bundle.quote?.name || cleanSymbol,
      industry: bundle.meta?.industry || '',
      price: bundle.quote?.price,
      changePct: bundle.quote?.changePct,
      bundleJson: JSON.stringify(bundle),
      cachedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn(`[Firestore DB Cache] 写入 ${cleanSymbol} 失败:`, err);
  }
}

export async function getAllCachedStocksFromDb(): Promise<Array<{ symbol: string; name: string; cachedAt: string }>> {
  try {
    const colRef = collection(db, 'stock_cache');
    const snap = await getDocs(colRef);
    const result: Array<{ symbol: string; name: string; cachedAt: string }> = [];
    snap.forEach((d) => {
      const data = d.data() as CachedStockEntry;
      result.push({
        symbol: data.symbol,
        name: data.name,
        cachedAt: data.cachedAt,
      });
    });
    return result;
  } catch (err) {
    console.warn('[Firestore DB Cache] 获取缓存列表失败:', err);
    return [];
  }
}

export { db, auth };
