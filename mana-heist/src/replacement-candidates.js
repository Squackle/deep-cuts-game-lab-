// Browser-compatible ES module: no JSON import attributes.
export default [
  {
    "id": "mh-review-031",
    "sourceId": "mh-031",
    "version": "mh-landfall-0.2.0",
    "chapter": "REPLACEMENT REVIEW",
    "rank": 2,
    "title": "The Borrowed Red Key",
    "briefing": "Two wards on one turn. The flexible source is the only red source; reserve it for the later ward.",
    "turnLimit": 1,
    "life": 20,
    "hand": [],
    "field": [
      {
        "id": "fixed",
        "card": "island"
      },
      {
        "id": "dual",
        "card": "dualUR"
      }
    ],
    "library": [],
    "stages": [
      {
        "name": "Blue latch",
        "cost": {
          "U": 1
        }
      },
      {
        "name": "Red lock",
        "cost": {
          "R": 1
        }
      }
    ],
    "decision": {
      "focus": "Plan the future color before spending the flexible source.",
      "clue": "Which source is the only red producer?",
      "why": "Blue must come from the Island; the flexible land supplies red. Both tap orders are legal, but choosing its blue mode loses the final lock.",
      "retry": "Reverse the order of the two legal taps."
    }
  },
  {
    "id": "mh-review-034",
    "sourceId": "mh-034",
    "version": "mh-landfall-0.2.0",
    "chapter": "REPLACEMENT REVIEW",
    "rank": 3,
    "title": "The True Colorless Key",
    "briefing": "Three sources and two wards. The final lock needs a red pip and a true colorless pip. Generic spending is the commitment.",
    "turnLimit": 1,
    "life": 20,
    "hand": [],
    "field": [
      {
        "id": "blue",
        "card": "island"
      },
      {
        "id": "red",
        "card": "mountain"
      },
      {
        "id": "waste",
        "card": "relic"
      }
    ],
    "library": [],
    "stages": [
      {
        "name": "Generic latch",
        "cost": {
          "N": 1
        }
      },
      {
        "name": "Red and diamond",
        "cost": {
          "R": 1,
          "C": 1
        }
      }
    ],
    "decision": {
      "focus": "Preserve the only true colorless and red sources.",
      "clue": "The diamond is a specific requirement, unlike a number.",
      "why": "Use blue for the generic latch and keep red plus true colorless for the final ward. Paying the first ward with either of those scarce resources opens the first ward but loses the puzzle.",
      "retry": "Charge all three and choose blue manually; then try blue first with automatic casting."
    }
  },
  {
    "id": "mh-review-035",
    "sourceId": "mh-035",
    "version": "mh-landfall-0.2.0",
    "chapter": "REPLACEMENT REVIEW",
    "rank": 4,
    "title": "Prime the Key",
    "briefing": "A reusable mana rock is not a free resource. Reserve fuel for the Key before opening the first ward.",
    "turnLimit": 1,
    "life": 20,
    "hand": [],
    "field": [
      {
        "id": "ring",
        "card": "solring"
      },
      {
        "id": "key",
        "card": "key"
      },
      {
        "id": "blue",
        "card": "island"
      },
      {
        "id": "red",
        "card": "mountain"
      }
    ],
    "library": [],
    "stages": [
      {
        "name": "Azure mechanism",
        "cost": {
          "N": 2,
          "U": 1
        }
      },
      {
        "name": "Final ember",
        "cost": {
          "N": 1,
          "R": 1
        }
      }
    ],
    "decision": {
      "focus": "Pay the activation fee before spending the first ward's generic cost.",
      "clue": "The Key can untap the Ring, but needs one mana to do it. Can you still pay after the first ward?",
      "why": "Tap Sol Ring, spend one of its two colorless mana on Voltaic Key, and tap Sol Ring again. Now enough generic mana remains for both wards. Opening the first ward too early strands the untap fee or a required color.",
      "retry": "Try charging red first; keep the red pip while using colorless to fund the Key. Compare auto-cast before and after the Key activation."
    }
  }
];
