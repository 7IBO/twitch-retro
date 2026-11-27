import { describe, expect, test } from "bun:test"

import { fromOtherSite } from "../server/guard"
import { relayImage } from "../server/img"

const req = (headers: Record<string, string>) =>
  new Request("https://twitchretro.7ibo.dev/api/enrich", { method: "POST", headers })

describe("fromOtherSite", () => {
  test("lets the site's own pages and scripts without an origin through", () => {
    expect(fromOtherSite(req({}))).toBe(false)
    expect(fromOtherSite(req({ origin: "https://twitchretro.7ibo.dev" }))).toBe(false)
    expect(fromOtherSite(req({ "sec-fetch-site": "same-origin" }))).toBe(false)
  })

  test("refuses a page on another site", () => {
    expect(fromOtherSite(req({ origin: "https://example.com" }))).toBe(true)
    expect(fromOtherSite(req({ "sec-fetch-site": "cross-site" }))).toBe(true)
    expect(fromOtherSite(req({ origin: "not a url" }))).toBe(true)
  })
})

describe("relayImage", () => {
  test("refuses anything but https images from the four CDNs, without fetching", async () => {
    for (const u of [
      null,
      "nope",
      "http://static-cdn.jtvnw.net/a.png",
      "https://example.com/a.png",
      "https://static-cdn.jtvnw.net.example.com/a.png",
      "https://169.254.169.254/latest/meta-data",
    ]) {
      const r = await relayImage(u)
      expect([400, 403]).toContain(r.status)
    }
  })
})
