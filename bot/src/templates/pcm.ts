import type { TemplateSet } from './types.js';

// Reviewed and approved — see git history for prior AI-drafted/unreviewed state.
export const pcm: TemplateSet = {
  reviewedBy: 'Zainab Fadeyi',
  reviewedAt: '2026-09-25',
  strings: {
    welcome:
      'We don set your language. We go message you here if flood risk dey rise for your area, so you go get time prepare. E free. Reply STOP anytime make you unsubscribe.\n\nNow tell us your community or LGA (like "Lokoja" or "Makurdi, Benue"), or share your location pin (click the attachment icon, choose Location).',
    locationConfirm: "We think say na {community} you mean. Reply YES make you confirm, or send your community/location again if e wrong.",
    locationNotRecognized:
      'Sorry, we no fit match that to any location wey we dey cover now. Right now na Kogi, Benue, Adamawa, Anambra and Lagos we dey cover, near Niger, Benue and Ogun river. Try your LGA name, or share your location pin.',
    subscribed: "You don set! We go alert you here if flood risk rise for {community}. Reply STOP make you unsubscribe, or CHANGE make you update your language or location.",
    alreadySubscribed: "You don already subscribe for {community} alert. Reply STOP make you unsubscribe, or CHANGE make you update your language or location.",
    unsubscribed: "We don unsubscribe you from Nigeria Flood Early Warning. You no go receive any more message from us again. Send JOIN anytime make you subscribe again.",
    helpMenu: 'Nigeria Flood Early Warning commands:\n1 = full details for the latest alert\nSTOP = unsubscribe\nCHANGE = update your language or location\nJOIN = subscribe',
    outsideCoverage: "Thank you for your interest! Na only Kogi, Benue, Adamawa, Anambra and Lagos near Niger, Benue and Ogun river we dey cover now. We go tell you when we expand.",
    alertShort: '\u{1F30A} Flood alert for {community}: {riskLevel} risk for the next {days} days. Reply 1 make you see full details. Reply STOP make you unsubscribe.',
    alertFull:
      '{riskLevel} flood risk for {community} (next {days} days):\n{reasons}\n\nWhat you go do:\n{actions}\n\nThis na independent early-warning tool, e no be official government warning — follow wetin local authorities talk.\n\nForward give family for {community}. To get alert, send JOIN to {joinNumber}.',
    alertReminder: '\u{26A0}\u{FE0F} Reminder: {community} still dey SEVERE flood risk. Reply 1 make you see full details. Reply STOP make you unsubscribe.',
  },
};
