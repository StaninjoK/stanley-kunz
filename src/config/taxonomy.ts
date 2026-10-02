/**
 * The complete, closed list of topics. Content can only use these ids (enforced by the content schema),
 * so the tag cloud can never grow uncontrolled. Adding a topic is a deliberate code change.
 *
 * Rule of thumb: a new topic is only worth it when at least ~5 pieces of content would carry it.
 */
export const TOPICS = {
  uruguay: {
    label: 'Uruguay',
    description: 'Wie das Land funktioniert, wie es sich anfühlt und was man als Ausländer wissen sollte – aus erster Hand.',
  },
  auswandern: {
    label: 'Auswandern',
    description: 'Von Deutschland nach Südamerika: die Entscheidung, die ersten Jahre, Sprache, Familie und was es wirklich kostet.',
  },
  unternehmertum: {
    label: 'Unternehmertum',
    description: 'Firmen gründen und führen, Finanzierung, Risiko, Kunden gewinnen – mit allem, was dabei schiefgeht.',
  },
  landwirtschaft: {
    label: 'Landwirtschaft',
    description: 'Campo, Tiere, Weiden und wie Landwirtschaft in Uruguay im Alltag aussieht.',
  },
  agrardrohnen: {
    label: 'Agrardrohnen',
    description: 'Pflanzenschutz und Aussaat aus der Luft: Technik, Einsätze, Abdrift, Crashs und das Geschäft dahinter.',
  },
  technologie: {
    label: 'Technologie & Software',
    description: 'Software, die aus echten Problemen entsteht, Automatisierung und Werkzeuge, mit denen gearbeitet wird.',
  },
  handel: {
    label: 'Handel',
    description: 'Handel zwischen Uruguay und Europa: Produkte, Abläufe und was man dabei lernt.',
  },
  alltag: {
    label: 'Alltag',
    description: 'Ein ganz normaler Tag: Tiere, Wetter, Einkaufen, Familie und das Leben auf dem Land.',
  },
  reisen: {
    label: 'Reisen',
    description: 'Unterwegs in Uruguay, Südamerika und darüber hinaus.',
  },
  rueckschlaege: {
    label: 'Fehler & Rückschläge',
    description: 'Was nicht funktioniert hat, was es gekostet hat und was ich heute anders machen würde.',
  },
} as const satisfies Record<string, { label: string; description: string }>;

export type TopicId = keyof typeof TOPICS;
export const TOPIC_IDS = Object.keys(TOPICS) as [TopicId, ...TopicId[]];

export const topicLabel = (id: TopicId): string => TOPICS[id].label;
export const topicPath = (id: TopicId): string => `/themen/${id}/`;
