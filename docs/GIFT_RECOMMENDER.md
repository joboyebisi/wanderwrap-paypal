# WanderWrap evidence-bound gift recommender

## Why we replaced social personality scoring

The 2017 UCLA GiftHub project demonstrated a compelling interaction: enter a recipient, derive preference signals from their public posts, visualise those signals, and turn them into purchasable gift suggestions. Its implementation joined Twitter data, IBM Watson Personality Insights and eBay recommendations.

WanderWrap keeps the useful product insight—evidence can reduce gift-search cold start—but replaces the surveillance and psychological-labelling assumptions. It does not scrape Twitter, log into a recipient's account, assign Big Five or MBTI labels, or treat inferred personality as fact. The organiser supplies a permitted excerpt or description, explicitly confirms consent, and can see the bounded profile that drives recommendations.

Reference: [UCLA Hackers GiftHub](https://github.com/UCLA-Hackers/twitter-watson-personality-insights) (Apache-2.0). WanderWrap's implementation is new TypeScript code and does not copy GiftHub source.

## Agent pipeline

```text
approved public clues
        │
        ▼
Sage · evidence-bound profile
  interests · styles · gift values · constraints · exclusions · confidence
        │
        ▼
Scout · three diverse search briefs
  strongest fit · emotionally memorable · beautifully useful
        │
        ▼
Channel3 · live GB/GBP catalog search
  in-stock · under hard budget · refreshed offers · attributed URLs
        │
        ▼
WanderWrap deterministic ranker
  65% relevance · 20% price proximity · 15% catalog quality
  + deduplication and shortlist diversity
        │
        ▼
explainable product cards → organiser choice → contribution → recipient choice
```

The architecture deliberately separates language-model judgement from deterministic constraints. Amazon Bedrock helps Sage summarise evidence and helps Scout phrase diverse queries. Application code enforces consent, maximum price, stock, locale, deduplication, scoring, attribution and approval boundaries.

## Ranking model

WanderWrap treats first-use gift recommendation as constrained content matching, not collaborative filtering: there is no trustworthy purchase or rating history yet. This follows a useful pattern from the open-source [Giftly recommendation system](https://github.com/ranatsa9/gift-recommendation-system): apply hard constraints before scoring, keep relevance dominant, add price proximity, and diversify the final list.

For an eligible product \(p\):

$$
score(p) = 0.65R_p + 0.20B_p + 0.15Q_p
$$

- \(R_p\): overlap between evidence-bound profile terms and product title, description and features;
- \(B_p\): proximity to 70% of the maximum Circle budget, without allowing price to rescue an irrelevant product;
- \(Q_p\): image, description and structured-feature completeness.

The system returns fewer products when it cannot find credible in-stock matches. It never presents a fabricated fallback as a live retailer product.

## Agentic and deterministic responsibilities

| Component | May infer or propose | Must not do |
| --- | --- | --- |
| Sage | gift interests, style cues, values, constraints and uncertainty | diagnose personality or infer protected traits |
| Scout | multiple concrete search strategies | change the budget or buy a product |
| Channel3 | retrieve products, offers, images and attributed links | receive the recipient's identity or API key in the browser |
| Ranker | filter, score, deduplicate and diversify | override hard price/stock constraints |
| Porter | recheck the selected offer and prepare an order plan | purchase without organiser approval |
| Ribbon | explain why the gift fits during unwrapping | claim a purchase or payout completed when it did not |

## Privacy and retention

- The optional source URL is provenance only; WanderWrap does not fetch it.
- Only organiser-supplied gift evidence enters the profile.
- Confidence is displayed because sparse text is uncertain.
- The stable Channel3 attribution value is the internal Circle ID, not a Telegram username or recipient identity.
- Product price and availability are revalidated before a future approved purchase.
- The Channel3 key is server-only in `.env.local` and AWS Secrets Manager.

## Evaluation set

Before production, maintain labelled examples covering:

- budget and stock constraint violations: target `0`;
- protected-trait or psychological-diagnosis leakage: target `0`;
- irrelevant lexical collisions such as “canvas”, “foundation”, or “watch”: target `0` in the top three;
- shortlist diversity across product families;
- Precision@3 and NDCG@6 against human gift judgements;
- explanation faithfulness: every stated match reason must trace to approved evidence or product data;
- empty-result honesty and provider-failure recovery;
- replay safety and Channel3 credit usage.

## Relevant research

- [A Survey on Personality-Aware Recommendation Systems](https://arxiv.org/abs/2101.12153) describes the cold-start benefit and the accuracy/privacy risks of inferred personality.
- [Channel3 API skill](https://github.com/channel3-ai/skills/tree/main/skills/channel3-api) documents agentic search, GB/GBP locale configuration, live offers, attribution and server-side API-key handling.
- [Giftly](https://github.com/ranatsa9/gift-recommendation-system) documents constraint-first filtering, relevance-dominant reranking and shortlist diversification for gift discovery.
