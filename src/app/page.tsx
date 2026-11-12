"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CircleCampaign } from "@/lib/agents/types";
import {
  initializeTelegram,
  openExternalLink,
  openTelegramDeepLink,
  shareTelegramURL,
  telegramAuthHeaders,
  telegramImpact,
} from "@/lib/telegram-client";

const TEST_CIRCLE = {
  recipient: "Sarah",
  occasion: "Birthday",
  eventDate: "2026-12-18",
  targetAmount: 10,
  expectedContributors: 1,
};

export default function Home() {
  const [campaign, setCampaign] = useState<CircleCampaign | null>(null);
  const [funding, setFunding] = useState({ total: 0, contributorCount: 0 });
  const [firstName, setFirstName] = useState("You");
  const [telegramReady, setTelegramReady] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalIdentity, setPaypalIdentity] = useState<{ name?: string; email?: string; verified?: boolean } | null>(null);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [circleLinks, setCircleLinks] = useState<{ miniApp: string; dmOptIn: string } | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const refreshFunding = useCallback(async (circleId: string) => {
    const response = await fetch(`/api/paypal/funding?circleId=${encodeURIComponent(circleId)}`, {
      headers: telegramAuthHeaders(),
    });
    if (response.ok) setFunding(await response.json());
  }, []);

  const loadCircle = useCallback(async (circleId?: string) => {
    const query = circleId ? `?circleId=${encodeURIComponent(circleId)}` : "";
    const response = await fetch(`/api/agent/campaign${query}`, { headers: telegramAuthHeaders() });
    if (!response.ok) return;
    const result = await response.json();
    if (result.campaign) {
      setCampaign(result.campaign);
      setCircleLinks(result.links);
      await refreshFunding(result.campaign.id);
    }
  }, [refreshFunding]);

  const refreshPayPalStatus = useCallback(async () => {
    const response = await fetch("/api/paypal/status", { headers: telegramAuthHeaders() });
    if (!response.ok) return false;
    const result = await response.json();
    setPaypalConnected(Boolean(result.connected));
    setPaypalIdentity(result.connected ? result : null);
    return Boolean(result.connected);
  }, []);

  useEffect(() => {
    void initializeTelegram().then(async ({ available, firstName: telegramName, startParam }) => {
      setTelegramReady(available);
      if (telegramName) setFirstName(telegramName);
      const paypalStatus = new URLSearchParams(window.location.search).get("paypal");
      const returnedFromPayPal = startParam === "paypal_connected" || paypalStatus === "connected";
      const paypalFailed = startParam === "paypal_error" || paypalStatus === "error";
      const linked = await refreshPayPalStatus();
      if (paypalFailed && !linked) showToast("PayPal login did not finish. Check the Sandbox app Return URL and Identity permissions, then try again.");
      let pendingCircleId: string | undefined;
      if (returnedFromPayPal && linked) {
        const pending = window.localStorage.getItem("wanderwrap:pending-contribution");
        if (pending) {
          try {
            const saved = JSON.parse(pending);
            if (saved.amount) setAmount(String(saved.amount));
            if (saved.circleId) pendingCircleId = String(saved.circleId);
            showToast(`PayPal linked — continue your £${Number(saved.amount || 0).toFixed(2)} contribution`);
          } catch { showToast("PayPal linked successfully"); }
        } else showToast("PayPal linked successfully");
      }
      const linkedCircleId = startParam?.startsWith("circle_")
        ? startParam.slice("circle_".length)
        : startParam?.startsWith("paid_")
          ? startParam.slice("paid_".length)
          : pendingCircleId;
      await loadCircle(linkedCircleId);
      if (startParam?.startsWith("paid_") || paypalStatus === "success") {
        setPaypalConnected(true);
        showToast("PayPal returned successfully. Confirming the capture…");
        window.setTimeout(() => void loadCircle(), 2500);
      }
    });
  }, [loadCircle, refreshPayPalStatus, showToast]);

  const target = campaign?.targetAmount ?? TEST_CIRCLE.targetAmount;
  const progress = Math.min(100, Math.round((funding.total / target) * 100));
  const fullyFunded = funding.total >= target;
  const validAmount = useMemo(() => Number(amount) >= 1 && Number(amount) <= 500, [amount]);
  const selectedGift = campaign?.gifts.find((gift) => gift.id === campaign.selectedGiftId) ?? campaign?.gifts[0];

  async function activateTestCircle() {
    setBusy(true);
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({
          ...TEST_CIRCLE,
          prompt: `Create a ${TEST_CIRCLE.occasion} Circle for ${TEST_CIRCLE.recipient} on ${TEST_CIRCLE.eventDate} with a £${TEST_CIRCLE.targetAmount} target for one contributor`,
          skipChatAnalysis: true,
          messageHistory: [],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not activate the Circle");
      setCampaign(result.campaign);
      await loadCircle(result.campaign.id);
      showToast("Your live sandbox Circle is ready");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not activate the Circle");
    } finally {
      setBusy(false);
    }
  }

  async function approveFunding() {
    if (!campaign?.pendingApproval) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({ campaignId: campaign.id, approval: campaign.pendingApproval }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Approval failed");
      setCampaign(result.campaign);
      showToast("Sandbox contributions are now open");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function connectPayPal() {
    setBusy(true);
    try {
      const response = await fetch("/api/paypal/connect", { method: "POST", headers: telegramAuthHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open PayPal");
      openExternalLink(result.url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not connect PayPal");
    } finally {
      setBusy(false);
    }
  }

  async function contribute() {
    if (!campaign || !validAmount) return;
    if (!paypalConnected) {
      window.localStorage.setItem("wanderwrap:pending-contribution", JSON.stringify({ circleId: campaign.id, amount }));
      showToast("Link PayPal first, then we’ll return you to this contribution");
      await connectPayPal();
      return;
    }
    telegramImpact();
    setBusy(true);
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), ...telegramAuthHeaders() },
        body: JSON.stringify({ amount, circleId: campaign.id }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Could not start PayPal checkout");
      const approval = order.links?.find((link: { rel: string; href: string }) => link.rel === "payer-action" || link.rel === "approve");
      if (!approval?.href) throw new Error("PayPal approval link was missing");
      window.localStorage.removeItem("wanderwrap:pending-contribution");
      openExternalLink(approval.href);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not start PayPal");
    } finally {
      setBusy(false);
    }
  }

  async function subscribeToUpdates() {
    if (!campaign) return;
    setBusy(true);
    try {
      const response = await fetch("/api/circles/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({ circleId: campaign.id }),
      });
      const result = await response.json();
      if (response.ok) {
        setSubscribed(true);
        showToast("Private Circle updates are on");
      } else if (result.requiresBotStart && result.dmUrl) {
        openTelegramDeepLink(result.dmUrl);
      } else throw new Error(result.error || "Could not enable updates");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not enable updates");
    } finally {
      setBusy(false);
    }
  }

  async function shareCircle() {
    if (!campaign || !circleLinks?.miniApp) return;
    const text = `Join ${campaign.recipient}’s ${campaign.occasion.toLowerCase()} Circle and contribute privately 🎁`;
    if (shareTelegramURL(circleLinks.miniApp, text)) return;
    if (navigator.share) await navigator.share({ title: `${campaign.recipient}’s WanderWrap Circle`, text, url: circleLinks.miniApp });
    else { await navigator.clipboard.writeText(circleLinks.miniApp); showToast("Circle link copied"); }
  }

  const displayed = campaign ?? TEST_CIRCLE;

  return <main className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand"><span className="brand-mark"><span>W</span></span><span>WanderWrap</span></button>
      <div className="topbar-actions">
        <button className={paypalConnected ? "paypal-status connected" : "paypal-status"} onClick={connectPayPal}><span>P</span>{paypalConnected ? "PayPal linked" : "Link PayPal"}</button>
        <span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span>
      </div>
    </header>

    <section className="content">
      {!telegramReady && <div className="live-notice">Open this page from WanderWrap’s Telegram menu to run the live test.</div>}

      <div className="eyebrow-row"><span className="eyebrow"><i/> 🎁 LIVE GIFT CIRCLE</span><span className="test-badge">🧪 SANDBOX</span></div>
      <div className="hero-copy">
        <p className="occasion">{displayed.recipient.toUpperCase()}’S {displayed.occasion.toUpperCase()} · {displayed.eventDate}</p>
        <h1>{firstName}, let’s make<br/><em>{displayed.recipient} smile.</em></h1>
        <p>You’re the first gifter in this Circle. Your sandbox contribution is the only amount that will move the total.</p>
        <div className="circle-chips"><span>🎯 £{target} goal</span><span>👤 1 gifter</span><span>🔒 Private amounts</span></div>
      </div>

      <section className="agent-console">
        <div className="agent-console-head"><div className="wrap-orb">W<span>✦</span></div><div><span>WRAP · CIRCLE CONDUCTOR</span><b>{campaign ? "Your Circle is ready" : "Ready to bring everyone together"}</b></div><button onClick={() => setShowDetails(!showDetails)}>{showDetails ? "−" : "+"}</button></div>
        <p>{campaign ? "Your Circle is live. Approve funding, share the invite, then make the first secure sandbox contribution." : `I’ve prepared a simple Circle for ${displayed.recipient}. Start it when you’re ready — no one is charged automatically.`}</p>
        {!campaign && <button className="agent-action" disabled={!telegramReady || busy} onClick={activateTestCircle}>{busy ? "Creating…" : `Start ${displayed.recipient}’s Circle`}<span>✨</span></button>}
        {campaign?.pendingApproval === "open_funding" && <div className="approval-box"><div><span>YOUR APPROVAL</span><b>Open the £{campaign.targetAmount} collection?</b><small>No charge occurs until you approve in PayPal.</small></div><button onClick={approveFunding}>Approve</button></div>}
        {campaign && !campaign.pendingApproval && <div className="agent-success"><span>✓</span><div><b>Funding is open</b><small>Only verified PayPal captures count.</small></div></div>}
        {showDetails && campaign && <div className="agent-team">{campaign.traces.map((trace) => <div key={trace.id} className={trace.status === "complete" ? "complete" : ""}><span>✦</span><p><b>{trace.label}</b><small>{trace.summary}</small></p><i>{trace.status === "complete" ? "✓" : "·"}</i></div>)}</div>}
      </section>

      <article className="gift-card">
        <div className="gift-visual"><span className="live-gift-emoji">{selectedGift?.emoji ?? "🎁"}</span></div>
        <div className="gift-details"><div><span className="ai-pill">✨ THOUGHTFUL GIFT IDEA</span><h2>{selectedGift?.name ?? "Personalised birthday keepsake"}</h2></div><span className="price">£{selectedGift?.price ?? 7}</span></div>
        <p className="ai-note">{selectedGift?.rationale ?? `A personal direction the group can refine for ${displayed.recipient}.`}</p>
      </article>

      <section className="funding-card">
        <div className="funding-heading"><div><span>VERIFIED GIFT FUND</span><strong>£{funding.total.toFixed(2)} <small>of £{target.toFixed(2)}</small></strong></div><span className="percentage">{progress}%</span></div>
        <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
        <div className="funding-meta"><span><b>{funding.contributorCount}</b> verified contributor{funding.contributorCount === 1 ? "" : "s"}</span><span>£{Math.max(0, target - funding.total).toFixed(2)} to go</span></div>
        <div className="single-tester"><span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span><div><b>{funding.contributorCount ? `${firstName}, contribution verified` : `${firstName}, ready to test`}</b><small>No fictional contributors are included.</small></div></div>
        {campaign && <div className="circle-link-actions"><button onClick={shareCircle}>Share Circle link</button><button className={subscribed ? "subscribed" : ""} onClick={subscribeToUpdates}>{subscribed ? "DM updates on ✓" : "Get DM updates"}</button></div>}
        {campaign && !campaign.pendingApproval && !fullyFunded && <div className={paypalConnected ? "sandbox-helper linked" : "sandbox-helper"}><span>{paypalConnected ? "✅" : "🧪"}</span><div><b>{paypalConnected ? `PayPal linked${paypalIdentity?.name ? ` as ${paypalIdentity.name}` : ""}` : "Use a Personal Sandbox account"}</b><small>{paypalConnected ? "PayPal does not share a consumer balance with WanderWrap. Checkout will confirm an eligible balance or funding source before you approve payment." : "Your normal PayPal login will not work here. In the PayPal Developer Dashboard, open Testing Tools → Sandbox Accounts and use the generated Personal account email and password."}</small></div></div>}
        {!fullyFunded && <><label className="test-amount"><span>Contribution</span><div>£ <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal"/></div></label><button className="primary-button" disabled={!campaign || Boolean(campaign?.pendingApproval) || !validAmount || busy} onClick={contribute}>{paypalConnected ? `Continue to PayPal · £${Number(amount || 0).toFixed(2)}` : `Link PayPal to contribute £${Number(amount || 0).toFixed(2)}`} <span>↗</span></button></>}
        {fullyFunded && <><div className="target-reached"><span>✓</span><div><b>Target reached with verified money</b><small>The purchase boundary is now visible.</small></div></div><button className="primary-button" onClick={() => showToast("Retailer purchasing is not connected yet. No order was placed.")}>3. Review purchase boundary <span>→</span></button></>}
      </section>

      <section className="timeline-card"><div className="section-title"><div><span>YOUR CIRCLE JOURNEY</span><h3>From invite to unforgettable</h3></div><span className="mini-gift">🎀</span></div><ol className="timeline"><li className={campaign ? "done" : "active"}><span>{campaign ? "✓" : "1"}</span><div><b>Start the Circle 🎁</b><small>Create the shared space and invite link</small></div></li><li className={campaign && !campaign.pendingApproval ? "done" : campaign ? "active" : ""}><span>{campaign && !campaign.pendingApproval ? "✓" : "2"}</span><div><b>Open contributions 💛</b><small>The organiser stays in control</small></div></li><li className={fullyFunded ? "done" : campaign && !campaign.pendingApproval ? "active" : ""}><span>{fullyFunded ? "✓" : "3"}</span><div><b>Contribute with PayPal 🅿️</b><small>Use a Personal Sandbox account for this test</small></div></li><li className={fullyFunded ? "active" : ""}><span>4</span><div><b>Approve the final gift ✨</b><small>No purchase happens without confirmation</small></div></li></ol></section>
    </section>
    {toast && <div className="toast">{toast}</div>}{busy && <div className="busy-bar"/>}
  </main>;
}
