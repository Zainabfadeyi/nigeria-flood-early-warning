import type { TemplateSet } from './types.js';

// DRAFT — AI-translated, NOT reviewed by a native speaker yet. See pcm.ts's
// comment; same rule applies to every non-English file in this directory.
export const yo: TemplateSet = {
  reviewedBy: null,
  reviewedAt: null,
  strings: {
    welcome:
      'A ti seto ede re. A o fi ise si o nibi ti ewu ikun-omi ba n pọ si ni agbegbe re, ki o le ni akoko lati mura sile. O je ofe. Da STOP pada nigbakugba lati fagilee.\n\nNi bayi, so fun wa agbegbe re tabi LGA (bii "Lokoja" tabi "Makurdi, Benue"), tabi fi ipo re ranse (te aami asomo, ki o si yan Location).',
    locationConfirm: "A ro pe {community} ni o tumo si. Da YES pada lati je ki a mo pe o daju, tabi tun fi agbegbe/ipo re ranse ti ko ba tọ.",
    locationNotRecognized:
      "A dupe, a ko le so eyi pọ mọ ibi ti a n bo lọwọlọwọ. Lọwọlọwọ a n bo Kogi, Benue, Adamawa ati Anambra nikan, ni eba odo Niger ati Benue. Gbiyanju oruko LGA re, tabi fi ipo re ranse.",
    subscribed: "O ti šetan! A o kilo fun o nibi ti ewu ikun-omi ba pọ si ni {community}. Da STOP pada lati fagilee, tabi CHANGE lati yi ede tabi ipo re pada.",
    alreadySubscribed: "O ti forukọsilẹ tẹlẹ fun ikilọ {community}. Da STOP pada lati fagilee, tabi CHANGE lati yi ede tabi ipo re pada.",
    unsubscribed: "A ti yọ o kuro ninu Ikilọ Ikun-omi Kutukutu ti Naijiria. Iwọ kii yoo gba ifiranṣẹ mọ lati ọdọ wa. Firanṣẹ JOIN nigbakugba lati forukọsilẹ lẹẹkansi.",
    helpMenu: "Awọn aṣẹ Ikilọ Ikun-omi Kutukutu ti Naijiria:\n1 = alaye kikun lori ikilọ to šẹšẹ julọ\nSTOP = fagilee\nCHANGE = yi ede tabi ipo re pada\nJOIN = forukọsilẹ",
    outsideCoverage: "O ṣeun fun ifẹ rẹ! A n bo Kogi, Benue, Adamawa ati Anambra nikan lọwọlọwọ, ni eba odo Niger ati Benue. A o fun o ni imọran nigba ti a ba faagun.",
    alertShort: '\u{1F30A} Ikilọ ikun-omi fun {community}: ewu {riskLevel} ni ọjọ {days} to n bọ. Da 1 pada fun alaye kikun. Da STOP pada lati fagilee.',
    alertFull:
      "Ewu ikun-omi {riskLevel} fun {community} (ọjọ {days} to n bọ):\n{reasons}\n\nOhun to ye ki e se:\n{actions}\n\nEyi je irinse ikilọ ominira, kii se ikilọ osise ijoba — tele imọran awọn alaṣẹ agbegbe yin.\n\nFi ranse si ebi ni {community}. Lati gba ikilọ, fi JOIN ranse si {joinNumber}.",
    alertReminder: "\u{26A0}\u{FE0F} Iranti: {community} si wa ninu ewu ikun-omi t'o LEWU julọ. Da 1 pada fun alaye kikun. Da STOP pada lati fagilee.",
  },
};
