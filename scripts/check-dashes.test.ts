// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
import { describe, expect, test } from "bun:test"

import { pauseLines } from "./pause-dash"

describe("check:dashes", () => {
  test("a long dash used as a pause is refused", () => {
    expect(pauseLines("The worker reads it — once a day.")).toHaveLength(1)
  })

  test("an en dash between two words is refused, a range is not", () => {
    expect(pauseLines("Previous – Videos")).toHaveLength(1)
    expect(pauseLines("Calls 2–5 a second, years 2010 – 2015.")).toEqual([])
  })

  test("a quote or a code span keeps its dash", () => {
    expect(pauseLines('They wrote: "not reliable — it reflects".')).toEqual([])
    expect(pauseLines("Run `a — b` here.")).toEqual([])
    expect(pauseLines("« une pause — ici »")).toEqual([])
  })

  test("a word, a parenthesis or a quote before an en dash makes it a pause", () => {
    expect(pauseLines('See "Settings" – then save.')).toHaveLength(1)
    expect(pauseLines("Open `x` – then save.")).toHaveLength(1)
    expect(pauseLines("The list (PS5) – kept.")).toHaveLength(1)
    expect(pauseLines("Patch 8.2 – possibly")).toHaveLength(1)
  })

  test("a fenced code block keeps its dashes", () => {
    expect(pauseLines("```\na — b\n```\nok")).toEqual([])
    expect(pauseLines("```\nok\n```\nnot — ok")[0]?.line).toBe(4)
  })

  test("a fence closes only with its own marker", () => {
    expect(pauseLines("```\n~~~\na — b\n```\nnot — ok")).toEqual([
      { line: 5, text: "not — ok" },
    ])
  })

  test("an en dash at a line's edge is a pause", () => {
    expect(pauseLines("The worker reads it –\nonce a day.")).toHaveLength(1)
    expect(pauseLines("– once a day.")).toHaveLength(1)
    expect(pauseLines("from 2010 –\n2015")).toEqual([])
  })

  test("the finding names its line", () => {
    expect(pauseLines("ok\nnot ok — here")[0]?.line).toBe(2)
  })
})
