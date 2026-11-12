"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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

type ClientSurface = "detecting" | "telegram" | "web";

export default function Home() {
  const [campaign, setCampaign] = useState<CircleCampaign | null>(null);
  const [funding, setFunding] = useState({ total: 0, contributorCount: 0 });
  const [firstName, setFirstName] = useState("You");
  const [telegramReady, setTelegramReady] = useState(false);
  const [clientSurface, setClientSurface] = useState<ClientSurface>("detecting");
  const [telegramPlatform, setTelegramPlatform] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("browser");
  const [telegramLaunchUrl, setTelegramLaunchUrl] = useState("https://t.me/WanderWrapCirclesBot?startapp");
  const [botUrl, setBotUrl] = useState("https://t.me/WanderWrapCirclesBot");
  const [paypalConnected, setPaypalConnected] = useState(false);
  const [paypalIdentity, setPaypalIdentity] = useState<{ name?: string; email?: string; verified?: boolean } | null>(null);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [circleLinks, setCircleLinks] = useState<{ miniApp: string; dmOptIn: string } | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("hi@chatpye.com");
  const [giftMessage, setGiftMessage] = useState("Happy birthday, Sarah. We hope this gift makes your next adventure even brighter.");
  const [claimSent, setClaimSent] = useState(false);
  const [researchClues, setResearchClues] = useState("");
  const [researchSourceUrl, setResearchSourceUrl] = useState("");
  const [researchConsent, setResearchConsent] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [circleRecipient, setCircleRecipient] = useState(TEST_CIRCLE.recipient);
  const [circleOccasion, setCircleOccasion] = useState(TEST_CIRCLE.occasion);
  const [circleDate, setCircleDate] = useState(TEST_CIRCLE.eventDate);
  const [circleTarget, setCircleTarget] = useState(String(TEST_CIRCLE.targetAmount));
  const [circleContributors, setCircleContributors] = useState(String(TEST_CIRCLE.expectedContributors));

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
      setRecipientEmail(result.campaign.recipientEmail || "");
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
    void initializeTelegram().then(async ({ available, platform, firstName: telegramName, startParam }) => {
      setTelegramReady(available);
      setClientSurface(available ? "telegram" : "web");
      setTelegramPlatform(platform || "");
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) || window.navigator.maxTouchPoints > 1;
      setDeviceLabel(isMobile ? "mobile browser" : "desktop browser");
      const browserCircleId = new URLSearchParams(window.location.search).get("circleId") || undefined;
      void fetch(`/api/app-context${browserCircleId ? `?circleId=${encodeURIComponent(browserCircleId)}` : ""}`)
        .then((response) => response.ok ? response.json() : null)
        .then((context) => {
          if (context?.telegramLaunchUrl) setTelegramLaunchUrl(context.telegramLaunchUrl);
          if (context?.botUrl) setBotUrl(context.botUrl);
        })
        .catch(() => undefined);
      if (!available) return;
      if (telegramName) setFirstName(telegramName);
      const paypalStatus = new URLSearchParams(window.location.search).get("paypal");
      const returnedFromPayPal = startParam?.startsWith("paypal_connected") || paypalStatus === "connected";
      const paypalFailed = startParam?.startsWith("paypal_error") || paypalStatus === "error";
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
        : startParam?.startsWith("paypal_connected_")
          ? startParam.slice("paypal_connected_".length)
        : startParam?.startsWith("paypal_error_")
          ? startParam.slice("paypal_error_".length)
        : startParam?.startsWith("paid_")
          ? startParam.slice("paid_".length)
          : pendingCircleId;
      await loadCircle(linkedCircleId);
      if (startParam?.startsWith("paid_") || paypalStatus === "success") {
        setPaypalConnected(true);
        showToast("PayPal returned successfully. Confirming the capture…");
        window.setTimeout(() => void loadCircle(linkedCircleId), 1200);
        window.setTimeout(() => void loadCircle(linkedCircleId), 3500);
      }
    });
  }, [loadCircle, refreshPayPalStatus, showToast]);

  function openInTelegram() {
    window.location.assign(telegramLaunchUrl);
  }

  const target = campaign?.targetAmount ?? Number(circleTarget || TEST_CIRCLE.targetAmount);
  const progress = Math.min(100, Math.round((funding.total / target) * 100));
  const fullyFunded = funding.total >= target;
  const validAmount = useMemo(() => Number(amount) >= 1 && Number(amount) <= 500, [amount]);
  const selectedGift = campaign?.gifts.find((gift) => gift.id === campaign.selectedGiftId) ?? campaign?.gifts[0];
  const selectedProduct = campaign?.productRecommendations?.find((product) => product.id === campaign.selectedProductId) ?? campaign?.productRecommendations?.[0];

  async function activateTestCircle() {
    const targetAmount = Number(circleTarget);
    const expectedContributors = Number(circleContributors);
    if (!circleRecipient.trim() || !circleOccasion.trim() || !circleDate || !recipientEmail.trim()) {
      showToast("Add the recipient, event date and delivery email");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({
          recipient: circleRecipient.trim(),
          occasion: circleOccasion.trim(),
          eventDate: circleDate,
          targetAmount,
          expectedContributors,
          recipientEmail: recipientEmail.trim(),
          prompt: `Create a ${circleOccasion} Circle for ${circleRecipient} on ${circleDate} with a £${targetAmount} target for ${expectedContributors} contributors`,
          skipChatAnalysis: true,
          messageHistory: [],
          forceNew: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not activate the Circle");
      let createdCampaign = result.campaign as CircleCampaign;
      if (researchClues.trim() && researchConsent) {
        const researchResponse = await fetch("/api/shopping/research", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
          body: JSON.stringify({ circleId: createdCampaign.id, publicClues: researchClues, sourceUrl: researchSourceUrl, consent: true }),
        });
        const researchResult = await researchResponse.json();
        if (researchResponse.ok) createdCampaign = researchResult.campaign;
        else setResearchError(researchResult.error || "Circle created, but gift research needs another try");
      }
      setCampaign(createdCampaign);
      await loadCircle(createdCampaign.id);
      showToast("Circle link, recipient handoff and updates are ready");
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
      const response = await fetch("/api/paypal/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({ circleId: campaign?.id }),
      });
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

  function startNewCircle() {
    setCampaign(null);
    setFunding({ total: 0, contributorCount: 0 });
    setCircleLinks(null);
    setRecipientEmail("");
    setResearchClues("");
    setResearchSourceUrl("");
    setResearchConsent(false);
    setResearchError("");
    setClaimSent(false);
    showToast("New Circle brief ready");
  }

  async function sendRecipientClaim() {
    if (!campaign || !recipientEmail) return;
    setBusy(true);
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({
          circleId: campaign.id,
          recipientEmail,
          messages: giftMessage.trim() ? [{ from: firstName, message: giftMessage.trim() }] : [],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send the recipient claim");
      setClaimSent(true);
      await loadCircle(campaign.id);
      showToast(result.payoutEnabled ? "Private claim sent to the recipient" : "Reveal sent. PayPal payout remains safely paused until Payouts is enabled.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not send the recipient claim");
    } finally {
      setBusy(false);
    }
  }

  async function researchGifts() {
    if (!campaign || !researchClues.trim() || !researchConsent) return;
    setBusy(true);
    setResearchError("");
    try {
      const response = await fetch("/api/shopping/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({ circleId: campaign.id, publicClues: researchClues, sourceUrl: researchSourceUrl, consent: researchConsent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Scout could not research gifts");
      setCampaign(result.campaign);
      showToast(`Scout found ${result.products.length} live gift options ✨`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scout could not research gifts";
      setResearchError(message);
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  async function selectProduct(productId: string) {
    if (!campaign) return;
    setBusy(true);
    try {
      const response = await fetch("/api/shopping/select", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
        body: JSON.stringify({ circleId: campaign.id, productId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gift selection failed");
      setCampaign(result.campaign);
      showToast("Gift direction added to the Circle");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gift selection failed");
    } finally {
      setBusy(false);
    }
  }

  const displayed = campaign ?? { recipient: circleRecipient || TEST_CIRCLE.recipient, occasion: circleOccasion || TEST_CIRCLE.occasion, eventDate: circleDate || TEST_CIRCLE.eventDate, targetAmount: target, expectedContributors: Number(circleContributors || 1) };

  return <main className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand" onClick={telegramReady ? undefined : openInTelegram}><span className="brand-mark"><Image src="/brand/wanderwrap-mark.png" alt="WanderWrap gift ribbon" width={34} height={34} priority unoptimized/></span><span>WanderWrap</span></button>
      <div className="topbar-actions">
        <span className={telegramReady ? "surface-chip telegram" : "surface-chip web"}>{telegramReady ? `Telegram${telegramPlatform ? ` · ${telegramPlatform}` : ""}` : "Web preview"}</span>
        <button className={paypalConnected ? "paypal-status connected" : "paypal-status"} onClick={telegramReady ? connectPayPal : openInTelegram}><span>{telegramReady ? "P" : "➤"}</span>{telegramReady ? (paypalConnected ? "PayPal linked" : "Link PayPal") : "Open Telegram"}</button>
        <span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span>
      </div>
    </header>

    <section className="content">
      {clientSurface === "detecting" && <div className="live-notice">Detecting the best WanderWrap experience…</div>}
      {clientSurface === "web" && <section className="telegram-bridge">
        <div className="telegram-bridge-icon"><Image src="/brand/wanderwrap-mark.png" alt="WanderWrap" width={58} height={58} unoptimized/></div>
        <div className="telegram-bridge-copy"><span>YOU’RE ON THE WEB · {deviceLabel.toUpperCase()}</span><h2>Bring this Circle into Telegram</h2><p>Open the secure Mini App to identify your Telegram account, join the right Circle, receive private updates and contribute with PayPal.</p></div>
        <div className="telegram-bridge-actions"><button onClick={openInTelegram}>Open WanderWrap in Telegram <span>↗</span></button><a href={botUrl} target="_blank" rel="noreferrer">Message @WanderWrapCirclesBot</a></div>
        <small>Telegram supplies signed Mini App session data after you open it. WanderWrap does not guess or trust identity from this web page.</small>
      </section>}

      <div className="eyebrow-row"><span className="eyebrow"><i/> 🎁 LIVE GIFT CIRCLE</span><span className="test-badge">🧪 SANDBOX</span></div>
      <div className="hero-copy">
        <p className="occasion">{displayed.recipient.toUpperCase()}’S {displayed.occasion.toUpperCase()} · {displayed.eventDate}</p>
        <h1>{firstName}, let’s make<br/><em>{displayed.recipient} smile.</em></h1>
        <p>You’re the first gifter in this Circle. Your sandbox contribution is the only amount that will move the total.</p>
        <div className="circle-chips"><span>🎯 £{target} goal</span><span>👤 {displayed.expectedContributors} gifter{displayed.expectedContributors === 1 ? "" : "s"}</span><span>🔒 Private amounts</span></div>
      </div>

      <section className="agent-console">
        <div className="agent-console-head"><div className="wrap-orb">W<span>✦</span></div><div><span>WRAP · CIRCLE CONDUCTOR</span><b>{campaign ? "Your Circle is ready" : "Ready to bring everyone together"}</b></div><button onClick={() => setShowDetails(!showDetails)}>{showDetails ? "−" : "+"}</button></div>
        <p>{campaign ? "Your Circle is live. Approve funding, share the invite, then make the first secure sandbox contribution." : `I’ve prepared a simple Circle for ${displayed.recipient}. Start it when you’re ready — no one is charged automatically.`}</p>
        {!campaign && <div className="agent-success"><span>1</span><div><b>Complete the Circle brief below</b><small>Wrap will create the link, research gifts and remember the recipient handoff.</small></div></div>}
        {campaign?.pendingApproval === "open_funding" && <div className="approval-box"><div><span>YOUR APPROVAL</span><b>Open the £{campaign.targetAmount} collection?</b><small>No charge occurs until you approve in PayPal.</small></div><button onClick={approveFunding}>Approve</button></div>}
        {campaign && !campaign.pendingApproval && <div className="agent-success"><span>✓</span><div><b>Funding is open</b><small>Only verified PayPal captures count.</small></div></div>}
        {showDetails && campaign && <div className="agent-team">{campaign.traces.map((trace) => <div key={trace.id} className={trace.status === "complete" ? "complete" : ""}><span>✦</span><p><b>{trace.label}</b><small>{trace.summary}</small></p><i>{trace.status === "complete" ? "✓" : "·"}</i></div>)}</div>}
      </section>

      {!campaign && <section className="research-card creation-card">
        <div className="research-heading"><div className="scout-orb">🎁</div><div><span>WRAP · CREATE A CIRCLE</span><h2>One brief. A fully coordinated gift.</h2></div><span className="channel3-pill">AGENT-ASSISTED</span></div>
        <div className="creation-grid">
          <label className="simple-field"><span>Who is the Circle for?</span><input value={circleRecipient} onChange={(event) => setCircleRecipient(event.target.value)} maxLength={80}/></label>
          <label className="simple-field"><span>Occasion</span><input value={circleOccasion} onChange={(event) => setCircleOccasion(event.target.value)} maxLength={80}/></label>
          <label className="simple-field"><span>Event date</span><input type="date" value={circleDate} onChange={(event) => setCircleDate(event.target.value)}/></label>
          <label className="simple-field"><span>Gift target (£)</span><input inputMode="decimal" value={circleTarget} onChange={(event) => setCircleTarget(event.target.value.replace(/[^0-9.]/g, ""))}/></label>
          <label className="simple-field"><span>Expected gifters</span><input inputMode="numeric" value={circleContributors} onChange={(event) => setCircleContributors(event.target.value.replace(/\D/g, ""))}/></label>
          <label className="simple-field"><span>Recipient gift email</span><input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com"/></label>
        </div>
        <div className="delivery-note"><span>✉️</span><div><b>Where the collected gift goes</b><small>When the target is reached, only the organiser can send the private reveal and claim link to this email. It is never shown to contributors.</small></div></div>
        <p className="research-intro">Optional gift intelligence — add only gift-relevant clues you have permission to use. These fields disappear after creation.</p>
        <label className="simple-field"><span>What does {circleRecipient || "the recipient"} enjoy? · optional</span><textarea value={researchClues} onChange={(event) => setResearchClues(event.target.value)} maxLength={2000} placeholder="e.g. pottery, warm interiors, weekend hikes, jazz and practical gifts…"/></label>
        <label className="simple-field"><span>Public source link · optional</span><input type="url" value={researchSourceUrl} onChange={(event) => setResearchSourceUrl(event.target.value)} placeholder="https://…"/></label>
        {researchClues.trim() && <label className="research-consent"><input type="checkbox" checked={researchConsent} onChange={(event) => setResearchConsent(event.target.checked)}/><span><b>I have permission to use these clues</b><small>Only the gift-relevant summary is saved with the Circle.</small></span></label>}
        <button className="research-button" disabled={!telegramReady || busy || !recipientEmail.trim() || Boolean(researchClues.trim() && !researchConsent)} onClick={activateTestCircle}><span>✨</span> {busy ? "Agents are preparing the Circle…" : "Create Circle & share link"}</button>
        {researchError && <div className="research-status"><span>🔌</span><div><b>Scout needs one connection</b><small>{researchError}</small></div></div>}
      </section>}

      {campaign && (campaign.giftProfile || campaign.productRecommendations?.length) ? <section className="research-card">
        <div className="research-heading"><div className="scout-orb">🔎</div><div><span>SCOUT · GIFT SHORTLIST</span><h2>Live options from the creation brief</h2></div><span className="channel3-pill">POWERED BY CHANNEL3</span></div>
        {campaign.giftProfile && <div className="gift-profile">
          <div><span>🧠 SAGE · EVIDENCE-BOUND PROFILE</span><strong>{Math.round(campaign.giftProfile.confidence * 100)}% confidence</strong></div>
          <p>{campaign.giftProfile.summary}</p>
          <div className="profile-chips">{[...campaign.giftProfile.interests, ...campaign.giftProfile.styles, ...campaign.giftProfile.values].slice(0, 8).map((signal) => <span key={signal}>{signal}</span>)}</div>
          {campaign.searchBriefs && <small>Scout searched {campaign.searchBriefs.map((brief) => brief.label).join(" · ")}</small>}
        </div>}
        {campaign.productRecommendations && campaign.productRecommendations.length > 0 && <div className="product-carousel">
          {campaign.productRecommendations.map((product) => <article key={product.id} className={product.id === campaign.selectedProductId ? "product-card selected" : "product-card"}>
            <div className="product-image">{product.imageUrl ? <Image src={product.imageUrl} alt={product.imageAlt || product.title} width={240} height={180} unoptimized/> : <span>🎁</span>}<i>LIVE · {product.matchScore ? `${product.matchScore}% MATCH` : "AI PICK"}</i></div>
            <div className="product-copy"><span>{product.searchIntent || "Live gift"} · {product.availability} · {product.retailer}</span><h3>{product.title}</h3><p>{product.rationale}</p><div><strong>{product.currency === "GBP" ? "£" : `${product.currency} `}{product.price.toFixed(2)}</strong><button disabled={busy} onClick={() => void selectProduct(product.id)}>{product.id === campaign.selectedProductId ? "Chosen ✓" : "Choose"}</button></div></div>
          </article>)}
        </div>}
      </section> : null}

      <article className="gift-card">
        <div className="gift-visual">{selectedProduct?.imageUrl ? <Image className="selected-product-image" src={selectedProduct.imageUrl} alt={selectedProduct.imageAlt || selectedProduct.title} fill sizes="(max-width: 520px) 100vw, 520px" unoptimized/> : <span className="live-gift-emoji">{selectedGift?.emoji ?? "🎁"}</span>}</div>
        <div className="gift-details"><div><span className="ai-pill">✨ {selectedProduct ? "LIVE GIFT DIRECTION" : "THOUGHTFUL GIFT IDEA"}</span><h2>{selectedProduct?.title ?? selectedGift?.name ?? "Personalised birthday keepsake"}</h2></div><span className="price">£{selectedProduct?.price.toFixed(2) ?? selectedGift?.price ?? 7}</span></div>
        <p className="ai-note">{selectedProduct?.rationale ?? selectedGift?.rationale ?? `A personal direction the group can refine for ${displayed.recipient}.`}</p>
      </article>

      <section className="funding-card">
        <div className="funding-heading"><div><span>VERIFIED GIFT FUND</span><strong>£{funding.total.toFixed(2)} <small>of £{target.toFixed(2)}</small></strong></div><span className="percentage">{progress}%</span></div>
        <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
        <div className="funding-meta"><span><b>{funding.contributorCount}</b> verified contributor{funding.contributorCount === 1 ? "" : "s"}</span><span>£{Math.max(0, target - funding.total).toFixed(2)} to go</span></div>
        <div className="single-tester"><span className="avatar avatar-user">{firstName.slice(0, 1).toUpperCase()}</span><div><b>{funding.contributorCount ? `${firstName}, contribution verified` : `${firstName}, ready to test`}</b><small>No fictional contributors are included.</small></div></div>
        {campaign && <div className="circle-link-actions"><button onClick={shareCircle}>Share Circle link</button><button className={subscribed ? "subscribed" : ""} onClick={subscribeToUpdates}>{subscribed ? "DM updates on ✓" : "Get DM updates"}</button><button onClick={startNewCircle}>New Circle</button></div>}
        {campaign && !campaign.pendingApproval && !fullyFunded && <div className={paypalConnected ? "sandbox-helper linked" : "sandbox-helper"}><span>{paypalConnected ? "✅" : "🧪"}</span><div><b>{paypalConnected ? `PayPal linked${paypalIdentity?.name ? ` as ${paypalIdentity.name}` : ""}` : "Use a Personal Sandbox account"}</b><small>{paypalConnected ? "PayPal does not share a consumer balance with WanderWrap. Checkout will confirm an eligible balance or funding source before you approve payment." : "Your normal PayPal login will not work here. In the PayPal Developer Dashboard, open Testing Tools → Sandbox Accounts and use the generated Personal account email and password."}</small></div></div>}
        {!fullyFunded && <><label className="test-amount"><span>Contribution</span><div>£ <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal"/></div></label><button className="primary-button" disabled={!campaign || Boolean(campaign?.pendingApproval) || !validAmount || busy} onClick={contribute}>{campaign?.pendingApproval ? "Waiting for organiser to open contributions" : paypalConnected ? `Pay £${Number(amount || 0).toFixed(2)} with PayPal` : `Link PayPal to pay £${Number(amount || 0).toFixed(2)}`} <span>{campaign?.pendingApproval ? "⏳" : "↗"}</span></button></>}
        {fullyFunded && <><div className="target-reached"><span>✓</span><div><b>Target reached with verified money</b><small>Ribbon can now send the private reveal. Penny keeps payout locked until PayPal enables the required scope.</small></div></div>
          <div className="claim-invite">
            <span>RIBBON · RECIPIENT HANDOFF</span>
            {campaign?.recipientEmail ? <div className="delivery-note"><span>✉️</span><div><b>Reveal destination</b><small>{campaign.recipientEmail} · saved when this Circle was created</small></div></div> : <label className="simple-field"><span>Recipient email for this legacy Circle</span><input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="recipient@example.com"/></label>}
            <label className="simple-field"><span>Your message</span><textarea value={giftMessage} onChange={(event) => setGiftMessage(event.target.value)} maxLength={600}/></label>
            <button className="primary-button" disabled={busy || claimSent} onClick={sendRecipientClaim}>{claimSent ? "Private reveal sent ✓" : "Email the private reveal"} <span>✦</span></button>
            <small>Ribbon sends a transactional claim email from WanderWrap's DKIM-verified domain. Use an address you control for the sandbox payment test.</small>
          </div></>}
      </section>

      <section className="timeline-card"><div className="section-title"><div><span>YOUR CIRCLE JOURNEY</span><h3>From invite to unforgettable</h3></div><span className="mini-gift">🎀</span></div><ol className="timeline"><li className={campaign ? "done" : "active"}><span>{campaign ? "✓" : "1"}</span><div><b>Start the Circle 🎁</b><small>Create the shared space and invite link</small></div></li><li className={campaign && !campaign.pendingApproval ? "done" : campaign ? "active" : ""}><span>{campaign && !campaign.pendingApproval ? "✓" : "2"}</span><div><b>Open contributions 💛</b><small>The organiser stays in control</small></div></li><li className={fullyFunded ? "done" : campaign && !campaign.pendingApproval ? "active" : ""}><span>{fullyFunded ? "✓" : "3"}</span><div><b>Contribute with PayPal 🅿️</b><small>Use a Personal Sandbox account for this test</small></div></li><li className={fullyFunded ? "active" : ""}><span>4</span><div><b>Approve the final gift ✨</b><small>No purchase happens without confirmation</small></div></li></ol></section>
    </section>
    {toast && <div className="toast">{toast}</div>}{busy && <div className="busy-bar"/>}
  </main>;
}
