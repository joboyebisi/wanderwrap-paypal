"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductRecommendation } from "@/lib/agents/types";

interface PublicClaim {
  recipientName: string;
  occasion: string;
  amount: number;
  currency: string;
  payoutEnabled: boolean;
  messages: Array<{ from: string; message: string }>;
  recommendedProduct?: ProductRecommendation;
  recipientChoice?: "cash" | "gift";
}

export default function UnwrapClient({ token }: { token: string }) {
  const [stage, setStage] = useState(0);
  const [claim, setClaim] = useState<PublicClaim | null>(null);
  const [error, setError] = useState("");
  const [choiceMessage, setChoiceMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/claims/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "This gift could not be opened");
        setClaim(result.claim);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "This gift could not be opened"));
  }, [token]);

  async function chooseGift(choice: "cash" | "gift") {
    if (!claim) return;
    setBusy(true);
    setChoiceMessage("");
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(token)}/choice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your choice could not be saved");
      setClaim(result.claim);
      setChoiceMessage(result.message);
    } catch (reason) {
      setChoiceMessage(reason instanceof Error ? reason.message : "Your choice could not be saved");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <main className="unwrap-page"><section className="unwrap-intro"><span className="unwrap-brand">WanderWrap</span><div className="reveal-camera">🎀</div><h1>This ribbon has come loose.</h1><p>{error}</p><Link href="/">Open WanderWrap</Link></section></main>;
  if (!claim) return <main className="unwrap-page"><section className="unwrap-intro"><span className="unwrap-brand">WanderWrap</span><div className="reveal-camera">✦</div><p>Ribbon is preparing your private reveal…</p></section></main>;
  const messages = claim.messages.length ? claim.messages : [{ from: "Your Circle", message: `We came together to make your ${claim.occasion.toLowerCase()} feel extra special.` }];
  const product = claim.recommendedProduct;

  return <main className={`unwrap-page stage-${stage}`}>
    <div className="unwrap-sky"><i/><i/><i/></div>
    {stage === 0 && <section className="unwrap-intro">
      <span className="unwrap-brand">WanderWrap</span>
      <div className="parcel" onClick={() => setStage(1)} role="button" tabIndex={0} aria-label="Open your gift"><div className="parcel-ribbon"/><div className="parcel-bow">∞</div><span>For {claim.recipientName}</span></div>
      <p>A little something from your favourite people</p>
      <button onClick={() => setStage(1)}>Untie the ribbon <span>✦</span></button>
    </section>}
    {stage === 1 && <section className="message-reveal">
      <span className="reveal-step">A NOTE FROM {messages[0].from.toUpperCase()}</span>
      <blockquote>“{messages[0].message}”<cite>— {messages[0].from}</cite></blockquote>
      <button onClick={() => setStage(2)}>Keep unwrapping <span>→</span></button>
    </section>}
    {stage === 2 && <section className="gift-reveal choice-reveal">
      <span className="reveal-spark">✦</span><p>WRAPPED WITH YOUR CIRCLE</p><h1>Choose what feels<br/><em>most like you.</em></h1>
      <p className="gift-sub">Your Circle gathered £{claim.amount.toFixed(2)}. You stay in control of the final form.</p>
      <div className="recipient-choices">
        <button className={claim.recipientChoice === "cash" ? "recipient-choice chosen" : "recipient-choice"} disabled={busy} onClick={() => void chooseGift("cash")}>
          <span className="choice-emoji">💛</span><span><b>Take the money gift</b><small>£{claim.amount.toFixed(2)} through PayPal</small></span><i>{claim.recipientChoice === "cash" ? "✓" : "→"}</i>
        </button>
        {product && <button className={claim.recipientChoice === "gift" ? "recipient-choice product-choice chosen" : "recipient-choice product-choice"} disabled={busy} onClick={() => void chooseGift("gift")}>
          <span className="choice-image">{product.imageUrl ? <Image src={product.imageUrl} alt={product.imageAlt || product.title} width={82} height={82} unoptimized/> : "🎁"}</span>
          <span><b>{product.title}</b><small>{product.currency === "GBP" ? "£" : `${product.currency} `}{product.price.toFixed(2)} · {product.retailer}</small></span><i>{claim.recipientChoice === "gift" ? "✓" : "→"}</i>
        </button>}
      </div>
      {product && <div className="why-this-gift"><span>✨ HOW SCOUT FOUND THIS</span><p>{product.rationale}</p><small>Live retailer price and availability are rechecked before an organiser-approved purchase.</small></div>}
      {choiceMessage && <p className="choice-message">{choiceMessage}</p>}
      {claim.recipientChoice && <button className="continue-reveal" onClick={() => setStage(3)}>Read everyone’s messages <span>→</span></button>}
    </section>}
    {stage === 3 && <section className="message-wall">
      <p>YOUR PEOPLE, IN THEIR WORDS</p><h1>A Circle full<br/>of <em>love.</em></h1>
      <div>{messages.map(({ from, message }, index) => <blockquote key={`${from}-${index}`} style={{ transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}>“{message}”<cite>— {from}</cite></blockquote>)}</div>
      {claim.recipientChoice === "cash" && !claim.payoutEnabled && <p className="claim-boundary">Your cash preference is saved. No payout has been represented as complete; Penny will unlock the PayPal handoff only after the app receives the required Payouts scope.</p>}
      {claim.recipientChoice === "gift" && <p className="claim-boundary">Your gift preference is saved. Porter will recheck the live offer and ask the organiser to approve purchase—nothing has been ordered automatically.</p>}
      <Link href="/">Start a Circle for someone you love <span>→</span></Link>
    </section>}
  </main>;
}
