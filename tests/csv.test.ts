import { describe, expect, test } from "bun:test"

import { readCsv } from "../src/lib/csv"

const rows = (text: string, wanted: string[]) => {
  const out: string[][] = []
  readCsv(text, wanted, (r) => out.push(r))
  return out
}

describe("readCsv", () => {
  test("keeps only the wanted columns, in the order asked", () => {
    const text = "time,ip,channel,city\n2023-01-01,1.2.3.4,kamet0,Paris\n"
    expect(rows(text, ["channel", "time"])).toEqual([["kamet0", "2023-01-01"]])
  })

  test("a column missing from the header comes back empty", () => {
    expect(rows("a,b\n1,2\n", ["b", "nope"])).toEqual([["2", ""]])
  })

  test("reads quoted fields with commas, doubled quotes and line breaks", () => {
    const text = 'msg,channel\n"hi, ""you""\nthere",abc\r\n'
    expect(rows(text, ["msg", "channel"])).toEqual([['hi, "you"\nthere', "abc"]])
  })

  test("skips a byte order mark and blank lines, reads a last line without newline", () => {
    expect(rows("﻿a,b\n1,2\n\n3,4", ["a", "b"])).toEqual([
      ["1", "2"],
      ["3", "4"],
    ])
  })
})
