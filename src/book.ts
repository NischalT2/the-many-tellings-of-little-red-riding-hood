// The dataset for "A Book Without an Original".
// Each entry in `book` represents one page of the story, with multiple
// variations of the same sentence. The unstable text is produced by picking
// a different variation each time the page is read.

export type Page = { variations: string[] };

export const book: Page[] = [
  
  {
    variations: [
      "A girl walks through the forest to visit her grandmother.",
      "A young child travels through the woods to see her grandmother.",
      "She moves alone through the forest, carrying something for her grandmother.",
    ],
  },
  {
    variations: [
      "The forest is quiet, and she feels safe.",
      "The woods are dark, and something feels wrong.",
      "She notices the silence of the forest around her.",
    ],
  },
  {
    variations: [
      "Along the way, she meets a wolf.",
      "A wolf appears on the path and begins to speak with her.",
      "She encounters a strange wolf who watches her closely.",
    ],
  },
  {
    variations: [
      "The wolf asks where she is going.",
      "He questions her about her destination.",
      "The wolf inquires about her journey and listens carefully.",
    ],
  },
  {
    variations: [
      "She tells him she is going to her grandmother\u2019s house.",
      "The girl explains where her grandmother lives.",
      "She reveals her destination without hesitation.",
    ],
  },
  {
    variations: [
      "The wolf runs ahead through the forest.",
      "He leaves quickly, taking a faster path.",
      "The wolf disappears into the woods before she can react.",
    ],
  },
  {
    variations: [
      "He arrives at the grandmother\u2019s house first.",
      "The wolf reaches the house before the girl does.",
      "He finds the grandmother\u2019s home ahead of her.",
    ],
  },
  {
    variations: [
      "The girl eventually reaches the house and enters.",
      "She arrives later and steps inside.",
      "After some time, she reaches the cottage and goes in.",
    ],
  },
  {
    variations: [
      "Something feels strange when she looks at her grandmother.",
      "She notices something is wrong with the figure in the bed.",
      "The girl senses that something is not as it should be.",
    ],
  },
  {
    variations: [
      "The wolf reveals himself.",
      "The disguise begins to fall apart.",
      "There is no grandmother in the bed.",
    ],
  },
];

// Scribal marginalia: page-specific glosses (story index 0 … book.length − 1)
// plus a small generic pool when no contextual note is chosen.
export const pageMarginalia: Record<number, string[]> = {
  0: [
    "the journey begins differently in other tellings",
    "the forest path is longer in oral recitals",
  ],
  1: [
    "the tone here varies widely in performance",
    "some versions describe the woods as dangerous",
  ],
  2: [
    "the wolf appears earlier in some cases",
    "the wolf's entrance is delayed in some manuscripts",
  ],
  3: [
    "the question is phrased differently elsewhere",
  ],
  4: [
    "the destination is sometimes concealed",
    "the girl speaks more cautiously in some tellings",
  ],
  5: [
    "the wolf’s speed is exaggerated in oral versions",
  ],
  6: [
    "the arrival order is different in other tellings",
    "the grandmother is absent in some tellings",
  ],
  7: [
    "the entry into the house is different in other tellings",
    "the scene is different in other versions",
  ],
  8: [
    "the ending is different in other tellings",
    "in some cases, there are no endings",
  ],
};

export const genericMarginalia: string[] = [
  "unclear text",
  "copied incorrectly",
  "the meaning here is uncertain",
  "a different version exists",
];

// Common small substitutions a tired scribe might produce. Whole-word,
// case-insensitive matches, preserving initial capitalization on replacement.
export const typoSwaps: Array<[string, string]> = [
  ["the", "teh"],
  ["and", "adn"],
  ["through", "thruogh"],
  ["forest", "forrest"],
  ["grandmother", "grandmoder"],
  ["wolf", "wolfe"],
  ["house", "hous"],
  ["something", "somthing"],
  ["begins", "beginns"],
  ["disguise", "disguyse"],
  ["silence", "silense"],
  ["journey", "iourney"],
  ["strange", "straunge"],
];
