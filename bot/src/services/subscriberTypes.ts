import type { Horizon, RiskLevel } from '@nigeria-flood/shared';

export const SUPPORTED_LANGUAGES = ['en', 'ha', 'yo', 'ig', 'pcm'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const ONBOARDING_STATUSES = ['awaiting_language', 'awaiting_location', 'active'] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/** Enough of the last alert's content to answer a "1" reply without re-fetching from the Actor (see flows/alerts.ts / flows/replies.ts). */
export interface LastAlertDetails {
  days: Horizon;
  reasons: string[];
  recommendedActions: string[];
}

export interface Subscriber {
  /** Twilio's "whatsapp:+234..." form — used as the store key. */
  phone: string;
  status: OnboardingStatus;
  language?: Language;
  communityId?: string;
  /** Set while awaiting a YES/no-op confirmation for a lower-confidence location match (see flows/onboarding.ts). */
  pendingCommunityId?: string;
  latitude?: number;
  longitude?: number;
  consentAt?: string;
  lastAlertLevel?: RiskLevel;
  /** When the last alert (or SEVERE 48h reminder) was actually sent — drives the reminder cadence in flows/alerts.ts. */
  lastAlertSentAt?: string;
  lastAlertDetails?: LastAlertDetails;
  createdAt: string;
  updatedAt: string;
}

/**
 * CLAUDE.md section 9: "Store subscribers in the Apify key-value store for
 * the MVP, behind a SubscriberStore interface so we can swap to Postgres
 * (e.g. Supabase) later." This interface is that seam.
 */
export interface SubscriberStore {
  get(phone: string): Promise<Subscriber | null>;
  save(subscriber: Subscriber): Promise<void>;
  delete(phone: string): Promise<void>;
  listActive(): Promise<Subscriber[]>;
}
