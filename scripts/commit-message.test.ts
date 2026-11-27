// Copied from 7IBO/socle, outils/scripts, at commit 27483aa (27/11).
import { describe, expect, test } from "bun:test"

import {
  checkAttribution,
  checkBody,
  checkBranch,
  checkCommitMessage,
  checkTitle,
} from "./commit-message"

describe("commit message", () => {
  test("a Conventional Commits header with a body and a footer", () => {
    expect(
      checkCommitMessage(
        "fix(worker): retry a refused batch at half its size\n\nSteam refuses 100 apps at once.\n\nRefs: THI-12\n"
      )
    ).toEqual([])
  })

  test("a breaking change and no scope", () => {
    expect(checkCommitMessage("feat!: drop the v0 profile URLs")).toEqual([])
  })

  test("git's own comments are ignored", () => {
    expect(
      checkCommitMessage(
        "docs: explain the deploy order\n# Please enter the commit message"
      )
    ).toEqual([])
  })

  test("the headers of the old French history are refused", () => {
    expect(
      checkCommitMessage(
        "Titres et résumés Steam dans les langues du site (THI-12)"
      )
    ).toHaveLength(1)
  })

  test("an unknown type, a period, a long header", () => {
    expect(checkCommitMessage("feature: add search")).toHaveLength(1)
    expect(checkCommitMessage("feat: add search.")).toHaveLength(1)
    expect(checkCommitMessage(`feat: ${"a".repeat(80)}`)).toHaveLength(1)
  })

  test("a platform's name may open the summary, scopes may be paths", () => {
    expect(checkCommitMessage("fix(steam): Steam batches of 50")).toEqual([])
    expect(checkCommitMessage("feat(db/migrations): add an index")).toEqual([])
  })

  test("Windows line endings", () => {
    expect(checkCommitMessage("fix: a\r\n\r\nbody\r\n")).toEqual([])
  })

  test("the diff below the scissors line of git commit -v is ignored", () => {
    expect(
      checkCommitMessage(
        "docs: explain the hook\n# ------------------------ >8 ------------------------\n+Co-Authored-By: Claude <noreply@anthropic.com>\nnot a message"
      )
    ).toEqual([])
  })

  test("the body is separated by a blank line", () => {
    expect(checkCommitMessage("feat: add search\nbody")).toHaveLength(1)
  })

  test("a dash used as a pause is refused, a range is not", () => {
    expect(
      checkCommitMessage("fix: keep the list\n\nThe list stays — always.")
    ).toHaveLength(1)
    expect(
      checkCommitMessage("fix: keep the list\n\nThe list stays – always.")
    ).toHaveLength(1)
    expect(
      checkCommitMessage("fix: keep the list\n\nYears 2010 – 2015 stay.")
    ).toEqual([])
    expect(
      checkCommitMessage("fix: keep the list\n\nSee `a — b` in the code.")
    ).toEqual([])
  })

  test("a pull request's body refuses a pause, not in the template's comments", () => {
    expect(checkBody("## Summary\n\nThe list stays — always.")).toHaveLength(1)
    expect(checkBody("<!-- a — b -->\n## Summary\n\nThe list stays.")).toEqual(
      []
    )
    expect(checkBody("<!--\na\n-->\nline — 4")[0]).toContain("line 4")
  })

  test("merges, reverts and fixups that git writes pass", () => {
    expect(checkCommitMessage("Merge branch 'main' into thi-1")).toEqual([])
    expect(checkCommitMessage('Revert "feat: add search"')).toEqual([])
    expect(checkCommitMessage("fixup! feat: add search")).toEqual([])
  })

  test("any credit to an AI assistant is refused", () => {
    for (const footer of [
      "Co-Authored-By: Claude <noreply@anthropic.com>",
      "Claude-Session: https://claude.ai/code/session_x",
      "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
    ])
      expect(checkCommitMessage(`fix: a\n\n${footer}`)).toHaveLength(1)
    expect(
      checkCommitMessage("Merge branch 'x'\n\nCo-Authored-By: Claude <a@b>")
    ).toHaveLength(1)
  })

  test("a message about the rule, naming no footer, is not a credit", () => {
    expect(
      checkCommitMessage(
        "fix: refuse assistant footers\n\nTrailers, session links and the requested-by block are refused."
      )
    ).toEqual([])
  })

  test("every footer a connector writes is refused, link or not", () => {
    for (const footer of [
      "Generated with Claude Code",
      "https://claude.com/code/session_1",
      "<!-- claude-projects-attribution: {} -->",
      "_Requested by **Thibault**_",
    ])
      expect(checkBody(`## Summary\n\nok\n\n${footer}`)).toHaveLength(1)
  })

  test("other assistants' trailers are refused too", () => {
    for (const footer of [
      "Co-authored-by: Cursor <cursoragent@cursor.com>",
      "Assisted-by: Claude",
      "Co-Authored-By: Gemini <x@google.com>",
    ])
      expect(checkCommitMessage(`fix: a\n\n${footer}`)).toHaveLength(1)
  })

  test("a header that only starts with Merge is checked", () => {
    expect(checkCommitMessage("Merge the two caches")).toHaveLength(1)
  })

  test("a human co-author is fine", () => {
    expect(
      checkCommitMessage("fix: a\n\nCo-Authored-By: Jane <jane@example.com>")
    ).toEqual([])
  })
})

describe("pull request title", () => {
  test("ends with its Linear issue", () => {
    expect(checkTitle("ci: check pull request titles (THI-12)")).toEqual([])
    expect(checkTitle("ci: check pull request titles")).toHaveLength(1)
  })

  test("refuses a dash used as a pause", () => {
    expect(checkTitle("fix: lists — and search (THI-12)")).toHaveLength(1)
  })

  test("may be longer than a commit header, up to 100", () => {
    expect(checkTitle(`feat: ${"a".repeat(80)} (THI-1)`)).toEqual([])
    expect(checkTitle(`feat: ${"a".repeat(95)} (THI-1)`)).toHaveLength(1)
  })
})

describe("pull request body", () => {
  test("the connector's footer is refused", () => {
    expect(
      checkAttribution(
        "## Summary\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_"
      )
    ).toHaveLength(1)
    expect(checkAttribution("## Summary\n\nRefs: THI-12")).toEqual([])
  })
})

describe("revert", () => {
  test("GitHub's Revert button: its title and its branch", () => {
    expect(checkTitle('Revert "ci: check titles (THI-12)"')).toEqual([])
    expect(
      checkBranch("revert-144-thibaultfayardpro/thi-12-ecrire-les-regles")
    ).toEqual([])
  })
})

describe("branch", () => {
  test("Linear's gitBranchName", () => {
    expect(
      checkBranch(
        "thibaultfayardpro/thi-12-ecrire-les-regles-de-contribution-et-les-modeles-de-pr"
      )
    ).toEqual([])
    // Linear keeps the underscores of a title (VERCEL_TOKEN).
    expect(
      checkBranch("thibaultfayardpro/thi-345-garder_un_secret-pour-main")
    ).toEqual([])
  })

  test("anything else, an assistant's prefix included", () => {
    expect(checkBranch("claude/project-thread-xhzx5f")).toHaveLength(1)
    expect(checkBranch("fix-search")).toHaveLength(1)
  })
})
