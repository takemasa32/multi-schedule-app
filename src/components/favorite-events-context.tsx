/**
 * @fileoverview お気に入りイベントのグローバル状態管理用Context/Provider/フック
 * @module FavoriteEventsContext
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

/**
 * お気に入りイベント情報の型
 * @typedef {Object} FavoriteEvent
 * @property {string} id - イベントID
 * @property {string} title - イベントタイトル
 * @property {string} [lastAccessed] - 最終アクセス日時（ISO文字列）
 */
export interface FavoriteEvent {
  id: string;
  title: string;
  lastAccessed?: string;
}

/**
 * お気に入りイベントContextの型
 * @typedef {Object} FavoriteEventsContextType
 * @property {FavoriteEvent[]} favorites - お気に入りイベント一覧
 * @property {(event: FavoriteEvent) => void} addFavorite - お気に入り追加
 * @property {(id: string) => void} removeFavorite - お気に入り削除
 * @property {() => void} refreshFavorites - ローカルストレージから再取得
 */
interface FavoriteEventsContextType {
  favorites: FavoriteEvent[];
  addFavorite: (event: FavoriteEvent) => void;
  removeFavorite: (id: string) => void;
  refreshFavorites: () => void;
}

const FAVORITE_KEY = "favoriteEvents";

const FavoriteEventsContext = createContext<FavoriteEventsContextType | undefined>(undefined);

/**
 * ローカルストレージからお気に入りイベント一覧を取得
 * @returns {FavoriteEvent[]}
 */
function getFavoriteEventsFromStorage(): FavoriteEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteEvent[];
  } catch {
    return [];
  }
}

/**
 * お気に入りイベント一覧をローカルストレージに保存
 * @param {FavoriteEvent[]} events
 */
function setFavoriteEventsToStorage(events: FavoriteEvent[]) {
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(events));
}

/**
 * お気に入りイベントのグローバルProvider
 * @param {object} props
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
export const FavoriteEventsProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);

  useEffect(() => {
    setFavorites(getFavoriteEventsFromStorage());
  }, []);

  /**
   * お気に入りイベントを追加
   * @param {FavoriteEvent} event
   */
  const addFavorite = (event: FavoriteEvent) => {
    setFavorites(prev => {
      const updated = [event, ...prev.filter(ev => ev.id !== event.id)];
      setFavoriteEventsToStorage(updated);
      return updated;
    });
  };

  /**
   * お気に入りイベントを削除
   * @param {string} id
   */
  const removeFavorite = (id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(ev => ev.id !== id);
      setFavoriteEventsToStorage(updated);
      return updated;
    });
  };

  /**
   * ローカルストレージからお気に入り一覧を再取得
   */
  const refreshFavorites = () => {
    setFavorites(getFavoriteEventsFromStorage());
  };

  return (
    <FavoriteEventsContext.Provider value={{ favorites, addFavorite, removeFavorite, refreshFavorites }}>
      {children}
    </FavoriteEventsContext.Provider>
  );
};

/**
 * お気に入りイベントContextを利用するカスタムフック
 * @returns {FavoriteEventsContextType}
 * @throws {Error} Provider外で呼び出した場合
 */
export function useFavoriteEvents() {
  const ctx = useContext(FavoriteEventsContext);
  if (!ctx) throw new Error("useFavoriteEvents must be used within FavoriteEventsProvider");
  return ctx;
}
