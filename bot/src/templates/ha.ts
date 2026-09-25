import type { TemplateSet } from './types.js';

// Reviewed and approved — see git history for prior AI-drafted/unreviewed state.
export const ha: TemplateSet = {
  reviewedBy: 'Zainab Fadeyi',
  reviewedAt: '2026-09-25',
  strings: {
    welcome:
      'Mun saita harshenka. Za mu tura maka sako a nan idan hadarin ambaliya ya karu a yankinku, don ku sami lokacin shirya. Kyauta ne. Ka aiko STOP a kowane lokaci don dainawa.\n\nYanzu, gaya mana unguwarku ko LGA (misali "Lokoja" ko "Makurdi, Benue"), ko ka aiko wurin da kake (danna alamar rataye sannan ka zabi Location).',
    locationConfirm: "Muna tunanin kana nufin {community}. Ka amsa YES don tabbatarwa, ko ka sake aiko unguwarka/wurinka idan ba daidai ba.",
    locationNotRecognized:
      "Yi hakuri, ba mu iya daidaita wannan da wani wuri da muke rufewa ba tukuna. A yanzu muna rufe Kogi, Benue, Adamawa, Anambra da Legas kawai, kusa da kogunan Neja, Benue da Ogun. Gwada sunan LGA naka, ko ka aiko wurin da kake.",
    subscribed: "An kammala! Za mu gargade ka a nan idan hadarin ambaliya ya karu a {community}. Ka amsa STOP don dainawa, ko CHANGE don sabunta harshenka ko wurinka.",
    alreadySubscribed: "Kai riga kaya rijista don gargadin {community}. Ka amsa STOP don dainawa, ko CHANGE don sabunta harshenka ko wurinka.",
    unsubscribed: "An cire ka daga Gargadin Ambaliya na Farko na Najeriya. Ba za ka sake samun sako daga gare mu ba. Aiko JOIN a kowane lokaci don sake rijista.",
    helpMenu: "Umarnin Gargadin Ambaliya na Najeriya:\n1 = cikakken bayani game da sabon gargadi\nSTOP = dainawa\nCHANGE = sabunta harshe ko wuri\nJOIN = yin rijista",
    outsideCoverage: "Na gode da sha'awarka! A yanzu muna rufe Kogi, Benue, Adamawa, Anambra da Legas ne kawai, kusa da kogunan Neja, Benue da Ogun. Za mu sanar da kai idan mun fadada.",
    alertShort: '\u{1F30A} Gargadin ambaliya don {community}: hadari na {riskLevel} a cikin kwanaki {days} masu zuwa. Ka amsa 1 don cikakken bayani. Ka amsa STOP don dainawa.',
    alertFull:
      'Hadarin ambaliya na {riskLevel} don {community} (kwanaki {days} masu zuwa):\n{reasons}\n\nAbin yi:\n{actions}\n\nWannan kayan aiki ne mai zaman kansa na gargadin farko, ba gargadin gwamnati ba ne — bi shawarwarin hukumomin yankinku.\n\nAiko wa iyalinku a {community}. Don samun gargadi, aiko JOIN zuwa {joinNumber}.',
    alertReminder: '\u{26A0}\u{FE0F} Tunatarwa: {community} na ci gaba da kasancewa cikin hadarin ambaliya mai TSANANI. Ka amsa 1 don cikakken bayani. Ka amsa STOP don dainawa.',
  },
};
