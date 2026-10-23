"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  { number: "01", title: "Care, all in one place", description: "Keep appointments, prescriptions, and medical records organised in one secure patient portal.", icon: "✳" },
  { number: "02", title: "A clearer care journey", description: "See upcoming visits and important updates without hunting through messages and paperwork.", icon: "↗" },
  { number: "03", title: "Smarter clinical workflows", description: "Give care teams a connected workspace for patient context, review, and coordination.", icon: "⌘" },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("Overview");
  const previewCopy: Record<string, { title: string; description: string; label: string }> = {
    Overview: { title: "Care that keeps moving", description: "Appointments and updates, organised.", label: "YOUR NEXT STEP" },
    Appointments: { title: "Your next visit", description: "Keep upcoming care details in view.", label: "APPOINTMENTS" },
    Records: { title: "Your health, together", description: "Important information in one place.", label: "HEALTH RECORDS" },
  };
  return (
    <main className="page-shell landing-page">
      <header className="landing-nav">
        <Link href="/" className="brand-lockup" aria-label="Heloraa Clinic home">
          <span className="brand-mark">h<span>+</span></span>
          <span className="brand-copy"><strong>heloraa</strong><small>CLINIC</small></span>
        </Link>
        <nav className={`landing-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#care">Our approach</a><a onClick={() => setMenuOpen(false)} href="#features">Platform</a><a onClick={() => setMenuOpen(false)} href="#care-teams">For care teams</a>
        </nav>
        <div className="landing-actions"><Link href="/login" className="nav-signin">Sign in</Link><Link href="/signup" className="button button-primary nav-cta">Get started <span>↗</span></Link><button className="menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button></div>
      </header>

      <section className="hero-section" id="care">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> CONNECTED CARE, THOUGHTFULLY DESIGNED</div>
          <h1>Healthcare that feels <em>more human.</em></h1>
          <p className="hero-description">A calmer, more connected way to manage care — bringing patients, clinicians, and important health information together.</p>
          <div className="hero-actions"><Link href="/signup" className="button button-primary button-large">Create your patient account <span>↗</span></Link><Link href="/login" className="button button-secondary button-large">I already have an account</Link></div>
          <div className="trust-row"><div className="trust-avatars"><span>H</span><span>+</span><span>♥</span></div><p><strong>One connected space</strong><br/>for your care journey</p><span className="trust-divider"/><p className="trust-note">Designed for patients<br/>and care teams</p></div>
        </div>

        <div className="hero-art" aria-label="Illustration of the Heloraa connected care dashboard">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="floating-chip chip-top"><span className="chip-icon mint">✓</span><span><strong>Care, connected</strong><small>Your health at a glance</small></span></div>
          <div className="dashboard-preview">
            <div className="preview-top"><div className="preview-brand"><span className="mini-mark">h+</span><strong>heloraa</strong></div><span className="preview-avatar">H</span></div>
            <div className="preview-greeting"><small>YOUR PERSONAL HEALTH SPACE</small><h3>Good morning.</h3><p>Your care journey, all in one place.</p></div>
            <div className="preview-tabs" role="tablist" aria-label="Dashboard preview"><button type="button" role="tab" aria-selected={previewTab === "Overview"} className={previewTab === "Overview" ? "active" : ""} onClick={() => setPreviewTab("Overview")}>Overview</button><button type="button" role="tab" aria-selected={previewTab === "Appointments"} className={previewTab === "Appointments" ? "active" : ""} onClick={() => setPreviewTab("Appointments")}>Visits</button><button type="button" role="tab" aria-selected={previewTab === "Records"} className={previewTab === "Records" ? "active" : ""} onClick={() => setPreviewTab("Records")}>Records</button></div>
            <div className="preview-stats"><div><span className="stat-symbol teal">＋</span><small>Appointments</small><strong>Stay on track</strong></div><div><span className="stat-symbol peach">♡</span><small>Health records</small><strong>All together</strong></div></div>
            <div className="preview-appointment"><div className="appointment-icon">✚</div><div key={previewTab} className="preview-appointment-copy"><small>{previewCopy[previewTab].label}</small><strong>{previewCopy[previewTab].title}</strong><p>{previewCopy[previewTab].description}</p></div><span className="arrow-circle">↗</span></div>
            <div className="preview-bottom"><span><i/> Secure patient space</span><span>HEALTH, IN HARMONY</span></div>
          </div>
          <div className="floating-chip chip-bottom"><span className="chip-icon lilac">♡</span><span><strong>Care with context</strong><small>People first, always</small></span></div>
          <div className="decor-cross cross-one">✳</div><div className="decor-cross cross-two">✧</div>
        </div>
      </section>

      <section className="metrics-strip" aria-label="Platform principles"><div><span className="metric-icon">✳</span><p><strong>Patient-first</strong><small>Designed around people</small></p></div><div><span className="metric-icon">⌁</span><p><strong>Connected information</strong><small>Less searching, more clarity</small></p></div><div><span className="metric-icon">◈</span><p><strong>Thoughtful technology</strong><small>Built to support care teams</small></p></div></section>

      <section className="features-section" id="features"><div className="section-heading"><div><div className="eyebrow">A BETTER WAY TO STAY CONNECTED</div><h2>Everything important.<br/><em>In one thoughtful space.</em></h2></div><p>Healthcare can be complicated. Keeping track of it shouldn't be. Heloraa brings the essentials into a simpler, more welcoming experience.</p></div><div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><div className="feature-card-top"><span className="feature-icon">{feature.icon}</span><span className="feature-number">{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.description}</p><span className="feature-line"/></article>)}</div></section>

      <section className="care-banner" id="care-teams"><div className="care-banner-orb"/><div className="care-banner-copy"><div className="eyebrow light-eyebrow">FOR PATIENTS & CARE TEAMS</div><h2>Better organised care.<br/><em>More room for people.</em></h2><p>One connected platform for the everyday details that help care move forward.</p></div><Link href="/login" className="button button-light">Explore your workspace <span>↗</span></Link></section>

      <footer className="landing-footer"><Link href="/" className="brand-lockup"><span className="brand-mark">h<span>+</span></span><span className="brand-copy"><strong>heloraa</strong><small>CLINIC</small></span></Link><p>Connected healthcare, with people at the centre.</p><div><Link href="/login">Sign in</Link><Link href="/signup">Create account</Link></div><small className="copyright">© {new Date().getFullYear()} Heloraa Clinic</small></footer>
    </main>
  );
}
