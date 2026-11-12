"use client";

import { useState } from "react";
import Link from "next/link";

export default function UnwrapPage() {
  const [stage, setStage] = useState(0);
  const messages = [
    ["Maya", "For all the trips still to come — and every tiny moment worth keeping."],
    ["Jamie", "You make ordinary days feel like adventures. Happy birthday, Sarah."],
    ["Noah", "Can’t wait to see what you capture next. We love you loads!"],
  ];

  return <main className={`unwrap-page stage-${stage}`}>
    <div className="unwrap-sky"><i/><i/><i/></div>
    {stage === 0 && <section className="unwrap-intro">
      <span className="unwrap-brand">WanderWrap</span>
      <div className="parcel" onClick={() => setStage(1)} role="button" tabIndex={0} aria-label="Open your gift"><div className="parcel-ribbon"/><div className="parcel-bow">∞</div><span>For Sarah</span></div>
      <p>A little something from your favourite people</p>
      <button onClick={() => setStage(1)}>Untie the ribbon <span>✦</span></button>
    </section>}
    {stage === 1 && <section className="message-reveal">
      <span className="reveal-step">1 OF {messages.length}</span>
      <blockquote>“{messages[0][1]}”<cite>— {messages[0][0]}</cite></blockquote>
      <div className="message-dots"><b/><i/><i/></div>
      <button onClick={() => setStage(2)}>Keep unwrapping <span>→</span></button>
    </section>}
    {stage === 2 && <section className="gift-reveal">
      <span className="reveal-spark">✦</span><p>WITH LOVE FROM 8 FRIENDS</p><h1>Your next adventure<br/>starts <em>here.</em></h1>
      <div className="reveal-camera">📸</div><h2>Instant camera bundle</h2><p className="gift-sub">Wrapped, ordered and on its way to you</p>
      <button onClick={() => setStage(3)}>Read everyone’s messages</button>
    </section>}
    {stage === 3 && <section className="message-wall">
      <p>YOUR PEOPLE, IN THEIR WORDS</p><h1>A Circle full<br/>of <em>love.</em></h1>
      <div>{messages.map(([name, message], i) => <blockquote key={name} style={{transform:`rotate(${i%2?1.5:-1.5}deg)`}}>“{message}”<cite>— {name}</cite></blockquote>)}</div>
      <Link href="/">Start a Circle for someone you love <span>→</span></Link>
    </section>}
  </main>;
}
