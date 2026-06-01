import type { AppLocale } from "../locale";

export function formatCount(locale: AppLocale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(locale: AppLocale, value: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent"
  }).format(value);
}

export function formatDate(locale: AppLocale, value: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(timeZone ? { timeZone } : {})
  }).format(new Date(value));
}

export function formatDateTime(locale: AppLocale, value: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {})
  }).format(new Date(value));
}
