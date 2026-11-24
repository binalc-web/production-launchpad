/** @typedef {{ id: string, label: string, getValue: (persona: object) => string | null }} ProfileFieldDef */

import {
  CLIENT_PROFILE_FIELDS,
  COMPANY_PROFILE_FIELDS,
  PRODUCT_PROFILE_FIELDS,
  COMPETITOR_INSIGHT_FIELDS,
} from "./profileFields.js";

/** @param {string} text */
function paragraph(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  return { type: "paragraph", content: [{ type: "text", text: trimmed }] };
}

/** @param {number} level @param {string} text */
function heading(level, text) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text: String(text).trim() }],
  };
}

/** @param {string} label @param {string} value */
function labeledParagraph(label, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  return {
    type: "paragraph",
    content: [
      { type: "text", text: `${label}: `, marks: [{ type: "bold" }] },
      { type: "text", text: trimmed },
    ],
  };
}

function scalarFieldDefs(fields, prefix = "") {
  return fields.map(({ key, label }) => ({
    id: `${prefix}${key}`,
    label,
    getValue: (p) => p?.[key],
  }));
}

/** @type {Record<string, ProfileFieldDef[]>} */
export const PROFILE_FIELD_DEFS = {
  client: [
    {
      id: "aiSummary",
      label: "AI summary",
      getValue: (p) => p?.meta?.aiSummary,
    },
    {
      id: "primaryContact",
      label: "Primary contact",
      getValue: (p) => {
        const c = p?.primaryContact;
        if (!c) return null;
        return [c.name, c.role, c.email].filter(Boolean).join(" · ");
      },
    },
    ...scalarFieldDefs(CLIENT_PROFILE_FIELDS),
  ],
  company: [
    {
      id: "aiSummary",
      label: "AI summary",
      getValue: (p) => p?.meta?.aiSummary,
    },
    ...scalarFieldDefs(COMPANY_PROFILE_FIELDS),
  ],
  competitors: [
    {
      id: "aiSummary",
      label: "AI summary",
      getValue: (p) => p?.meta?.aiSummary,
    },
    {
      id: "items",
      label: "Competitors",
      getValue: (p) => {
        const items = Array.isArray(p?.items) ? p.items : [];
        if (!items.length) return null;
        return items
          .map((c) =>
            [c.name, c.website, c.targetSegment, c.pricingModel].filter(Boolean).join(" — "),
          )
          .join("\n");
      },
    },
    {
      id: "insights",
      label: "Competitor insights",
      getValue: (p) => {
        const ins = p?.insights;
        if (!ins) return null;
        return COMPETITOR_INSIGHT_FIELDS.map(({ key, label }) =>
          ins[key] ? `${label}: ${ins[key]}` : null,
        )
          .filter(Boolean)
          .join("\n");
      },
    },
  ],
  product: [
    {
      id: "aiSummary",
      label: "AI summary",
      getValue: (p) => p?.meta?.aiSummary,
    },
    ...scalarFieldDefs(PRODUCT_PROFILE_FIELDS),
    {
      id: "existingProducts",
      label: "Existing SaaS products",
      getValue: (p) => {
        const items = Array.isArray(p?.existingProducts) ? p.existingProducts : [];
        if (!items.length) return null;
        return items
          .map((item) => [item.name, item.website, item.description].filter(Boolean).join(" — "))
          .join("\n");
      },
    },
  ],
};

/** @param {object} persona @param {string[]} selectedFieldIds */
function smartFieldNodes(persona, selectedFieldIds) {
  const fields = Array.isArray(persona?.smartFields) ? persona.smartFields : [];
  const nodes = [];
  for (const sf of fields) {
    if (!selectedFieldIds.includes(`smart:${sf.id}`)) continue;
    const node = labeledParagraph(sf.label || "Smart field", sf.value);
    if (node) nodes.push(node);
  }
  return nodes;
}

/**
 * @param {string} personaType
 * @param {string[]} selectedFieldIds
 * @param {object} personas
 * @returns {{ type: "doc", content: object[] }}
 */
export function buildProfileTipTapContent(personaType, selectedFieldIds, personas) {
  const persona = personas?.[personaType];
  const defs = PROFILE_FIELD_DEFS[personaType] || [];
  const content = [];

  const typeLabel = personaType.charAt(0).toUpperCase() + personaType.slice(1);
  content.push(heading(2, `${typeLabel} profile`));

  for (const def of defs) {
    if (!selectedFieldIds.includes(def.id)) continue;
    const value = def.getValue(persona);
    const node = labeledParagraph(def.label, value || "");
    if (node) content.push(node);
  }

  content.push(...smartFieldNodes(persona, selectedFieldIds));

  if (content.length === 1) {
    content.push(paragraph("No profile data selected or available."));
  }

  return {
    type: "doc",
    content: content.filter(Boolean),
  };
}

/** @param {string} personaType @param {object} persona */
export function getProfileFieldOptions(personaType, persona) {
  const defs = PROFILE_FIELD_DEFS[personaType] || [];
  const base = defs.map((def) => ({
    id: def.id,
    label: def.label,
    hasValue: Boolean(String(def.getValue(persona) || "").trim()),
  }));
  const smartFields = (Array.isArray(persona?.smartFields) ? persona.smartFields : []).map(
    (sf) => ({
      id: `smart:${sf.id}`,
      label: sf.label || "Smart field",
      hasValue: Boolean(String(sf.value || "").trim()),
    }),
  );
  return [...base, ...smartFields];
}
