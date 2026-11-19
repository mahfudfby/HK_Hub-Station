export interface AppItem {
  path: string;
  cat: string;
  title: string;
  desc: string;
  no: string;
  login?: boolean;
  tags: string[];
  isFavorite: boolean;
}

export type ViewMode = 'board' | 'grid' | 'list';
export type SortOption = 'default' | 'az' | 'za';

export interface CategoryDef {
  key: string;
  title: string;
  iconName: 'star' | 'briefcase' | 'receipt' | 'building' | 'users' | 'fileText' | 'printer' | 'stethoscope';
  gradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentBg: string;
}

export interface KanbanGroup extends CategoryDef {
  apps: AppItem[];
  isFavoriteCol?: boolean;
}

export type ToastState = { type: 'success' | 'error' | 'info'; message: string } | null;
