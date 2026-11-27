// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
import { describe, expect, test } from "bun:test"

import { issueIds, PR_REFERENCE } from "./check-ids"

// Built, never written out: this file is checked too.
const id = (n: number, key = "THI") => `${key}-${n}`

describe("check:ids", () => {
  test("an id in a comment, a test name or a doc is found, with its line", () => {
    expect(
      issueIds(`const a = 1\n// the cap (${id(78)})\ntest("${id(5)}: x")`)
    ).toEqual([
      { line: 2, id: id(78) },
      { line: 3, id: id(5) },
    ])
  })

  test("an id after an underscore or a dot is found", () => {
    expect(issueIds(`a_${id(12)} a.${id(3)}`)).toHaveLength(2)
  })

  test("a branch name in lowercase is found", () => {
    expect(issueIds(`git switch ${id(12, "thi")}-fix`)).toHaveLength(1)
  })

  test("words that only look alike are not", () => {
    expect(
      issueIds(`THI-NN, ${id(1, "WITHI")}, the THI- prefix, ${id(1, "ATHI")}`)
    ).toEqual([])
  })

  test("a pull request named by its number is found, a colour is not", () => {
    const pr = (n: number, word = "PR") => `${word} #${n}`
    expect(
      issueIds(
        `// read since ${pr(33)}\n// see ${pr(4, "pull request")}`,
        PR_REFERENCE
      )
    ).toHaveLength(2)
    const link = ["https://github.com", "7IBO", "koleko", "pull", "33"].join(
      "/"
    )
    expect(
      issueIds(
        `${pr(12, "issue")}, ${pr(8, "PR:")}, ${pr(7, "Pull Request ")}, ${link}`,
        PR_REFERENCE
      )
    ).toHaveLength(4)
    expect(issueIds("color: #333; // run #2 of 3", PR_REFERENCE)).toEqual([])
  })
})
