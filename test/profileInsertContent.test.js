import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProfileTipTapContent,
  getProfileFieldOptions,
} from "../src/pages/Project/ProductManagement/utils/profileInsertContent.js";

test("buildProfileTipTapContent inserts selected client fields", () => {
  const personas = {
    client: {
      primaryContact: { name: "Alex", email: "alex@example.com", role: "VP Product" },
      meta: { aiSummary: "" },
      smartFields: [],
    },
  };
  const doc = buildProfileTipTapContent("client", ["primaryContact"], personas);
  const text = JSON.stringify(doc);
  assert.match(text, /Alex/);
  assert.match(text, /Client profile/);
});

test("getProfileFieldOptions marks fields with values", () => {
  const options = getProfileFieldOptions("company", {
    name: "Acme",
    meta: { aiSummary: "" },
    smartFields: [{ id: "sf1", label: "ICP", value: "Mid-market SaaS" }],
  });
  const nameField = options.find((o) => o.id === "name");
  const smartField = options.find((o) => o.id === "smart:sf1");
  assert.equal(nameField?.hasValue, true);
  assert.equal(smartField?.hasValue, true);
});
