"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CircleCampaign } from "@/lib/agents/types";

type Tab = "circle" | "ideas" | "moments";

const people = [
  { name: "Maya", initials: "MA", colour: "coral", amount: 20 },
  { name: "Jamie", initials: "JA", colour: "blue", amount: 20 },
  { name: "Noah", initials: "NO", colour: "green", amount: 20 },
  { name: "Priya", initials: "PR", colour: "gold", amount: 20 },
  { name: "Alex", initials: "AL", colour: "violet", amount: 20 },
  { name: "You", initials: "YO", colour: "pink", amount: 20 },
];

const giftIdeas = [
  { emoji: "📸", name: "Instant camera bundle", price: 145, fit: "Best match", reason: "Perfect for Sarah’s travels and making tangible memories." },
  { emoji: "🧳", name: "Travel accessories set", price: 120, fit: "Great value", reason: "A thoughtful upgrade for her next weekend away." },
  { emoji: "🎟️", name: "Photography experience", price: 150, fit: "Most memorable", reason: "A creative day out she can enjoy and learn from." },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("circle");
  const [sheet, setSheet] = useState<"contribute" | "invite" | "create" | null>(null);
  const [amount, setAmount] = useState("20");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [contributed, setContributed] = useState(false);
  const [firstName, setFirstName] = useState("Jo");
  const [agentRunning, setAgentRunning] = useState(false);
  const [campaign, setCampaign] = useState<CircleCampaign | null>(null);
  const [agentMessage, setAgentMessage] = useState("I can coordinate the whole gift — with your approval at every important step.");
  const [showAgentTeam, setShowAgentTeam] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    const telegramName = webApp?.initDataUnsafe?.user?.first_name;
    if (telegramName) setFirstName(telegramName);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("token");
    if (!orderId || params.get("capture") !== "1") return;
    setBusy(true);
    fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        setContributed(true);
        showToast("Contribution received — thank you! 🎉");
        window.history.replaceState({}, "", "/");
      })
      .catch((error) => showToast(error.message || "We could not confirm that payment"))
      .finally(() => setBusy(false));
  }, [showToast]);

  const raised = contributed ? 140 : 120;
  const supporters = contributed ? 7 : 6;
  const progress = Math.round((raised / 160) * 100);
  const validAmount = useMemo(() => Number(amount) >= 1 && Number(amount) <= 500, [amount]);

  async function contribute() {
    if (!validAmount) return;
    window.Telegram?.WebApp.HapticFeedback?.impactOccurred("medium");
    setBusy(true);
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), "X-WanderWrap-Member": "telegram-demo-user" },
        body: JSON.stringify({ amount, circleId: "sarah-birthday" }),
      });
      const order = await response.json();
      if (!response.ok) {
        if (order.error === "PayPal is not configured") {
          setContributed(true);
          setSheet(null);
          showToast("Demo contribution added — connect PayPal to go live");
          return;
        }
        throw new Error(order.error || "Could not start PayPal checkout");
      }
      const approval = order.links?.find((link: { rel: string; href: string }) => link.rel === "payer-action" || link.rel === "approve");
      if (!approval?.href) throw new Error("PayPal approval link was missing");
      window.Telegram?.WebApp.openLink(approval.href) ?? window.location.assign(approval.href);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function shareCircle() {
    const shareText = "Join our WanderWrap Circle for Sarah’s birthday 🎁";
    if (navigator.share) {
      await navigator.share({ title: "Sarah’s birthday Circle", text: shareText, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Circle link copied");
    }
  }

  async function runAgentTeam() {
    setAgentRunning(true);
    setAgentMessage("Wrap is bringing the right specialists into the Circle…");
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "telegram-demo-friday-friends",
          actorId: "organiser-demo",
          prompt: "Create a birthday Circle for Sarah next Friday with eight friends and a £160 budget",
          consentToAnalyse: true,
          messageHistory: [
            "Sarah always brings her little film camera on our trips",
            "She loved the Lisbon photo walk and wants to travel more",
            "She keeps the postcards and prints from every holiday",
          ],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCampaign(result.campaign);
      setAgentMessage(result.reply);
      setShowAgentTeam(true);
      showToast("Agent plan ready for your approval");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The agent team could not start");
    } finally {
      setAgentRunning(false);
    }
  }

  async function approveFunding() {
    if (!campaign?.pendingApproval) return;
    const response = await fetch("/api/agent/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id, approval: campaign.pendingApproval }),
    });
    const result = await response.json();
    if (response.ok) { setCampaign(result.campaign); setAgentMessage("Funding is open. Penny will quietly track completed PayPal captures while Rally keeps the group moving."); showToast("PayPal funding opened"); }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button className="brand" onClick={() => setTab("circle")} aria-label="WanderWrap home">
          <span className="brand-mark"><span>W</span></span>
          <span>WanderWrap</span>
        </button>
        <button className="avatar avatar-user" aria-label={`${firstName}'s profile`}>{firstName.slice(0, 1).toUpperCase()}</button>
      </header>

      <section className="content">
        {tab === "circle" && (
          <>
            <div className="eyebrow-row">
              <span className="eyebrow"><i /> LIVE CIRCLE</span>
              <button className="icon-button" onClick={() => setSheet("invite")} aria-label="Share circle">↗</button>
            </div>
            <div className="hero-copy">
              <p className="occasion">SARAH’S BIRTHDAY · 7 DAYS</p>
              <h1>Let’s make her<br /><em>day.</em></h1>
              <p>One thoughtful gift, from all of you.</p>
            </div>

            <section className="agent-console">
              <div className="agent-console-head">
                <div className="wrap-orb">W<span>✦</span></div>
                <div><span>WRAP · CIRCLE CONDUCTOR</span><b>{agentRunning ? "Coordinating your agent team…" : campaign ? "Your Circle is in motion" : "Ready when your group is"}</b></div>
                <button onClick={() => setShowAgentTeam(!showAgentTeam)} aria-label="Show agent team">{showAgentTeam ? "−" : "+"}</button>
              </div>
              <p>{agentMessage}</p>
              {!campaign && <button className="agent-action" onClick={runAgentTeam} disabled={agentRunning}>{agentRunning ? "Thinking together…" : "Let Wrap coordinate this Circle"}<span>✦</span></button>}
              {campaign?.pendingApproval === "open_funding" && <div className="approval-box"><div><span>YOUR APPROVAL</span><b>Open £160 PayPal gift fund?</b><small>No one is charged automatically.</small></div><button onClick={approveFunding}>Approve</button></div>}
              {campaign && !campaign.pendingApproval && <div className="agent-success"><span>✓</span><div><b>Funding safely opened</b><small>Agents will update the group only when something changes.</small></div></div>}
              {showAgentTeam && <div className="agent-team">
                {[
                  ["✨", "Sage", "Recipient insight"], ["⌕", "Scout", "Gift curator"], ["◎", "Rally", "Group coordinator"],
                  ["P", "Penny", "PayPal treasury"], ["↗", "Porter", "Fulfilment"], ["🎀", "Ribbon", "Reveal director"],
                ].map(([icon, name, role], index) => <div key={name} className={campaign && index < 4 ? "complete" : ""}><span>{icon}</span><p><b>{name}</b><small>{role}</small></p><i>{campaign && index < 4 ? "✓" : "·"}</i></div>)}
              </div>}
            </section>

            <article className="gift-card">
              <div className="gift-visual" aria-hidden="true">
                <div className="sun-disc" />
                <div className="camera">
                  <span className="camera-flash" />
                  <span className="camera-lens"><i /></span>
                  <span className="camera-slot" />
                </div>
                <span className="spark spark-one">✦</span><span className="spark spark-two">✦</span>
              </div>
              <div className="gift-details">
                <div><span className="ai-pill">✦ WANDER AI PICK</span><h2>Instant camera bundle</h2></div>
                <span className="price">£145</span>
              </div>
              <p className="ai-note">“A little analogue magic for Sarah’s next big adventure.”</p>
              <button className="text-button" onClick={() => setTab("ideas")}>See why it’s a great match <span>→</span></button>
            </article>

            <section className="funding-card">
              <div className="funding-heading">
                <div><span>GIFT FUND</span><strong>£{raised} <small>of £160</small></strong></div>
                <span className="percentage">{progress}%</span>
              </div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="funding-meta">
                <span><b>{supporters}</b> friends are in</span>
                <span>£{160 - raised} to go</span>
              </div>
              <div className="people-row">
                <div className="avatar-stack">
                  {people.map((person) => <span key={person.name} className={`avatar ${person.colour}`} title={person.name}>{person.initials}</span>)}
                  {contributed && <span className="avatar mint">+1</span>}
                </div>
                <span className="tiny-note">Every contribution stays private</span>
              </div>
              <button className="primary-button" onClick={() => setSheet("contribute")}>{contributed ? "Contribute again" : "Add your contribution"}<span>↗</span></button>
              <button className="secondary-button" onClick={() => setSheet("invite")}>Invite the last two friends</button>
            </section>

            <section className="timeline-card">
              <div className="section-title"><div><span>WHAT HAPPENS NEXT</span><h3>All wrapped up by WanderWrap</h3></div><span className="mini-gift">🎁</span></div>
              <ol className="timeline">
                <li className="done"><span>✓</span><div><b>Gift chosen together</b><small>Instant camera bundle</small></div></li>
                <li className="active"><span>2</span><div><b>Circle completes the fund</b><small>£{160 - raised} left to reach the goal</small></div></li>
                <li><span>3</span><div><b>You give the final go-ahead</b><small>No purchase without approval</small></div></li>
                <li><span>4</span><div><b>We wrap, deliver & delight</b><small>With everyone’s messages inside</small></div></li>
              </ol>
            </section>
          </>
        )}

        {tab === "ideas" && (
          <section className="tab-page">
            <span className="eyebrow"><i /> WANDER AI SHORTLIST</span>
            <h1>Three ways to make<br />Sarah <em>smile.</em></h1>
            <p className="page-intro">Chosen for her love of photography, travel and trying something new.</p>
            <div className="idea-list">
              {giftIdeas.map((gift, index) => (
                <article className={index === 0 ? "idea-card selected" : "idea-card"} key={gift.name}>
                  <span className="idea-emoji">{gift.emoji}</span>
                  <div><span className="idea-fit">{gift.fit}</span><h2>{gift.name}</h2><p>{gift.reason}</p></div>
                  <strong>£{gift.price}</strong>
                </article>
              ))}
            </div>
            <button className="primary-button" onClick={() => setTab("circle")}>Keep the group’s pick <span>→</span></button>
          </section>
        )}

        {tab === "moments" && (
          <section className="tab-page moments-page">
            <span className="eyebrow"><i /> SECRET MESSAGE WALL</span>
            <h1>Made of little<br /><em>moments.</em></h1>
            <p className="page-intro">Notes will be tucked into Sarah’s digital reveal. She won’t see a thing until the big day.</p>
            <div className="message-grid">
              <blockquote className="note-yellow">“For all the trips still to come. Happy birthday!”<cite>— Maya</cite></blockquote>
              <blockquote className="note-pink">“Can’t wait to see what you capture next 📸”<cite>— Jamie</cite></blockquote>
              <button className="add-note" onClick={() => showToast("Message composer coming next")}>＋<span>Add your note</span></button>
            </div>
          </section>
        )}
      </section>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <button className={tab === "circle" ? "active" : ""} onClick={() => setTab("circle")}><span>◉</span>Circle</button>
        <button className={tab === "ideas" ? "active" : ""} onClick={() => setTab("ideas")}><span>✦</span>Gift ideas</button>
        <button className="create-button" onClick={() => setSheet("create")} aria-label="Create new Circle">＋</button>
        <button className={tab === "moments" ? "active" : ""} onClick={() => setTab("moments")}><span>♡</span>Moments</button>
        <button onClick={() => showToast("You’re viewing Sarah’s Circle")}><span>○</span>You</button>
      </nav>

      {sheet && (
        <div className="sheet-backdrop" onMouseDown={() => setSheet(null)}>
          <section className="sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className="sheet-handle" onClick={() => setSheet(null)} aria-label="Close" />
            {sheet === "contribute" && <>
              <span className="sheet-icon">🤝</span><h2>Chip in for Sarah</h2><p>Choose your amount. Only the total is shared with the group.</p>
              <label className="amount-field"><span>£</span><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" aria-label="Contribution amount" /></label>
              <div className="amount-pills">{[10, 20, 25, 40].map((value) => <button className={amount === String(value) ? "active" : ""} key={value} onClick={() => setAmount(String(value))}>£{value}</button>)}</div>
              <button className="paypal-button" disabled={!validAmount || busy} onClick={contribute}>{busy ? "Opening PayPal…" : <><b>Pay</b><i>Pal</i> · £{Number(amount || 0).toFixed(2)}</>}</button>
              <small className="secure-note">🔒 Secure checkout powered by PayPal</small>
            </>}
            {sheet === "invite" && <>
              <span className="sheet-icon">💌</span><h2>Bring the Circle together</h2><p>Share a private invite in Telegram. Sarah won’t be notified.</p>
              <button className="primary-button" onClick={shareCircle}>Share in Telegram <span>↗</span></button>
              <button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(window.location.href); showToast("Private link copied"); setSheet(null); }}>Copy private link</button>
            </>}
            {sheet === "create" && <>
              <span className="sheet-icon">✨</span><h2>Who are we celebrating?</h2><p>Tell Wander AI a little about them and we’ll do the thoughtful bit.</p>
              <label className="simple-field"><span>Their name</span><input placeholder="e.g. Sarah" /></label>
              <label className="simple-field"><span>Occasion</span><select defaultValue="Birthday"><option>Birthday</option><option>Wedding</option><option>Farewell</option><option>Graduation</option><option>Just because</option></select></label>
              <button className="primary-button" onClick={() => { setSheet(null); showToast("New Circle flow started"); }}>Start a Circle <span>→</span></button>
            </>}
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {busy && <div className="busy-bar" />}
    </main>
  );
}
