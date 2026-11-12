"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CircleCampaign } from "@/lib/agents/types";
import {
  initializeTelegram,
  openExternalLink,
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
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [showDetails, setShowDetails] = useState(false);

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

  const loadCircle = useCallback(async () => {
    const response = await fetch("/api/agent/campaign", { headers: telegramAuthHeaders() });
    if (!response.ok) return;
    const result = await response.json();
    if (result.campaign) {
      setCampaign(result.campaign);
      await refreshFunding(result.campaign.id);
    }
  }, [refreshFunding]);

  useEffect(() => {
    void initializeTelegram().then(async ({ available, firstName: telegramName, startParam }) => {
      setTelegramReady(available);
      if (telegramName) setFirstName(telegramName);
      const paypalStatus = new URLSearchParams(window.location.search).get("paypal");
      if (startParam === "paypal_connected" || paypalStatus === "connected") setPaypalConnected(true);
      await loadCircle();
      if (startParam?.startsWith("paid_") || paypalStatus === "success") {
        setPaypalConnected(true);
        showToast("PayPal returned successfully. Confirming the capture…");
        window.setTimeout(() => void loadCircle(), 2500);
      }
    });
  }, [loadCircle, showToast]);

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
      openExternalLink(approval.href);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not start PayPal");
    } finally {
      setBusy(false);
    }
  }

  return <main className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand"><span className="brand-mark"><span>W</span></span><span>WanderWrap</span></button>
      <div className="topbar-actions">
        <button className={paypalConnected ? "paypal-status connected" : "paypal-status"} onClick={connectPayPal}><span>P</span>{paypalConnected ? "Connected" : "Link PayPal"}</button>
        <span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span>
      </div>
    </header>

    <section className="content">
      {!telegramReady && <div className="live-notice">Open this page from WanderWrap’s Telegram menu to run the live test.</div>}

      <div className="eyebrow-row"><span className="eyebrow"><i/> ONE-PERSON SANDBOX TEST</span><span className="test-badge">PAYPAL SANDBOX</span></div>
      <div className="hero-copy">
        <p className="occasion">{TEST_CIRCLE.recipient.toUpperCase()}’S {TEST_CIRCLE.occasion.toUpperCase()} · {TEST_CIRCLE.eventDate}</p>
        <h1>You’re the first<br/><em>gifter.</em></h1>
        <p>This guided Circle starts at £0. Only your completed sandbox contribution will move it.</p>
      </div>

      <section className="agent-console">
        <div className="agent-console-head"><div className="wrap-orb">W<span>✦</span></div><div><span>WRAP · TEST CONDUCTOR</span><b>{campaign ? "Live Circle active" : "Ready to create real state"}</b></div><button onClick={() => setShowDetails(!showDetails)}>{showDetails ? "−" : "+"}</button></div>
        <p>{campaign ? "This Circle now exists in DynamoDB. Open funding, connect PayPal, and make one sandbox contribution." : "The recipient and gift direction are a test fixture. The user, PayPal identity, order, capture and contribution total will be real sandbox data."}</p>
        {!campaign && <button className="agent-action" disabled={!telegramReady || busy} onClick={activateTestCircle}>{busy ? "Creating…" : "Activate this test Circle"}<span>✦</span></button>}
        {campaign?.pendingApproval === "open_funding" && <div className="approval-box"><div><span>YOUR APPROVAL</span><b>Open the £{campaign.targetAmount} collection?</b><small>No charge occurs until you approve in PayPal.</small></div><button onClick={approveFunding}>Approve</button></div>}
        {campaign && !campaign.pendingApproval && <div className="agent-success"><span>✓</span><div><b>Funding is open</b><small>Only verified PayPal captures count.</small></div></div>}
        {showDetails && campaign && <div className="agent-team">{campaign.traces.map((trace) => <div key={trace.id} className={trace.status === "complete" ? "complete" : ""}><span>✦</span><p><b>{trace.label}</b><small>{trace.summary}</small></p><i>{trace.status === "complete" ? "✓" : "·"}</i></div>)}</div>}
      </section>

      <article className="gift-card">
        <div className="gift-visual"><span className="live-gift-emoji">{selectedGift?.emoji ?? "🎁"}</span></div>
        <div className="gift-details"><div><span className="ai-pill">✦ TEST GIFT DIRECTION</span><h2>{selectedGift?.name ?? "Personalised birthday keepsake"}</h2></div><span className="price">£{selectedGift?.price ?? 7}</span></div>
        <p className="ai-note">{selectedGift?.rationale ?? "A deliberately simple gift direction for validating the end-to-end contribution flow."}</p>
      </article>

      <section className="funding-card">
        <div className="funding-heading"><div><span>VERIFIED GIFT FUND</span><strong>£{funding.total.toFixed(2)} <small>of £{target.toFixed(2)}</small></strong></div><span className="percentage">{progress}%</span></div>
        <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
        <div className="funding-meta"><span><b>{funding.contributorCount}</b> verified contributor{funding.contributorCount === 1 ? "" : "s"}</span><span>£{Math.max(0, target - funding.total).toFixed(2)} to go</span></div>
        <div className="single-tester"><span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span><div><b>{funding.contributorCount ? `${firstName}, contribution verified` : `${firstName}, ready to test`}</b><small>No fictional contributors are included.</small></div></div>
        {!paypalConnected && <button className="primary-button" disabled={!campaign || Boolean(campaign?.pendingApproval) || busy} onClick={connectPayPal}>1. Link your PayPal sandbox account <span>↗</span></button>}
        {paypalConnected && !fullyFunded && <><label className="test-amount"><span>Contribution</span><div>£ <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal"/></div></label><button className="primary-button" disabled={!campaign || Boolean(campaign?.pendingApproval) || !validAmount || busy} onClick={contribute}>2. Contribute with PayPal <span>↗</span></button></>}
        {fullyFunded && <><div className="target-reached"><span>✓</span><div><b>Target reached with verified money</b><small>The purchase boundary is now visible.</small></div></div><button className="primary-button" onClick={() => showToast("Retailer purchasing is not connected yet. No order was placed.")}>3. Review purchase boundary <span>→</span></button></>}
      </section>

      <section className="timeline-card"><div className="section-title"><div><span>LIVE TEST FLOW</span><h3>What is real in this run</h3></div><span className="mini-gift">🎁</span></div><ol className="timeline"><li className={campaign ? "done" : "active"}><span>{campaign ? "✓" : "1"}</span><div><b>Circle stored in DynamoDB</b><small>One controlled recipient fixture</small></div></li><li className={paypalConnected ? "done" : campaign ? "active" : ""}><span>{paypalConnected ? "✓" : "2"}</span><div><b>Your PayPal identity linked</b><small>Sandbox OAuth, not a simulated login</small></div></li><li className={fullyFunded ? "done" : paypalConnected ? "active" : ""}><span>{fullyFunded ? "✓" : "3"}</span><div><b>Your contribution captured</b><small>Webhook-verified PayPal amount</small></div></li><li className={fullyFunded ? "active" : ""}><span>4</span><div><b>Purchase approval boundary</b><small>No retailer purchase is executed in this build</small></div></li></ol></section>
    </section>
    {toast && <div className="toast">{toast}</div>}{busy && <div className="busy-bar"/>}
  </main>;
}
