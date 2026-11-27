// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
import { describe, expect, test } from "bun:test"

import { copyFindings } from "./check-copy"

const rules = (text: string, ui = false, jsx = false) =>
  copyFindings(text, { ui, jsx }).map((f) => f.rule.split(":")[0])

describe("check:copy", () => {
  test("hype and filler words are refused, in English and French", () => {
    expect(rules("A seamless way to track time.")).toEqual(["a hype word"])
    expect(rules("Découvrez notre outil.")).toEqual(["a hype word"])
    expect(rules("It simply works.")).toEqual(["a filler adverb"])
    expect(rules("C'est vraiment rapide.")).toEqual(["a filler adverb"])
  })

  test("a word inside a longer one is not", () => {
    expect(rules("Unlocked achievements, robustness aside.")).toEqual([])
  })

  test("stock phrases of assistants are refused", () => {
    expect(rules("Vos données restent chez vous. Jamais.")).toEqual(["a stock phrase"])
    expect(rules("Zéro maintenance.")).toEqual(["a stock phrase"])
    expect(rules("Ravi d'annoncer la sortie.")).toEqual(["a stock phrase"])
  })

  test("unlock sells as a verb, not as a noun", () => {
    expect(rules("Unlock your potential.")).toEqual(["a stock phrase"])
    expect(rules("Latest unlocks, time to unlock.")).toEqual([])
  })

  test("an emoji is refused", () => {
    expect(rules("Shipped 🚀")).toEqual(["an emoji"])
  })

  test("an exclamation mark is refused in the interface only", () => {
    expect(rules('saved: "Saved!",', true)).toEqual(["an exclamation mark"])
    expect(rules("![cover](a.png)")).toEqual([])
    expect(rules("if (!ready) return", true)).toEqual([])
  })

  test("a quoted word or a code block is not read", () => {
    expect(rules("Refuse `seamless` and « vraiment ».")).toEqual([])
    expect(rules("```\nsimply\n```\nok")).toEqual([])
  })
})

describe("check:copy, words that only look alike", () => {
  test("a game changed, the next level", () => {
    expect(rules("It marks every game changed. Percent to next level.")).toEqual([])
    expect(rules("A game changer.")).toEqual(["a hype word"])
  })
})

describe("check:copy, interface files", () => {
  test("strings in double or single quotes are read", () => {
    expect(rules('title: "A seamless experience",', true)).toEqual(["a hype word"])
    expect(rules("title: 'C\\'est vraiment rapide',", true)).toEqual(["a filler adverb"])
  })

  test("JSX text is read, attributes and code are not", () => {
    expect(rules('<p className="mt-2">Boostez votre code</p>', true)).toEqual(["a hype word"])
    expect(rules("const seamless = 1", true)).toEqual([])
  })

  test("a dash used as a pause is refused in a string, a range is not", () => {
    expect(rules('hint: "Saved — reload",', true)).toEqual(["a dash used as a pause"])
    expect(rules('range: "2 – 5",', true)).toEqual([])
  })

  test("the words the writing rules list are all refused", () => {
    for (const w of ["fluide", "puissant", "découvrez", "seamless", "leverage", "powerful"])
      expect(rules(`A ${w} tool.`)).toEqual(["a hype word"])
  })
})

describe("check:copy, review of the fixes", () => {
  test("a French exclamation after its no-break space is refused", () => {
    expect(rules("thanks: 'Merci\u00a0! Ce portfolio est en ligne.',", true)).toEqual(["an exclamation mark"])
  })

  test("Tailwind's important modifier is not an exclamation", () => {
    expect(rules('<div className="hover:bg-secondary! p-2">Ok</div>', true, true)).toEqual([])
  })

  test("JSX text on its own line, or around an expression, is read", () => {
    expect(rules("    A seamless way to bill", true, true)).toEqual(["a hype word"])
    expect(rules("<p>Track {count} magical hours</p>", true, true)).toEqual(["a hype word"])
    expect(rules("    return null", true, true)).toEqual([])
    expect(rules("{/* Split out\n   at rates — cache reads\n*/}", true, true)).toEqual([])
  })

  test("a text star is not an emoji", () => {
    expect(rules("stars: '{n} \u2605',", true)).toEqual([])
  })
})

describe("check:copy, opt-out", () => {
  test("a line that says why keeps its word", () => {
    expect(rules('vote: "Most 👍 first", // copy: names the GitHub reaction', true)).toEqual([])
    expect(rules("The 👍 count <!-- copy: GitHub's reaction -->")).toEqual([])
  })
})
