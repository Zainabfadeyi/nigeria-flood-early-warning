import type { TemplateSet } from './types.js';

// English is the fallback every other language degrades to (CLAUDE.md
// section 8), so it's treated as reviewed-by-default rather than gated the
// same way translations are — there's nowhere further to fall back to.
export const en: TemplateSet = {
  reviewedBy: 'project-default (English is the fallback language)',
  reviewedAt: '2026-09-25',
  strings: {
    welcome:
      "You're set to English. We'll message you here if flood risk rises for your area, so you have time to prepare. It's free. Reply STOP anytime to unsubscribe.\n\nNow, tell us your community or LGA (e.g. \"Lokoja\" or \"Makurdi, Benue\"), or share your location pin (tap the attachment icon and choose Location).",
    locationConfirm: "We think you mean {community}. Reply YES to confirm, or send your community/location again if that's wrong.",
    locationNotRecognized:
      "Sorry, we couldn't match that to a location we cover yet. Right now we only cover communities in Kogi, Benue, Adamawa, Anambra and Lagos, along the Niger, Benue and Ogun rivers. Try your LGA name, or share your location pin.",
    subscribed: "You're all set! We'll alert you here if flood risk rises for {community}. Reply STOP to unsubscribe, or CHANGE to update your language or location.",
    alreadySubscribed: "You're already subscribed for {community} alerts. Reply STOP to unsubscribe, or CHANGE to update your language or location.",
    unsubscribed: "You've been unsubscribed from Nigeria Flood Early Warning. You won't get any more messages from us. Send JOIN anytime to subscribe again.",
    helpMenu: 'Nigeria Flood Early Warning commands:\n1 = full details on the latest alert\nSTOP = unsubscribe\nCHANGE = update your language or location\nJOIN = subscribe',
    outsideCoverage: "Thanks for your interest! We only cover Kogi, Benue, Adamawa, Anambra and Lagos along the Niger, Benue and Ogun rivers right now. We'll let you know when we expand.",
    alertShort: '\u{1F30A} Flood alert for {community}: {riskLevel} risk in the next {days} days. Reply 1 for full details. Reply STOP to unsubscribe.',
    alertFull:
      '{riskLevel} flood risk for {community} (next {days} days):\n{reasons}\n\nWhat to do:\n{actions}\n\nThis is an independent early-warning tool, not an official government warning — follow local authority guidance.\n\nForward to family in {community}. To get alerts, send JOIN to {joinNumber}.',
    alertReminder: '\u{26A0}\u{FE0F} Reminder: {community} remains at SEVERE flood risk. Reply 1 for full details. Reply STOP to unsubscribe.',
  },
};
