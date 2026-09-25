import type { TemplateSet } from './types.js';

// Reviewed and approved — see git history for prior AI-drafted/unreviewed state.
export const ig: TemplateSet = {
  reviewedBy: 'Zainab Fadeyi',
  reviewedAt: '2026-09-25',
  strings: {
    welcome:
      'Anyị edobela asụsụ gị. Anyị ga-eziga gị ozi ebe a ma ọ bụrụ na ihe ize ndụ idei mmiri na-abawanye n\'ógbè gị, ka ị nwee oge ijikere. Ọ bụ n\'efu. Zaghachi STOP mgbe ọ bụla iji kwụsị.\n\nUgbu a, gwa anyị obodo gị ma ọ bụ LGA (dịka "Lokoja" ma ọ bụ "Makurdi, Benue"), ma ọ bụ zitere anyị ebe ị nọ (pịa akara mmado, họrọ Location).',
    locationConfirm: "Anyị chere na ị na-ekwu {community}. Zaghachi YES iji kwado, ma ọ bụ zitegharịa obodo/ebe ị nọ ma ọ bụrụ na ọ ezighị ezi.",
    locationNotRecognized:
      "Ndo, anyị enweghị ike ijikọta nke a na ebe anyị na-ekpuchi ugbu a. Ugbu a, anyị na-ekpuchi naanị Kogi, Benue, Adamawa na Anambra, n'akụkụ osimiri Niger na Benue. Nwaa aha LGA gị, ma ọ bụ zitere anyị ebe ị nọ.",
    subscribed: "Emechaala! Anyị ga-adọ gị aka na ntị ebe a ma ọ bụrụ na ihe ize ndụ idei mmiri na-abawanye na {community}. Zaghachi STOP iji kwụsị, ma ọ bụ CHANGE iji melite asụsụ ma ọ bụ ebe ị nọ.",
    alreadySubscribed: "Ị debanyeela aha gị maka ọkwa {community}. Zaghachi STOP iji kwụsị, ma ọ bụ CHANGE iji melite asụsụ ma ọ bụ ebe ị nọ.",
    unsubscribed: "Ewepụla gị na Ọkwa Idei Mmiri Ọsọ Ọsọ nke Naịjirịa. Ị gaghị anata ozi ọ bụla ọzọ n'aka anyị. Zitere JOIN mgbe ọ bụla iji debanye aha ọzọ.",
    helpMenu: "Iwu Ọkwa Idei Mmiri Ọsọ Ọsọ nke Naịjirịa:\n1 = nkọwa zuru ezu banyere ọkwa kacha ọhụrụ\nSTOP = kwụsị\nCHANGE = melite asụsụ ma ọ bụ ebe ị nọ\nJOIN = debanye aha",
    outsideCoverage: "Daalụ maka mmasị gị! Anyị na-ekpuchi naanị Kogi, Benue, Adamawa na Anambra ugbu a, n'akụkụ osimiri Niger na Benue. Anyị ga-agwa gị mgbe anyị gbasaworo.",
    alertShort: '\u{1F30A} Ọkwa idei mmiri maka {community}: ihe ize ndụ {riskLevel} n\'ime ụbọchị {days} na-abịa. Zaghachi 1 maka nkọwa zuru ezu. Zaghachi STOP iji kwụsị.',
    alertFull:
      "Ihe ize ndụ idei mmiri {riskLevel} maka {community} (ụbọchị {days} na-abịa):\n{reasons}\n\nIhe ị ga-eme:\n{actions}\n\nNke a bụ ngwaọrụ ọkwa mbụ nweere onwe ya, ọ bụghị ọkwa gọọmentị — soro ndụmọdụ ndị ọchịchị mpaghara gị.\n\nZitere ezinụlọ na {community}. Iji nweta ọkwa, zitere JOIN na {joinNumber}.",
    alertReminder: "\u{26A0}\u{FE0F} Ncheta: {community} ka nọ n'ihe ize ndụ idei mmiri UKWUU. Zaghachi 1 maka nkọwa zuru ezu. Zaghachi STOP iji kwụsị.",
  },
};
