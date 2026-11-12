"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PublicClaim {
  recipientName: string;
  occasion: string;
  amount: number;
  currency: string;
  payoutEnabled: boolean;
  messages: Array<{ from: string; message: string }>;
}

export default function UnwrapClient({ token }: { token: string }) {
  const [stage, setStage] = useState(0);
  const [claim, setClaim] = useState<PublicClaim | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/claims/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "This gift could not be opened");
        setClaim(result.claim);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "This gift could not be opened"));
  }, [token]);

  if (error) return <main className="unwrap-page"><section className="unwrap-intro"><span className="unwrap-brand">WanderWrap</span><div className="reveal-camera">🎀</div><h1>This ribbon has come loose.</h1><p>{error}</p><Link href="/">Open WanderWrap</Link></section></main>;
  if (!claim) return <main className="unwrap-page"><section className="unwrap-intro"><span className="unwrap-brand">WanderWrap</span><div className="reveal-camera">✦</div><p>Ribbon is preparing your private reveal…</p></section></main>;
  const messages = claim.messages.length ? claim.messages : [{ from: "Your Circle", message: `We came together to make your ${claim.occasion.toLowerCase()} feel extra special.` }];

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
    {stage === 2 && <section className="gift-reveal">
      <span className="reveal-spark">✦</span><p>WRAPPED WITH YOUR CIRCLE</p><h1>A gift of<br/><em>£{claim.amount.toFixed(2)}</em></h1>
      <div className="reveal-camera">🎁</div><h2>{claim.occasion} money gift</h2>
      <p className="gift-sub">{claim.payoutEnabled ? "Ready for your secure PayPal claim" : "Your reveal is ready. Money release is safely paused while PayPal enables Payouts for WanderWrap."}</p>
      <button onClick={() => setStage(3)}>{claim.payoutEnabled ? "Continue to PayPal claim" : "Read everyone’s messages"}</button>
    </section>}
    {stage === 3 && <section className="message-wall">
      <p>YOUR PEOPLE, IN THEIR WORDS</p><h1>A Circle full<br/>of <em>love.</em></h1>
      <div>{messages.map(({ from, message }, index) => <blockquote key={`${from}-${index}`} style={{ transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}>“{message}”<cite>— {from}</cite></blockquote>)}</div>
      {!claim.payoutEnabled && <p className="claim-boundary">No payout has been represented as complete. Penny will unlock the PayPal handoff only after the app receives the required account scope.</p>}
      <Link href="/">Start a Circle for someone you love <span>→</span></Link>
    </section>}
  </main>;
}
