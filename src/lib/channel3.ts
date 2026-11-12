import { Channel3 } from "@channel3/sdk";
import type { ProductRecommendation } from "@/lib/agents/types";

const CHANNEL3_API = process.env.CHANNEL3_API_BASE_URL || "https://api.trychannel3.com/v1";
let client: Channel3 | undefined;

export class Channel3ConfigurationError extends Error {
  constructor() {
    super("Channel3 is ready to connect. Add CHANNEL3_API_KEY to enable live product research.");
    this.name = "Channel3ConfigurationError";
  }
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validHttpsUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function priceAmount(value: unknown) {
  const price = record(value);
  const raw = price.price ?? price.amount;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseProducts(products: unknown[], maxPrice: number, currency: string, rationale: string, searchIntent: string) {
  return products.flatMap((entry): ProductRecommendation[] => {
    const product = record(entry);
    const images = Array.isArray(product.images) ? product.images.map(record) : [];
    const mainImage = images.find((image) => image.is_main_image === true) ?? images[0];
    const offers = Array.isArray(product.offers) ? product.offers.map(record) : [];
    const eligible = offers
      .map((offer) => {
        const price = record(offer.price);
        return {
          offer,
          amount: priceAmount(price),
          currency: text(price.currency) || currency,
          url: validHttpsUrl(offer.url),
          availability: text(offer.availability) || "Availability unknown",
        };
      })
      .filter(({ amount, url, availability }) => Boolean(url) && amount > 0 && amount <= maxPrice && !/out.?of.?stock/i.test(availability))
      .sort((a, b) => Number(b.currency === currency) - Number(a.currency === currency) || a.amount - b.amount);
    const best = eligible[0];
    if (!best) return [];
    const features = Array.isArray(product.key_features) ? product.key_features.map(text).filter(Boolean).slice(0, 3) : [];
    return [{
      id: text(product.id) || crypto.randomUUID(),
      title: text(product.title) || "Thoughtful gift",
      description: text(product.description).slice(0, 360),
      imageUrl: validHttpsUrl(mainImage?.cleaned_url) || validHttpsUrl(mainImage?.url),
      imageAlt: text(mainImage?.alt_text) || text(product.title),
      price: best.amount,
      currency: best.currency,
      availability: best.availability,
      retailer: text(best.offer.domain) || new URL(best.url!).hostname.replace(/^www\./, ""),
      buyUrl: best.url!,
      keyFeatures: features,
      rationale,
      matchScore: 0,
      matchReasons: [],
      searchIntent,
    }];
  });
}

export async function searchChannel3Products(input: {
  query: string;
  maxPrice: number;
  currency?: string;
  userId: string;
  rationale: string;
  searchIntent?: string;
  limit?: number;
}) {
  const apiKey = process.env.CHANNEL3_API_KEY?.trim();
  if (!apiKey) throw new Channel3ConfigurationError();
  const currency = input.currency || "GBP";
  client ??= new Channel3({
    apiKey,
    baseUrl: CHANNEL3_API.replace(/\/v1\/?$/, ""),
    country: "GB",
    currency: "GBP",
    language: "en",
    timeoutInSeconds: 20,
    maxRetries: 2,
  });
  const page = await client.products.search({
      "x-user-id": input.userId,
      query: input.query,
      config: { mode: "agentic", country: "GB", currency: "GBP", language: "en", offer_refresh_timeout_ms: 3_000 },
      filters: { price: { max_price: input.maxPrice }, availability: ["InStock"] },
      limit: Math.min(12, Math.max(3, input.limit || 6)),
    }, { timeoutInSeconds: 20, maxRetries: 2 });
  return parseProducts(page.data as unknown[], input.maxPrice, currency, input.rationale, input.searchIntent || "Agentic search").slice(0, input.limit || 6);
}
