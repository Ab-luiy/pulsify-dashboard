import test from "node:test";
import assert from "node:assert/strict";
import { plainText } from "../functions/_shared/plain-text.js";

test("markdown symbols go, the words stay", () => {
  const raw = "**Hook**  \n*(look straight into camera, slight pause)*  \n“Ever wonder why?”\n\n## Body\n* one\n* two\n\n\n\n__Close__";
  assert.equal(plainText(raw), "Hook\n(look straight into camera, slight pause)\n“Ever wonder why?”\n\nBody\n- one\n- two\n\nClose");
  assert.equal(plainText("Risk 1 * 2 contracts"), "Risk 1 * 2 contracts", "a lone asterisk in a sentence stays");
});
