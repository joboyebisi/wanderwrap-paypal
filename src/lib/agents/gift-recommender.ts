import { askSpecialist } from "./bedrock-runtime";
import type { GiftProfile, GiftSearchBrief, GiftSignal, ProductRecommendation } from "./types";

const LEXICON: Array<{ pattern: RegExp; label: string; kind: GiftSignal["kind"] }> = [
  { pattern: /photo|camera|film|portrait/i, label: "photography", kind: "interest" },
  { pattern: /travel|trip|holiday|explor|adventure/i, label: "travel and discovery", kind: "interest" },
  { pattern: /hike|walking|outdoor|camp/i, label: "the outdoors", kind: "interest" },
  { pattern: /cook|bake|food|coffee|tea/i, label: "food and drink rituals", kind: "interest" },
  { pattern: /book|read|novel|poetry/i, label: "books and reading", kind: "interest" },
  { pattern: /music|concert|vinyl|guitar/i, label: "music", kind: "interest" },
  { pattern: /art|paint|draw|potter|ceramic|craft/i, label: "creative making", kind: "interest" },
  { pattern: /garden|plant|flower/i, label: "plants and gardening", kind: "interest" },
  { pattern: /fitness|gym|run|yoga|sport/i, label: "movement and wellbeing", kind: "interest" },
  { pattern: /tech|gadget|gaming|game/i, label: "technology and games", kind: "interest" },
  { pattern: /minimal|simple|clean|neutral/i, label: "minimal", kind: "style" },
  { pattern: /colour|color|bright|bold|playful/i, label: "colourful and playful", kind: "style" },
  { pattern: /cosy|cozy|warm|homebody/i, label: "cosy", kind: "style" },
  { pattern: /vintage|retro|classic/i, label: "vintage", kind: "style" },
  { pattern: /practical|useful|functional/i, label: "practicality", kind: "value" },
  { pattern: /sentimental|memory|personal|meaningful/i, label: "sentiment and memory", kind: "value" },
  { pattern: /sustainab|eco|ethical/i, label: "sustainability", kind: "value" },
  { pattern: /experience|workshop|class|day out/i, label: "experiences over objects", kind: "value" },
];

const unique = (values: string[], limit = 8) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
const SENSITIVE = /religio|politic|sexual|gender identity|race|ethnic|disab|diagnos|health|medical|pregnan|income|debt|financial status|precise location|address/i;

function jsonObject(raw: string | null) {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as Record<string, unknown>; } catch { return null; }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? unique(value.filter((item): item is string => typeof item === "string" && !SENSITIVE.test(item)), 6) : [];
}

function safeConfidence(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}

export async function buildGiftProfile(input: { recipient: string; occasion: string; publicClues: string }) {
  const deterministicSignals: GiftSignal[] = LEXICON
    .filter(({ pattern }) => pattern.test(input.publicClues))
    .map(({ label, kind }) => ({ label, kind, confidence: 0.78, evidence: `Organiser supplied a clue related to ${label}.` }));
  const modelResult = jsonObject(await askSpecialist("recipient-insight", `
Create an evidence-bound gift profile for ${input.recipient}'s ${input.occasion}.
Use only the organiser-approved text below. Do not diagnose personality, infer protected or sensitive traits, or add demographic assumptions.
Return JSON only with: summary (string), interests (string[]), styles (string[]), values (string[]), constraints (string[]), avoid (string[]), confidence (0..1).
Approved text: ${input.publicClues}
`));
  const inferred = {
    interests: stringArray(modelResult?.interests),
    styles: stringArray(modelResult?.styles),
    values: stringArray(modelResult?.values),
    constraints: stringArray(modelResult?.constraints),
    avoid: stringArray(modelResult?.avoid),
  };
  const byKind = (kind: GiftSignal["kind"]) => deterministicSignals.filter((signal) => signal.kind === kind).map((signal) => signal.label);
  const interests = unique([...byKind("interest"), ...inferred.interests]);
  const styles = unique([...byKind("style"), ...inferred.styles]);
  const values = unique([...byKind("value"), ...inferred.values]);
  const constraints = unique([...byKind("constraint"), ...inferred.constraints]);
  const avoid = unique([...byKind("avoid"), ...inferred.avoid]);
  const fallbackSummary = unique([...interests, ...styles, ...values], 4).join(", ") || "a thoughtful gift with broad appeal";
  const confidence = safeConfidence(modelResult?.confidence, deterministicSignals.length ? 0.72 : 0.45);
  const profile: GiftProfile = {
    summary: typeof modelResult?.summary === "string" && !SENSITIVE.test(modelResult.summary) ? modelResult.summary.slice(0, 320) : `${input.recipient} appears to value ${fallbackSummary}.`,
    interests,
    styles,
    values,
    constraints,
    avoid,
    signals: deterministicSignals,
    confidence,
    generatedAt: new Date().toISOString(),
  };
  return profile;
}

export async function planGiftSearches(input: { recipient: string; occasion: string; budget: number; profile: GiftProfile }) {
  const core = unique([...input.profile.interests, ...input.profile.styles, ...input.profile.values], 5);
  const modelResult = jsonObject(await askSpecialist("gift-curator", `
Plan three diverse product-search briefs for a ${input.occasion} gift under GBP ${input.budget}.
Gift profile: ${JSON.stringify(input.profile)}
Return JSON only: {"queries":[{"label":"...","query":"..."}]}. Queries must be concrete product discovery requests, safe, and must not include protected traits.
`));
  const proposed = Array.isArray(modelResult?.queries) ? modelResult.queries.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.query !== "string" || !entry.query.trim()) return [];
    return [{ id: `agent-${index + 1}`, label: typeof entry.label === "string" ? entry.label.slice(0, 50) : `Agent direction ${index + 1}`, query: entry.query.slice(0, 500) }];
  }) : [];
  const fallback: GiftSearchBrief[] = [
    { id: "signature", label: "Best personality fit", query: `Thoughtful ${input.occasion} gift inspired by ${core.join(", ") || "their interests"}, under GBP ${input.budget}` },
    { id: "memorable", label: "Emotionally memorable", query: `Memorable personal gift for someone who values ${unique([...input.profile.values, ...input.profile.interests], 4).join(", ") || "meaningful experiences"}, under GBP ${input.budget}` },
    { id: "useful", label: "Beautifully useful", query: `High-quality useful gift matching ${unique([...input.profile.styles, ...input.profile.interests], 4).join(", ") || "a thoughtful modern style"}, under GBP ${input.budget}` },
  ];
  return (proposed.length >= 3 ? proposed : fallback).slice(0, 3);
}

function words(values: string[]) {
  return unique(values.flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/)).filter((value) => value.length > 3), 40);
}

export function rankAndDiversifyProducts(products: ProductRecommendation[], profile: GiftProfile, budget: number, limit = 6) {
  const profileWords = words([...profile.interests, ...profile.styles, ...profile.values]);
  const targetPrice = budget * 0.7;
  const scored = products.map((product) => {
    const haystack = `${product.title} ${product.description} ${product.keyFeatures.join(" ")}`.toLowerCase();
    const matches = profileWords.filter((word) => haystack.includes(word));
    const relevance = Math.min(1, matches.length / Math.max(2, Math.min(5, profileWords.length || 2)));
    const priceFit = Math.max(0, 1 - Math.abs(product.price - targetPrice) / Math.max(budget, 1));
    const quality = (product.imageUrl ? 0.5 : 0) + (product.keyFeatures.length ? 0.25 : 0) + (product.description ? 0.25 : 0);
    const matchScore = Math.round((relevance * 0.65 + priceFit * 0.2 + quality * 0.15) * 100);
    const matchReasons = unique([
      ...matches.slice(0, 2).map((match) => `Matches ${match}`),
      product.price <= budget * 0.8 ? "Leaves room in the Circle budget" : "Uses the Circle budget well",
      product.imageUrl ? "Clear product imagery" : "",
    ], 3);
    return { ...product, matchScore, matchReasons, rationale: matchReasons.length ? `${matchReasons.join(" · ")}.` : product.rationale };
  }).sort((a, b) => b.matchScore - a.matchScore || a.price - b.price);

  const selected: ProductRecommendation[] = [];
  const titleFamilies = new Set<string>();
  for (const product of scored) {
    const family = words([product.title]).slice(0, 2).join("-") || product.id;
    if (titleFamilies.has(family) && selected.length < Math.min(3, limit)) continue;
    titleFamilies.add(family);
    selected.push(product);
    if (selected.length === limit) break;
  }
  return selected;
}
