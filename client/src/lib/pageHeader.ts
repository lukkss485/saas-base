// src/lib/pageHeader.ts
import { reactive } from 'vue';

export interface PageHeaderState {
  title: string;
  subtitle: string;
  showSearch: boolean;
}

const DEFAULTS: PageHeaderState = {
  title: '',
  subtitle: '',
  showSearch: true,
};

export const pageHeader = reactive<PageHeaderState>({ ...DEFAULTS });

export function setPageHeader(patch: Partial<PageHeaderState>): void {
  Object.assign(pageHeader, patch);
}

export function resetPageHeader(): void {
  Object.assign(pageHeader, DEFAULTS);
}