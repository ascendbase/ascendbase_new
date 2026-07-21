// Answer-first standfirsts for high-traffic looksmaxing posts.
//
// These one-sentence answers are what LLMs (and voice assistants, via the
// Speakable spec) lift as the direct response to a query — so each post now
// leads with the answer, then the full guide expands on it. When a slug isn't
// mapped here we fall back to the post's own first block.
export const ANSWER_FIRST: Record<string, string> = {
  "1":
    "The features that most influence perceived facial attractiveness are the eyes (canthal tilt and hooding), midface and forward-growth balance, and nose-to-chin harmony — read together, not as any single trait.",
  "2":
    "The most-cited facial ratios in looksmaxing are FWHR (width-to-height), the midface ratio, nose-width-to-mouth-width, and profile angles such as the nasofrontal and nasolabial — each a proxy for balance, not a verdict on a person's worth.",
  "3":
    "In looksmaxing, the 'eye area' means canthal tilt, eye shape (hooding and lid show), and depth; 'hunter eyes' (positive tilt, deep-set, low lid exposure) are broadly associated with an attractive, alert appearance.",
  "4":
    "Facial definition comes from low subcutaneous fat (leanness) plus angular bone structure (jaw and cheekbones); it is improved mainly through overall leanness, with structure work playing a smaller role.",
  "5":
    "Forward growth is the frontward development of the maxilla and midface; adequate forward growth yields a defined midface, upright posture, and a healthier airway, while deficient growth reads as recessed.",
  "12":
    "Looksmaxing vocabulary covers the niche terms used to describe facial structure — FWHR, hunter and prey eyes, forward growth, canthal tilt, and projection — each defined in the glossary.",
  "13":
    "Nasal tip rotation is governed by the lower lateral cartilages, the caudal septum, and skin tension; it is increased by reshaping those structures (surgically) or, mildly, by volume and taping methods.",
  "15":
    "Facial symmetry is the bilateral correspondence of the left and right halves of the face; mild asymmetry is normal, and greater symmetry correlates with perceived attractiveness without being the only factor.",
  "16":
    "A practical looksmaxing approach starts with the highest-leverage, lowest-risk levers — leanness, posture, skin, and grooming — before considering structural or surgical changes.",
  "17":
    "Bite force and mandibular function influence maxillary positioning; consistent proper function supports forward growth, while chronic mouth-breathing and poor function can work against it.",
  "18":
    "The paid coaching subscription delivers personalized facial evaluation, a structured routine, and progress feedback — the free reads cover the underlying principles.",
};

export function answerFirst(slug: string | null, fallback: string): string {
  if (slug && ANSWER_FIRST[slug]) return ANSWER_FIRST[slug];
  return fallback;
}
