# Stackbreaker strategy trials — unranked prototype

**Route:** /stackbreaker/strategy-lab.html on the Game Lab project.

**Release purpose:** respond to issue #130 with a small, playable, separate and
explicitly unranked decision-training selection. The five cases adapt existing
hand-authored Stackbreaker scenarios (sb-07, sb-16, sb-18, sb-23, sb-28)
and add a guided strategy focus. This is **not five newly authored engines or
new official card interactions** and is **not** a recalibrated Classic campaign.

- A simple first-party, noindex HTML entry uses the existing pure engine and
  actual mana tapping, casting/activated responses, target selection and passing
  through the stack. It does not call the Lab presence API, Scryfall or a
  production leaderboard; card names, rules and costs remain readable offline.
- On every terminal result, the exercise describes an exhaustive search over
  **ordered subsets of one supplied reference response line only**.
  The shortest reference-subset count is an attainable upper bound, **not
  a proof of globally minimal winning actions**, because other cards and
  interleavings might be even more efficient.
- Tests replay each supplied winning line, check losing no-response play,
  confirm legal targeting and affordability, and explicitly catch sb-07's
  avoidably long reference line. No changes to the 250 Classic IDs, 365-date
  Daily manifest, local progress keys, external artwork, or engine version.
- All trials remain completely unranked, including when hints are revealed.
  No profile achievements, telemetry, or progress is submitted or persisted.

**Still unverified:** real human difficulty ratings, comprehension, solve rate,
physical iOS/Android hardware, screen-reader interpretation and ranking of all
250 cases. This pilot does not automatically change the main-site campaign.
Promote only through separately reviewed Website Dev integration after owner
approval and full regression/security testing.

**Tests:** node --test stackbreaker/tests/strategy-trials.test.mjs
and the repository's unified Game Lab suite. Revert these new files to roll
back without altering old saves or scores.
