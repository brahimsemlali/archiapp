"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import { setLocaleAction } from "@/lib/actions/locale";
import { PLAN_LIMITS, type WorkspacePlan } from "@/lib/billing/plans";

// ────────────────────────────────────────────────────────────────────────────
// Faithful rebuild of the "ArchiDesk Landing" design handoff (Claude Design),
// ported to React. Light · blue (#2563EB) · Geist · blueprint motifs.
// Content is grounded in the real product (no fabricated firms / unbuilt claims)
// and threaded through FR/EN i18n. All design CSS is scoped under `.adl`.
// ────────────────────────────────────────────────────────────────────────────

const ADL_CSS = `
.adl{
  --accent:#2563EB;--accent-600:#1D4ED8;--accent-50:#EFF4FF;--accent-100:#DBE6FE;
  --ink:#0B1220;--ink-2:#1E293B;--muted:#475569;--muted-2:#64748B;
  --line:#E5E7EB;--line-2:#EEF1F5;--bg:#FFFFFF;--bg-alt:#F7F8FA;--bg-blue:#F1F5FD;
  --shadow-sm:0 1px 2px rgba(15,23,42,.04),0 1px 1px rgba(15,23,42,.03);
  --shadow-md:0 8px 24px -8px rgba(15,23,42,.08),0 2px 6px rgba(15,23,42,.04);
  --shadow-lg:0 30px 60px -20px rgba(15,23,42,.18),0 10px 30px -10px rgba(15,23,42,.08);
  --container:1200px;--pad-section:120px;
  --font:var(--font-geist),ui-sans-serif,system-ui,-apple-system,sans-serif;
  --font-mono:var(--font-geist-mono),ui-monospace,SFMono-Regular,Menlo,monospace;
  font-family:var(--font);color:var(--ink);background:var(--bg);
  font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.adl *,.adl *::before,.adl *::after{box-sizing:border-box;}
.adl a{color:inherit;text-decoration:none;}
.adl button{font:inherit;cursor:pointer;}
.adl .container{max-width:var(--container);margin:0 auto;padding:0 32px;}
.adl .eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--accent);font-weight:500;}
.adl .eyebrow .dot{display:inline-block;width:6px;height:6px;border-radius:50%;
  background:var(--accent);margin-right:8px;vertical-align:middle;transform:translateY(-1px);}
.adl h1,.adl h2,.adl h3,.adl h4{font-family:var(--font);color:var(--ink);font-weight:600;
  letter-spacing:-.02em;margin:0;text-wrap:balance;}
.adl h1{font-size:clamp(40px,6.4vw,68px);line-height:1.05;letter-spacing:-.035em;}
.adl h2{font-size:clamp(30px,4.4vw,44px);line-height:1.1;letter-spacing:-.03em;}
.adl h3{font-size:22px;line-height:1.25;letter-spacing:-.015em;}
.adl p{margin:0;color:var(--muted);}
.adl .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;
  font-size:14.5px;font-weight:500;border:1px solid transparent;white-space:nowrap;letter-spacing:-.005em;
  transition:transform .15s ease,background .15s ease,box-shadow .15s ease,border-color .15s ease;}
.adl .btn-primary{background:var(--ink);color:#fff;box-shadow:0 1px 2px rgba(15,23,42,.2),inset 0 1px 0 rgba(255,255,255,.08);}
.adl .btn-primary:hover{background:#000;transform:translateY(-1px);}
.adl .btn-accent{background:var(--accent);color:#fff;
  box-shadow:0 1px 2px rgba(37,99,235,.3),0 6px 16px -6px rgba(37,99,235,.4),inset 0 1px 0 rgba(255,255,255,.18);}
.adl .btn-accent:hover{background:var(--accent-600);transform:translateY(-1px);}
.adl .btn-ghost{background:transparent;color:var(--ink);border-color:var(--line);}
.adl .btn-ghost:hover{background:var(--bg-alt);border-color:#D1D5DB;}
.adl .section-pad{padding:var(--pad-section) 0;}
.adl .section-head{text-align:center;max-width:720px;margin:0 auto 64px;}
.adl .section-head .eyebrow{margin-bottom:16px;display:inline-block;}
.adl .section-head h2{margin-bottom:16px;}
.adl .section-head p{font-size:17px;color:var(--muted);}
.adl .hairline{height:1px;background:var(--line);width:100%;}
.adl .mono{font-family:var(--font-mono);}
@keyframes adl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes adl-drift-a{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.08)}}
@keyframes adl-drift-b{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,30px) scale(1.05)}}
@keyframes adl-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes adl-bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes adl-shine{0%{transform:translateX(-100%)}55%{transform:translateX(220%)}100%{transform:translateX(220%)}}
@keyframes adl-line-draw{from{stroke-dashoffset:260}to{stroke-dashoffset:0}}
@keyframes adl-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes adl-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
@keyframes adl-fade-in{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
.adl .glow{position:absolute;border-radius:50%;filter:blur(80px);opacity:.55;pointer-events:none;}
.adl .bar-grow{transform-origin:left center;animation:adl-bar-grow 1.1s cubic-bezier(.2,.7,.2,1) both;}
@media (max-width:1024px){
  .adl{--pad-section:80px;}
  .adl .hero-dash{display:none;}
  .adl .grid-2,.adl .grid-3,.adl .ai-split,.adl .foot-grid{grid-template-columns:1fr !important;}
  .adl .nav-links{display:none !important;}
  .adl .pricing-featured{transform:none !important;}
}
@media (max-width:640px){
  .adl .container{padding:0 20px;}
  .adl .grid-2{gap:14px;}
}
`;

// ── Icons (1.6 stroke, currentColor) ────────────────────────────────────────
type IconProps = { size?: number; stroke?: number };
function Icon({ size = 18, stroke = 1.6, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const IconLogo = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 17 L12 6 L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.2 13 H14.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconTimeline = (p: IconProps) => <Icon {...p}><path d="M3 6h18M3 12h12M3 18h7" /><circle cx="21" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="10" cy="18" r="1.2" fill="currentColor" stroke="none" /></Icon>;
const IconCoin = (p: IconProps) => <Icon {...p}><path d="M12 3v18M16 7H10a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5H8" /></Icon>;
const IconDoc = (p: IconProps) => <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Icon>;
const IconUser = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>;
const IconSpark = (p: IconProps) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></Icon>;
const IconCheck = (p: IconProps) => <Icon {...p}><path d="M4 12.5l5 5L20 6.5" /></Icon>;
const IconArrowRight = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
const IconPlay = (p: IconProps) => <Icon {...p}><path d="M7 5v14l12-7z" fill="currentColor" stroke="none" /></Icon>;
const IconBell = (p: IconProps) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>;
const IconFolder = (p: IconProps) => <Icon {...p}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h9A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" /></Icon>;
const IconBars = (p: IconProps) => <Icon {...p}><path d="M4 19V10M10 19V4M16 19v-7M22 19h-2 0-20" /></Icon>;
const IconUsers = (p: IconProps) => <Icon {...p}><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 4a3 3 0 0 1 0 6" /><path d="M16 14a6 6 0 0 1 5 5" /></Icon>;
const IconShield = (p: IconProps) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Icon>;
const IconChevron = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
const IconGlobe = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></Icon>;

// ── Motion / hooks ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 14, className, style, id }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties; id?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div id={id} className={className} style={style}>{children}</div>;
  return (
    <motion.div id={id} className={className} style={style}
      initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1], delay: delay / 1000 }}>
      {children}
    </motion.div>
  );
}

function useTilt(maxDeg = 2) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 4, ry: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setT({ rx: 4 + -dy * maxDeg, ry: dx * maxDeg }));
    };
    const onLeave = () => setT({ rx: 4, ry: 0 });
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { window.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); cancelAnimationFrame(raf); };
  }, [maxDeg]);
  return [ref, t] as const;
}

function useCountUp(value: string, run: boolean, delay = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const target = parseFloat(String(value).replace(/[^\d.]/g, ""));
    if (Number.isNaN(target)) return;
    const id = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1100);
        setN((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(id);
  }, [value, run, delay]);
  const isInt = !String(value).includes(".");
  return String(value).replace(/[\d.]+/, isInt ? String(Math.round(n)) : n.toFixed(1));
}

// ────────────────────────────────────────────────────────────────────────────
// Copy (FR default / EN). Grounded in the real product.
// ────────────────────────────────────────────────────────────────────────────
const COPY = {
  fr: {
    nav: { links: [["#features", "Fonctionnalités"], ["#ai", "IA"], ["#pricing", "Tarifs"], ["#faq", "FAQ"]] as [string, string][], signIn: "Connexion", cta: "Commencer" },
    hero: {
      eyebrow: "Le système d’exploitation des cabinets d’architecture",
      h1a: "Pilotez chaque projet.", h1b: "De l’", h1mark: "esquisse", h1c: " à la réception.",
      sub: "Un seul espace pour les phases, budgets, permis et clients — avec une IA qui repère les problèmes tant qu’ils sont encore faciles à corriger. Pensé pour la façon dont les architectes travaillent vraiment.",
      ctaPrimary: "Démarrer l’essai gratuit", ctaSecondary: "Voir la démo",
      trust: "14 jours d’essai · Sans carte bancaire · Français, anglais et arabe",
      stats: [["12", "Projets actifs"], ["94%", "Dans le budget ce trimestre"], ["3", "Permis en attente"], ["27", "Synthèses IA cette semaine"]] as [string, string][],
    },
    trust: {
      title: "Conçu pour la conformité marocaine — de A à Z",
      items: ["Loi 016-89", "Barème ONA", "MAD · TVA 20%", "ICE · RC · IF", "Signature électronique", "Portail client", "Français · English · العربية", "Export des données", "Sécurité RLS"],
    },
    features: {
      eyebrow: "La plateforme", h2: "Le dernier outil que votre cabinet adoptera.",
      sub: "Quatre métiers qui vivaient dans quatre outils — délais, budgets, fichiers et clients — réunis sur un seul plan de travail. Discrètement propulsés par une IA qui connaît l’architecture.",
      cards: [
        { tag: "01 / DÉLAIS", title: "Phases & échéances", desc: "Esquisse, APS, APD, permis, chantier, réception — chaque phase sur un seul plan, avec jalons et livrables. Réorganisez, le reste suit." },
        { tag: "02 / BUDGET", title: "Devis, factures & budgets", desc: "Suivez chaque dirham. Devis et factures conformes en MAD avec TVA, numérotation légale séquentielle — du devis à la facture en deux clics." },
        { tag: "03 / DOCUMENTS", title: "Fichiers & permis", desc: "Plans, contrats et permis — versionnés et liés. Le suivi du permis de construire vous alerte avant qu’une échéance ne passe." },
        { tag: "04 / CLIENT", title: "Portail client & signature", desc: "Vos clients voient exactement ce que vous voulez. Ils valident en deux clics et signent en ligne — fini les relances WhatsApp à 21 h." },
      ],
    },
    ai: {
      eyebrow: "ArchiDesk IA", h2a: "Une IA qui a lu", h2b: "tous vos comptes-rendus.",
      sub: "Elle synthétise réunions et visites de chantier, prépare les contrats ancrés dans la loi 016-89, et fait ressortir ce qui mérite votre attention aujourd’hui. Entraînée sur l’architecture, pas sur les campagnes marketing d’hier.",
      bullets: [
        ["Synthétise réunions & chantiers", "Transforme des notes brutes en résumés, décisions et tâches — en quelques secondes."],
        ["Rédige vos contrats", "Génère des contrats de mission fondés sur la loi 016-89 et le barème ONA, à affiner dans un éditeur riche."],
        ["Prépare vos relances", "Synthèses projet, devis à relancer, factures en retard — l’IA prépare le suivi, vous décidez."],
      ] as [string, string][],
      panelTitle: "ArchiDesk IA", panelLive: "En direct · 12 projets suivis", panelFeed: "FLUX D’INSIGHTS",
      analyzing: "ANALYSE", reviewing: "Lecture de l’activité récente",
      insights: [
        ["Riad Andalous", "La phase Permis accuse 4 jours de retard sur l’échéance."],
        ["Marina Tower B", "Coûts matériaux en hausse de +7,2 % vs vos 3 derniers projets similaires."],
        ["Bibliothèque Tanger", "Validation de l’esquisse en attente — client connecté il y a 11 jours."],
        ["Villa Anfa Park", "Le rapport de sol signale 2 semaines de revue structurelle."],
      ] as [string, string][],
      alerts: [
        { color: "#F59E0B", title: "Risque d’échéance permis", body: "La revue de la wilaya de Casablanca pour Riad Andalous se clôt dans 4 jours. Dossier envoyé, sans réponse.", time: "IL Y A 2H", action: "Préparer une relance" },
        { color: "#10B981", title: "Suggestion budget", body: "La provision de Marina Tower B est utilisée à 18 % en phase 4 — envisagez de libérer 80 000 MAD.", time: "HIER" },
        { color: "#2563EB", title: "Synthèse de chantier", body: "Visite Villa Anfa Park : 3 réserves levées, photos jointes, compte-rendu prêt à envoyer.", time: "IL Y A 2J" },
      ],
    },
    how: {
      eyebrow: "Comment ça marche", h2a: "De l’inscription au premier projet suivi", h2b: "en moins d’une heure.",
      sub: "Pas d’onboarding de 3 semaines. Pas de consultants. La plupart des cabinets lancent leur premier projet avant la fin du café.",
      steps: [
        { n: "01", title: "Configurez le projet", body: "Partez d’un brief ou d’un modèle de cabinet. ArchiDesk propose vos phases — affinez-les en minutes, pas en semaines." },
        { n: "02", title: "Invitez équipe & clients", body: "Attribuez les rôles, ouvrez un portail propre à vos clients. Aucun compte à gérer, aucun fil d’email à suivre." },
        { n: "03", title: "Laissez l’IA veiller", body: "Elle suit chaque échéance, chaque dirham, chaque fenêtre de permis — et vous dit ce qui a vraiment besoin de vous." },
      ],
    },
    pricing: {
      eyebrow: "Tarifs", h2: "Un tarif qui grandit avec votre cabinet.",
      sub: "Commencez gratuitement. Ajoutez l’IA quand vous êtes prêt. Changez de plan en un clic — résiliez en deux.",
      monthly: "Mensuel", yearly: "Annuel", save: "≈2 MOIS",
      perMonth: "MAD / mois", free: "Gratuit", popular: "LE PLUS CHOISI",
      includes: "Inclus", includesPlus: "Tout le plan {p}, plus",
      footnote: "Tous les plans : facturation en MAD · TVA · essai de 14 jours sans carte",
      ctas: { solo: "Démarrer gratuitement", studio: "Essai 14 jours", agence: "Nous contacter" } as Record<WorkspacePlan, string>,
      taglines: {
        solo: "Pour l’architecte solo qui démarre ses premiers projets.",
        studio: "Pour les studios qui veulent l’IA et le portail client.",
        agence: "Pour les cabinets établis avec plusieurs équipes.",
      } as Record<WorkspacePlan, string>,
      highlights: {
        solo: ["Devis & factures conformes", "Suivi des phases & échéances", "Portail client de base"],
        studio: ["ArchiDesk IA : synthèses & contrats", "Portail client avec validations", "Suivi du permis de construire", "Signature électronique"],
        agence: ["Espaces multi-équipes & rôles", "Modèles & rapports de marque", "Rapports financiers & TVA", "Support prioritaire"],
      } as Record<WorkspacePlan, string[]>,
    },
    faq: {
      eyebrow: "FAQ", h2: "Les questions que les cabinets posent en premier.",
      items: [
        ["ArchiDesk convient-il aux architectes solo, ou seulement aux grands cabinets ?", "Les deux. Le plan de base est gratuit et pensé pour les indépendants — la plupart commencent là et ne passent au plan supérieur que pour l’IA ou le portail client. Les plans évoluent proprement quand l’équipe grandit."],
        ["En quoi ArchiDesk diffère-t-il d’un outil de gestion générique ?", "Un outil générique voit votre projet comme une liste de tâches. ArchiDesk comprend les phases métier, les contrats ancrés dans la loi 016-89, la facturation MAD/TVA, le permis de construire et le portail client. L’IA est entraînée sur l’architecture."],
        ["Mes clients peuvent-ils consulter leur projet sans compte ?", "Oui. Le portail client utilise des liens magiques signés — vos clients ouvrent une vue claire et à votre marque, commentent et valident, sans jamais créer de compte."],
        ["Mes données sont-elles en sécurité ?", "Oui. Chaque cabinet est isolé par une sécurité au niveau de la base de données (RLS) — personne ne voit les données d’un autre cabinet. Vous pouvez exporter toutes vos données à tout moment."],
        ["Y a-t-il un engagement ?", "Non. 14 jours d’essai sans carte, puis mensuel sans engagement — résiliez quand vous voulez."],
        ["Puis-je inviter mon équipe ?", "Oui, selon votre plan : rôles propriétaire, admin, membre et lecteur."],
      ] as [string, string][],
      still: "Encore une question ?", talk: "Parler à un humain →",
    },
    footerCta: {
      h2a: "Arrêtez de jongler.", h2b: "Commencez à livrer.",
      sub: "Donnez à votre cabinet un seul espace pour livrer les projets à temps, dans le budget, sans les urgences du week-end.",
      ctaPrimary: "Démarrer l’essai gratuit", ctaSecondary: "Réserver une démo",
      trust: "14 jours d’essai · Sans carte · Premier projet en moins d’une heure",
    },
    footer: {
      blurb: "Gestion de projet propulsée par l’IA pour les cabinets d’architecture. Pensé au Maroc, pour les cabinets du Maghreb et au-delà.",
      cols: [
        ["Produit", [["Fonctionnalités", "#features"], ["Tarifs", "#pricing"], ["ArchiDesk IA", "#ai"], ["Portail client", "#features"]]],
        ["Ressources", [["Connexion", "/login"], ["Créer un compte", "/signup"], ["FAQ", "#faq"]]],
        ["Légal", [["Mentions légales", "/mentions-legales"], ["Conditions", "/terms"], ["CGV", "/cgv"], ["Confidentialité", "/privacy"], ["Cookies", "/cookies"]]],
      ] as [string, [string, string][]][],
      copyright: "© 2026 ArchiDesk · Casablanca, Maroc",
      status: "Tous les systèmes opérationnels",
    },
  },
  en: {
    nav: { links: [["#features", "Features"], ["#ai", "AI"], ["#pricing", "Pricing"], ["#faq", "FAQ"]] as [string, string][], signIn: "Sign in", cta: "Get Started" },
    hero: {
      eyebrow: "The OS for modern architecture firms",
      h1a: "Manage every project.", h1b: "From ", h1mark: "blueprint", h1c: " to handover.",
      sub: "One workspace for timelines, budgets, permits and clients — with an AI that catches problems while they’re still cheap to fix. Built for the way architects actually work.",
      ctaPrimary: "Start free trial", ctaSecondary: "Watch demo",
      trust: "14-day trial · No credit card · French, English & Arabic",
      stats: [["12", "Active projects"], ["94%", "On budget this quarter"], ["3", "Permits pending"], ["27", "AI summaries this week"]] as [string, string][],
    },
    trust: {
      title: "Built for Moroccan compliance — end to end",
      items: ["Loi 016-89", "ONA fee schedule", "MAD · 20% VAT", "ICE · RC · IF", "E-signature", "Client portal", "French · English · العربية", "Data export", "Row-level security"],
    },
    features: {
      eyebrow: "The platform", h2: "The last tool your firm will switch to.",
      sub: "Four jobs that used to live in four tools — timelines, budgets, files and clients — now on one canvas. Quietly powered by an AI that knows architecture.",
      cards: [
        { tag: "01 / TIMELINE", title: "Phases & deadlines", desc: "Concept, schematic, permits, construction, handover — every phase on one canvas, with milestones and deliverables. Replan and the rest moves with it." },
        { tag: "02 / BUDGET", title: "Quotes, invoices & budgets", desc: "Track every dirham. Morocco-compliant quotes and invoices in MAD with VAT and legally-sequential numbering — devis to facture in two clicks." },
        { tag: "03 / DOCUMENTS", title: "Files & permits", desc: "Drawings, contracts and permits — versioned and linked. The permit tracker pings you before a deadline quietly slips past." },
        { tag: "04 / CLIENT", title: "Client portal & sign-off", desc: "Clients see exactly what you want them to. They approve in two clicks and sign online — no more 9pm WhatsApp about the bathroom tile." },
      ],
    },
    ai: {
      eyebrow: "ArchiDesk AI", h2a: "An AI that’s read", h2b: "every report you’ve filed.",
      sub: "It summarizes meetings and site visits, drafts contracts anchored in Loi 016-89, and surfaces what needs your attention today. Trained on architecture, not on yesterday’s marketing campaigns.",
      bullets: [
        ["Summarizes meetings & site visits", "Turns raw notes into summaries, decisions and tasks — in seconds."],
        ["Drafts your contracts", "Generates mission contracts grounded in Loi 016-89 and the ONA fee schedule, ready to refine."],
        ["Prepares your follow-ups", "Project briefings, expiring quotes, overdue invoices — AI preps the follow-through, you decide."],
      ] as [string, string][],
      panelTitle: "ArchiDesk AI", panelLive: "Live · monitoring 12 projects", panelFeed: "INSIGHT FEED",
      analyzing: "ANALYZING", reviewing: "Reviewing latest activity",
      insights: [
        ["Riad Andalous", "Permitting phase is 4 days behind its deadline."],
        ["Marina Tower B", "Material costs trending +7.2% vs your last 3 similar projects."],
        ["Tangier Library", "Schematic sign-off pending — client last opened 11 days ago."],
        ["Villa Anfa Park", "Soil report flags a 2-week structural review buffer."],
      ] as [string, string][],
      alerts: [
        { color: "#F59E0B", title: "Permit deadline risk", body: "Casablanca wilaya review for Riad Andalous closes in 4 days. Application sent, no response yet.", time: "2H AGO", action: "Draft follow-up" },
        { color: "#10B981", title: "Budget suggestion", body: "Contingency on Marina Tower B is 18% used at phase 4 — consider releasing 80,000 MAD.", time: "YESTERDAY" },
        { color: "#2563EB", title: "Site-visit summary", body: "Villa Anfa Park visit: 3 issues resolved, photos attached, report ready to send.", time: "2D AGO" },
      ],
    },
    how: {
      eyebrow: "How it works", h2a: "From signup to first tracked project", h2b: "in under an hour.",
      sub: "No 3-week onboarding. No consultants. Most firms ship their first project before the kettle’s cold.",
      steps: [
        { n: "01", title: "Set up the project", body: "Import a brief or start from a firm template. ArchiDesk drafts your phases — refine them in minutes, not weeks." },
        { n: "02", title: "Bring in your team & clients", body: "Assign roles, hand clients a clean portal. No logins to manage, no email threads to chase." },
        { n: "03", title: "Let AI watch the rest", body: "It tracks every deadline, dirham and permit window — and tells you what actually needs you today." },
      ],
    },
    pricing: {
      eyebrow: "Pricing", h2: "Pricing that scales with your firm.",
      sub: "Start free. Add AI when you’re ready. Switch plans in a click — cancel in two.",
      monthly: "Monthly", yearly: "Yearly", save: "≈2 MO",
      perMonth: "MAD / mo", free: "Free", popular: "MOST POPULAR",
      includes: "Includes", includesPlus: "Everything in {p}, plus",
      footnote: "All plans: MAD billing · VAT invoicing · 14-day trial, no card",
      ctas: { solo: "Start Free", studio: "Start 14-day Trial", agence: "Contact Sales" } as Record<WorkspacePlan, string>,
      taglines: {
        solo: "For solo architects starting their first projects.",
        studio: "For growing studios that need AI and client portals.",
        agence: "For established firms with multi-team workflows.",
      } as Record<WorkspacePlan, string>,
      highlights: {
        solo: ["Morocco-compliant quotes & invoices", "Phase & deadline tracking", "Basic client portal"],
        studio: ["ArchiDesk AI: summaries & contracts", "Client portal with approvals", "Building-permit tracker", "E-signature"],
        agence: ["Multi-team workspaces & roles", "Branded templates & reports", "Financial reports & VAT", "Priority support"],
      } as Record<WorkspacePlan, string[]>,
    },
    faq: {
      eyebrow: "FAQ", h2: "The questions firms always ask first.",
      items: [
        ["Does ArchiDesk work for solo architects, or only large firms?", "Both. The base plan is free and built for solo practitioners — most start there and only upgrade once they need AI or client portals. Plans scale cleanly as your team grows."],
        ["How is ArchiDesk different from a generic project tool?", "A generic tool treats your project as a task list. ArchiDesk understands architecture phases, contracts anchored in Loi 016-89, MAD/VAT invoicing, the building permit, and the client portal. The AI is trained on architecture."],
        ["Can my clients view their project without an account?", "Yes. The client portal uses signed magic links — clients open a clean, branded view, comment and approve, without ever creating an account."],
        ["Is my project data secure?", "Yes. Every firm is isolated by database-level row security (RLS) — no one sees another firm’s data. You can export all of your data at any time."],
        ["Is there a commitment?", "No. A 14-day trial with no card, then month-to-month — cancel whenever you like."],
        ["Can I invite my team?", "Yes, depending on your plan: owner, admin, member and viewer roles."],
      ] as [string, string][],
      still: "Still stuck?", talk: "Talk to a human →",
    },
    footerCta: {
      h2a: "Stop juggling.", h2b: "Start shipping.",
      sub: "Give your firm one workspace to ship projects on time, on budget, and without the weekend fire-drills.",
      ctaPrimary: "Start free trial", ctaSecondary: "Book a demo",
      trust: "14-day trial · No credit card · First project live in under an hour",
    },
    footer: {
      blurb: "AI-powered project management for architecture firms. Built in Morocco, for firms across the Maghreb and beyond.",
      cols: [
        ["Product", [["Features", "#features"], ["Pricing", "#pricing"], ["ArchiDesk AI", "#ai"], ["Client portal", "#features"]]],
        ["Resources", [["Sign in", "/login"], ["Create account", "/signup"], ["FAQ", "#faq"]]],
        ["Legal", [["Legal notice", "/mentions-legales"], ["Terms", "/terms"], ["Sales terms", "/cgv"], ["Privacy", "/privacy"], ["Cookies", "/cookies"]]],
      ] as [string, [string, string][]][],
      copyright: "© 2026 ArchiDesk · Casablanca, Morocco",
      status: "All systems operational",
    },
  },
} as const;

type Locale = keyof typeof COPY;
type Copy = (typeof COPY)[Locale];

// ── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ c, locale }: { c: Copy; locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.6)",
      backdropFilter: "saturate(160%) blur(14px)", WebkitBackdropFilter: "saturate(160%) blur(14px)",
      borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent", transition: "all .25s ease",
    }}>
      <div className="container" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink)" }}>
          <span style={{ color: "var(--accent)", display: "inline-flex" }}><IconLogo size={24} /></span>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>ArchiDesk</span>
        </Link>
        <nav className="nav-links" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {c.nav.links.map(([href, label]) => (
            <a key={href} href={href} style={{ padding: "8px 14px", fontSize: 14, color: "var(--muted)", fontWeight: 450, borderRadius: 8 }}>{label}</a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" disabled={isPending}
            onClick={() => startTransition(() => setLocaleAction(locale === "fr" ? "en" : "fr"))}
            className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px" }}>
            <IconGlobe size={14} /> {locale === "fr" ? "FR" : "EN"}
          </button>
          <Link href="/login" style={{ fontSize: 14, color: "var(--muted)", padding: "8px 12px", fontWeight: 450 }}>{c.nav.signIn}</Link>
          <Link href="/signup" className="btn btn-primary">{c.nav.cta} <IconArrowRight size={15} /></Link>
        </div>
      </div>
    </header>
  );
}

// ── Gantt dashboard mockup ──────────────────────────────────────────────────
function Gantt() {
  const [tab, setTab] = useState<"timeline" | "budget" | "docs" | "team" | "activity">("timeline");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG"];
  const phases = [
    { name: "Concept Design", color: "#2563EB", start: 0, width: 12, pct: 100, owner: "YK", status: "done" },
    { name: "Schematic Drawings", color: "#2563EB", start: 10, width: 16, pct: 100, owner: "YK", status: "done" },
    { name: "Design Development", color: "#7C3AED", start: 24, width: 18, pct: 86, owner: "NA", status: "progress" },
    { name: "Permitting", color: "#F59E0B", start: 38, width: 14, pct: 42, owner: "RM", status: "risk" },
    { name: "Construction Docs", color: "#64748B", start: 50, width: 20, pct: 0, owner: "YK", status: "todo" },
    { name: "Bidding & Awards", color: "#64748B", start: 68, width: 10, pct: 0, owner: "NA", status: "todo" },
    { name: "Construction Admin", color: "#64748B", start: 76, width: 22, pct: 0, owner: "RM", status: "todo" },
  ] as const;
  const team = [
    { n: "Yasmine Kettani", r: "Project Lead", c: "#2563EB", i: "YK" },
    { n: "Nadir Amrani", r: "Senior Architect", c: "#7C3AED", i: "NA" },
    { n: "Reda Mansouri", r: "Permitting Lead", c: "#F59E0B", i: "RM" },
    { n: "Salma Berrada", r: "Client Relations", c: "#10B981", i: "SB" },
  ] as const;
  const budget = [
    { name: "Design Fees", used: 78, value: "312,000 MAD" },
    { name: "Engineering", used: 64, value: "186,500 MAD" },
    { name: "Permits & Approvals", used: 42, value: "48,200 MAD" },
    { name: "Site Survey & Soil", used: 100, value: "64,000 MAD" },
    { name: "Contingency", used: 18, value: "22,800 MAD" },
  ] as const;
  const docs = [
    { name: "Riad Andalous — Schematic Pkg v3.pdf", meta: "18.4 MB · 2h ago", tag: "SD" },
    { name: "Site Plan & Setbacks — A-100.dwg", meta: "6.2 MB · yesterday", tag: "DWG" },
    { name: "Soil Investigation Report.pdf", meta: "4.1 MB · 12 May", tag: "PDF" },
    { name: "Permit Application — Casablanca", meta: "2.8 MB · 09 May", tag: "PRM", flag: true },
    { name: "Client Approval — Façade.pdf", meta: "1.4 MB · 04 May", tag: "APP" },
  ] as const;
  const activity = [
    ["Reda Mansouri", "uploaded Permit Application — Casablanca", "2h ago"],
    ["ArchiDesk AI", "flagged risk on Permitting phase — 4-day deadline", "4h ago"],
    ["Yasmine Kettani", "updated Design Development to 86% complete", "yesterday"],
    ["Salma Berrada", "requested client approval on Façade Materials", "2 days ago"],
  ] as const;
  const tabs: [typeof tab, string][] = [["timeline", "Timeline"], ["budget", "Budget"], ["docs", "Documents"], ["team", "Team"], ["activity", "Activity"]];
  const sideRow = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7,
    fontSize: 13, color: active ? "var(--ink)" : "var(--muted)", background: active ? "var(--accent-50)" : "transparent", fontWeight: active ? 500 : 400,
  });
  const sideTitle: React.CSSProperties = { fontSize: 10.5, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".1em", margin: "14px 6px 8px", fontWeight: 500 };

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)", overflow: "hidden", width: "100%" }}>
      <div style={{ height: 40, padding: "0 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line-2)", background: "linear-gradient(180deg,#FAFBFC,#F4F6F9)" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((cc) => <span key={cc} style={{ width: 11, height: 11, borderRadius: "50%", background: cc }} />)}
        <div className="mono" style={{ flex: 1, height: 22, margin: "0 12px", background: "#fff", borderRadius: 6, border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted-2)" }}>app.archidesk.ma / projects / riad-andalous</div>
        <div style={{ width: 50 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 520 }}>
        <aside style={{ borderRight: "1px solid var(--line-2)", padding: "18px 14px", background: "#FCFCFD" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 4px" }}>
            <span style={{ color: "var(--accent)", display: "inline-flex" }}><IconLogo size={18} /></span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>ArchiDesk</span>
          </div>
          <div style={sideTitle}>Workspace</div>
          <div style={sideRow(false)}><IconBars size={15} /> Dashboard</div>
          <div style={sideRow(true)}><IconFolder size={15} /> Projects <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)" }}>12</span></div>
          <div style={sideRow(false)}><IconDoc size={15} /> Documents</div>
          <div style={sideRow(false)}><IconUsers size={15} /> Clients</div>
          <div style={sideRow(false)}><IconCoin size={15} /> Finance</div>
          <div style={sideTitle}>Active Projects</div>
          {[["#2563EB", "Riad Andalous"], ["#7C3AED", "Marina Tower B"], ["#F59E0B", "Tangier Library"], ["#10B981", "Villa Anfa Park"]].map(([cc, nm]) => (
            <div key={nm} style={sideRow(false)}><span style={{ width: 8, height: 8, borderRadius: 2, background: cc }} /> {nm}</div>
          ))}
          <div style={{ marginTop: 22, padding: 12, borderRadius: 10, background: "linear-gradient(180deg,#EFF4FF,#FFFFFF)", border: "1px solid var(--accent-100)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: "var(--accent-600)" }}><IconSpark size={13} /> ArchiDesk AI</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>3 new insights about your Permitting phase.</div>
          </div>
        </aside>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 22px 0" }}>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 6 }}>Projects / Residential / Casablanca</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 20, fontWeight: 600 }}>Riad Andalous</h3>
              <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "var(--accent-50)", color: "var(--accent-600)", fontWeight: 500 }}>In Progress</span>
              <span style={{ fontSize: 12, color: "var(--muted-2)" }}>· Lead: Yasmine Kettani</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                {team.map((m, i) => (
                  <span key={m.i} style={{ width: 24, height: 24, borderRadius: "50%", background: m.c, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--line)", marginLeft: i ? -8 : 0, fontSize: 10, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{m.i}</span>
                ))}
                <span style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: 6 }}>+3</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 18, borderBottom: "1px solid var(--line-2)" }}>
              {tabs.map(([k, l]) => (
                <div key={k} onClick={() => setTab(k)} style={{ padding: "8px 12px", fontSize: 13, color: tab === k ? "var(--ink)" : "var(--muted)", fontWeight: tab === k ? 500 : 400, borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, cursor: "pointer" }}>
                  {l}{k === "docs" && <span style={{ marginLeft: 6, fontSize: 10, background: "#FEE2E2", color: "#B91C1C", padding: "1px 5px", borderRadius: 4 }}>3</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "18px 22px 22px", flex: 1 }}>
            {tab === "timeline" && (
              <>
                <div className="mono" style={{ display: "grid", gridTemplateColumns: "220px 1fr", fontSize: 11, color: "var(--muted-2)", letterSpacing: ".05em", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid var(--line-2)" }}>
                  <div>Phase</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${months.length},1fr)` }}>{months.map((m) => <div key={m}>{m}</div>)}</div>
                </div>
                <div style={{ position: "relative", paddingTop: 6 }}>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(220px + (100% - 220px) * 0.47)`, width: 1, background: "var(--accent)" }}>
                    <div className="mono" style={{ position: "absolute", top: -4, left: -22, fontSize: 9.5, background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>TODAY</div>
                  </div>
                  {phases.map((p, i) => (
                    <div key={p.name} style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center", height: 42, borderBottom: "1px dashed var(--line-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color }} />
                        <span style={{ color: "var(--ink-2)" }}>{p.name}</span>
                        <span className="mono" style={{ marginLeft: "auto", marginRight: 12, fontSize: 10, color: "var(--muted-2)" }}>{p.owner}</span>
                      </div>
                      <div style={{ position: "relative", height: "100%" }}>
                        <div className="bar-grow" style={{ position: "absolute", top: "50%", marginTop: -11, left: `${p.start}%`, width: `${p.width}%`, height: 22, background: p.status === "todo" ? "#F1F5F9" : `${p.color}1A`, border: `1px solid ${p.status === "todo" ? "#E2E8F0" : p.color + "40"}`, borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", animationDelay: `${0.4 + i * 0.08}s` }}>
                          <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, opacity: 0.85 }} />
                          {p.status === "risk" && <span style={{ position: "absolute", right: 6, top: 4, width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", boxShadow: "0 0 0 3px rgba(245,158,11,.18)" }} />}
                        </div>
                        <div className="mono" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `calc(${p.start}% + ${p.width}% + 8px)`, fontSize: 10.5, color: p.status === "risk" ? "#B45309" : "var(--muted-2)", whiteSpace: "nowrap" }}>
                          {p.status === "done" ? "✓ Complete" : p.status === "progress" ? `${p.pct}%` : p.status === "risk" ? `⚠ ${p.pct}% · at risk` : "Planned"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === "budget" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
                  {[["Total Budget", "1,240,000 MAD", "#0B1220"], ["Spent to Date", "733,500 MAD", "#2563EB"], ["Remaining", "506,500 MAD", "#10B981"]].map(([l, v, cc]) => (
                    <div key={l} style={{ padding: 14, borderRadius: 10, border: "1px solid var(--line-2)", background: "#FCFCFD" }}>
                      <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: cc, marginTop: 4, letterSpacing: "-0.02em" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {budget.map((b) => (
                  <div key={b.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--line-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span>{b.name}</span><span className="mono" style={{ color: "var(--muted)" }}>{b.value} · {b.used}%</span>
                    </div>
                    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.used}%`, background: b.used > 90 ? "#F59E0B" : "var(--accent)", borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </>
            )}
            {tab === "docs" && docs.map((f) => (
              <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 4px", borderBottom: "1px solid var(--line-2)" }}>
                <div className="mono" style={{ width: 36, height: 44, borderRadius: 4, background: "#F8FAFC", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--muted)", letterSpacing: ".04em" }}>{f.tag}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 2 }}>{f.meta}</div>
                </div>
                {"flag" in f && f.flag && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, background: "#FEF3C7", color: "#B45309", fontWeight: 500 }}>Deadline · 4 days</span>}
              </div>
            ))}
            {tab === "team" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, paddingTop: 4 }}>
                {team.map((m) => (
                  <div key={m.i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line-2)", borderRadius: 10 }}>
                    <span style={{ width: 34, height: 34, borderRadius: "50%", background: m.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{m.i}</span>
                    <div><div style={{ fontSize: 13.5 }}>{m.n}</div><div style={{ fontSize: 11.5, color: "var(--muted-2)" }}>{m.r}</div></div>
                  </div>
                ))}
              </div>
            )}
            {tab === "activity" && (
              <div style={{ paddingTop: 4 }}>
                {activity.map(([who, what, when]) => (
                  <div key={what} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line-2)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: who === "ArchiDesk AI" ? "var(--accent)" : "var(--muted-2)", marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13 }}><span style={{ fontWeight: 500 }}>{who}</span><span style={{ color: "var(--muted)" }}> {what}</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-2)" }}>{when}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, dot, style, delay = 0, bobDelay = 0 }: {
  icon: React.ReactNode; value: string; label: string; dot?: string; style?: React.CSSProperties; delay?: number; bobDelay?: number;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), delay); return () => clearTimeout(id); }, [delay]);
  const num = useCountUp(value, shown, 0);
  return (
    <div style={{
      position: "absolute", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px",
      boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", gap: 12,
      opacity: shown ? 1 : 0, transition: `opacity .9s ease`, animation: `adl-bob 6s ${bobDelay}s ease-in-out infinite`, ...style,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: dot ? `${dot}14` : "var(--accent-50)", color: dot || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.1 }}>{num}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 2, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}

function Hero({ c }: { c: Copy }) {
  const [tiltRef, tilt] = useTilt(2);
  const h = c.hero;
  const statIcons = [<IconFolder key="f" size={18} />, <IconCheck key="c" size={18} />, <IconBell key="b" size={17} />, <IconSpark key="s" size={17} />];
  const statMeta = [
    { dot: undefined as string | undefined, style: { top: 60, left: -70 }, delay: 700, bob: 0 },
    { dot: "#10B981", style: { top: 260, left: -90 }, delay: 1000, bob: 1.4 },
    { dot: "#F59E0B", style: { top: 150, right: -80 }, delay: 850, bob: 0.7 },
    { dot: undefined as string | undefined, style: { top: 340, right: -50 }, delay: 1150, bob: 2.1 },
  ];
  return (
    <section style={{ position: "relative", overflow: "hidden", paddingTop: 88, paddingBottom: 80 }}>
      <div aria-hidden className="glow" style={{ top: 40, left: "14%", width: 520, height: 520, background: "radial-gradient(circle,rgba(37,99,235,.22),transparent 60%)", animation: "adl-drift-a 18s ease-in-out infinite" }} />
      <div aria-hidden className="glow" style={{ top: 120, right: "10%", width: 460, height: 460, background: "radial-gradient(circle,rgba(124,58,237,.16),transparent 60%)", animation: "adl-drift-b 22s ease-in-out infinite" }} />
      <div aria-hidden className="glow" style={{ top: 380, left: "38%", width: 600, height: 600, background: "radial-gradient(circle,rgba(14,165,233,.12),transparent 60%)", animation: "adl-drift-a 26s ease-in-out infinite reverse" }} />
      <div aria-hidden style={{ position: "absolute", top: 70, left: 0, right: 0, height: 560, backgroundImage: "linear-gradient(to right,rgba(37,99,235,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(37,99,235,.05) 1px,transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 900px 400px at 50% 30%,transparent 30%,black 80%)", WebkitMaskImage: "radial-gradient(ellipse 900px 400px at 50% 30%,transparent 30%,black 80%)", pointerEvents: "none" }} />
      <div className="container" style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <Reveal><div className="eyebrow"><span className="dot" />{h.eyebrow}</div></Reveal>
        <Reveal delay={120}>
          <h1 style={{ marginTop: 22, marginBottom: 22 }}>
            {h.h1a}<br />{h.h1b}
            <span style={{ position: "relative", whiteSpace: "nowrap" }}>{h.h1mark}
              <svg viewBox="0 0 220 14" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: -8, width: "100%", height: 12 }}>
                <path d="M2 9 C 60 2, 160 2, 218 9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="260" strokeDashoffset="260" style={{ animation: "adl-line-draw 1.2s 0.6s cubic-bezier(.2,.7,.2,1) forwards" }} />
              </svg>
            </span>{h.h1c}
          </h1>
        </Reveal>
        <Reveal delay={240}><p style={{ fontSize: 19, maxWidth: 640, margin: "0 auto", color: "var(--muted)", lineHeight: 1.5 }}>{h.sub}</p></Reveal>
        <Reveal delay={360}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-accent" style={{ position: "relative", overflow: "hidden" }}>
              <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.4) 50%,transparent 65%)", width: "40%", animation: "adl-shine 3.4s 1.2s cubic-bezier(.4,0,.2,1) infinite" }} />
              {h.ctaPrimary} <IconArrowRight size={15} />
            </Link>
            <Link href="/login" className="btn btn-ghost"><IconPlay size={13} /> {h.ctaSecondary}</Link>
          </div>
        </Reveal>
        <Reveal delay={480}><div style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted-2)" }}>{h.trust}</div></Reveal>
        <Reveal delay={600} y={32}>
          <div className="hero-dash" style={{ position: "relative", marginTop: 64, maxWidth: 1080, marginLeft: "auto", marginRight: "auto", perspective: 2200 }}>
            <div ref={tiltRef} style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transformOrigin: "50% 100%", transformStyle: "preserve-3d", filter: "drop-shadow(0 40px 60px rgba(15,23,42,.10))", transition: "transform .8s cubic-bezier(.2,.7,.2,1)" }}>
              <Gantt />
            </div>
            {h.stats.map((s, i) => (
              <StatCard key={s[1]} icon={statIcons[i]} value={s[0]} label={s[1]} dot={statMeta[i]?.dot} style={statMeta[i]?.style} delay={statMeta[i]?.delay} bobDelay={statMeta[i]?.bob} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Trust strip (grounded: real capabilities, not fabricated firms) ─────────
function TrustStrip({ c }: { c: Copy }) {
  const loop = [...c.trust.items, ...c.trust.items];
  return (
    <section style={{ padding: "72px 0 28px", borderTop: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)", background: "#FCFCFD", overflow: "hidden" }}>
      <div className="container">
        <Reveal>
          <div className="mono" style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 500, marginBottom: 36 }}>{c.trust.title}</div>
        </Reveal>
      </div>
      <div style={{ position: "relative", maskImage: "linear-gradient(to right,transparent,black 8%,black 92%,transparent)", WebkitMaskImage: "linear-gradient(to right,transparent,black 8%,black 92%,transparent)" }}>
        <div style={{ display: "flex", width: "max-content", gap: 14, padding: "8px 28px", animation: "adl-marquee 38s linear infinite" }}>
          {loop.map((item, i) => (
            <span key={i} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, whiteSpace: "nowrap", fontSize: 13.5, color: "var(--ink-2)", background: "#fff", border: "1px solid var(--line)", borderRadius: 99, padding: "9px 16px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />{item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features (2×2 + minis) ──────────────────────────────────────────────────
function MiniTimeline() {
  const rows = [{ c: "#2563EB", w: 60, off: 0, pct: 100 }, { c: "#7C3AED", w: 55, off: 25, pct: 70 }, { c: "#F59E0B", w: 35, off: 55, pct: 30 }];
  return (
    <div style={{ border: "1px solid var(--line-2)", borderRadius: 8, padding: 10, background: "#FBFBFC" }}>
      {rows.map((b, i) => (
        <div key={i} style={{ height: 14, position: "relative", marginBottom: i === rows.length - 1 ? 0 : 4 }}>
          <div style={{ position: "absolute", left: `${b.off}%`, width: `${b.w}%`, top: 3, height: 8, borderRadius: 3, background: `${b.c}22`, border: `1px solid ${b.c}40`, overflow: "hidden" }}>
            <div style={{ width: `${b.pct}%`, height: "100%", background: b.c, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function MiniBudget() {
  const rows: [string, number, string][] = [["Design", 78, "var(--accent)"], ["Permits", 42, "#F59E0B"], ["Survey", 100, "#10B981"]];
  return (
    <div style={{ border: "1px solid var(--line-2)", borderRadius: 8, padding: 12, background: "#FBFBFC" }}>
      {rows.map(([n, p, cc], i) => (
        <div key={n} style={{ marginBottom: i === rows.length - 1 ? 0 : 8 }}>
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3, color: "var(--muted)" }}><span>{n}</span><span>{p}%</span></div>
          <div style={{ height: 5, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${p}%`, height: "100%", background: cc, borderRadius: 99 }} /></div>
        </div>
      ))}
    </div>
  );
}
function MiniDocs() {
  const items: [string, string][] = [["Schematic Pkg v3.pdf", "SD"], ["Site Plan A-100.dwg", "DWG"], ["Permit App — Wilaya", "PRM"]];
  return (
    <div style={{ border: "1px solid var(--line-2)", borderRadius: 8, padding: 8, background: "#FBFBFC" }}>
      {items.map(([n, t], i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderBottom: i === items.length - 1 ? "none" : "1px solid var(--line-2)" }}>
          <div className="mono" style={{ width: 22, height: 26, borderRadius: 3, background: "#fff", border: "1px solid var(--line)", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-2)" }}>{t}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{n}</div>
          {i === 2 && <span style={{ fontSize: 9.5, color: "#B45309", background: "#FEF3C7", padding: "1px 6px", borderRadius: 99, fontWeight: 500 }}>4d</span>}
        </div>
      ))}
    </div>
  );
}
function MiniClient({ sent, approve, changes }: { sent: string; approve: string; changes: string }) {
  return (
    <div style={{ border: "1px solid var(--line-2)", borderRadius: 8, padding: 12, background: "#FBFBFC" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 500 }}>Façade — v2</div>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--muted-2)" }}>{sent}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={{ flex: 1, fontSize: 11, padding: "7px 8px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: "none" }}>{approve}</button>
        <button style={{ flex: 1, fontSize: 11, padding: "7px 8px", borderRadius: 6, background: "#fff", color: "var(--muted)", border: "1px solid var(--line)" }}>{changes}</button>
      </div>
    </div>
  );
}
function Features({ c, locale }: { c: Copy; locale: Locale }) {
  const icons = [<IconTimeline key="t" size={20} />, <IconCoin key="c" size={20} />, <IconDoc key="d" size={20} />, <IconUser key="u" size={20} />];
  const colors = ["#2563EB", "#10B981", "#F59E0B", "#7C3AED"];
  const minis = [
    <MiniTimeline key="t" />, <MiniBudget key="b" />, <MiniDocs key="d" />,
    <MiniClient key="c" sent={locale === "fr" ? "ENVOYÉ 03 JUIN" : "SENT 03 JUN"} approve={locale === "fr" ? "Valider" : "Approve"} changes={locale === "fr" ? "Modifier" : "Changes"} />,
  ];
  return (
    <section id="features" className="section-pad" style={{ background: "var(--bg-alt)" }}>
      <div className="container">
        <Reveal>
          <div className="section-head">
            <div className="eyebrow"><span className="dot" />{c.features.eyebrow}</div>
            <h2>{c.features.h2}</h2><p>{c.features.sub}</p>
          </div>
        </Reveal>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
          {c.features.cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <FeatureCard icon={icons[i]} color={colors[i] ?? "#2563EB"} tag={card.tag} title={card.title} desc={card.desc} mini={minis[i]} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
function FeatureCard({ icon, title, desc, tag, color, mini }: { icon: React.ReactNode; title: string; desc: string; tag: string; color: string; mini: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      padding: 32, background: "#fff", border: `1px solid ${hover ? "#D1D5DB" : "var(--line)"}`, borderRadius: 16,
      transition: "transform .25s ease, box-shadow .25s ease, border-color .25s ease", transform: hover ? "translateY(-3px)" : "translateY(0)",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 18, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}14`, color, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}22` }}>{icon}</div>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted-2)", letterSpacing: ".04em", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: 6 }}>{tag}</span>
      </div>
      <div><h3 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h3><p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{desc}</p></div>
      <div style={{ marginTop: 6 }}>{mini}</div>
    </div>
  );
}

// ── AI section ──────────────────────────────────────────────────────────────
function AISection({ c }: { c: Copy }) {
  const ai = c.ai;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "shown">("typing");
  useEffect(() => {
    if (phase === "typing") { const t = setTimeout(() => setPhase("shown"), 1300); return () => clearTimeout(t); }
    const t = setTimeout(() => { setIdx((i) => (i + 1) % ai.insights.length); setPhase("typing"); }, 3400);
    return () => clearTimeout(t);
  }, [phase, idx, ai.insights.length]);
  const cur = ai.insights[idx] ?? ai.insights[0];
  if (!cur) return null;
  const alertIcons = [<IconBell key="b" size={15} />, <IconCoin key="c" size={15} />, <IconShield key="s" size={15} />];
  return (
    <section id="ai" className="section-pad">
      <div className="container">
        <div className="ai-split" style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 80, alignItems: "center" }}>
          <Reveal>
            <div className="eyebrow"><span className="dot" />{ai.eyebrow}</div>
            <h2 style={{ marginTop: 18, marginBottom: 20 }}>{ai.h2a}<br />{ai.h2b}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, marginBottom: 28, maxWidth: 520 }}>{ai.sub}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {ai.bullets.map(([t, d]) => (
                <li key={t} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, marginTop: 2, background: "var(--accent-50)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconCheck size={14} /></div>
                  <div><div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>{t}</div><div style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>{d}</div></div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150} y={20} style={{ background: "linear-gradient(180deg,#F8FAFC 0%,#EFF4FF 100%)", border: "1px solid var(--line)", borderRadius: 18, padding: 22, boxShadow: "var(--shadow-md)", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px -2px rgba(37,99,235,.35)" }}><IconSpark size={16} /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{ai.panelTitle}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 0 3px rgba(16,185,129,.18)" }} />{ai.panelLive}
                  </div>
                </div>
              </div>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)", letterSpacing: ".06em", textTransform: "uppercase" }}>{ai.panelFeed}</span>
            </div>
            <div style={{ padding: 14, background: "#fff", border: "1px solid var(--accent-100)", borderRadius: 12, marginBottom: 12, boxShadow: "0 0 0 4px rgba(37,99,235,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--accent-600)", marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "adl-pulse 1.6s infinite" }} />
                <span className="mono" style={{ letterSpacing: ".05em" }}>{ai.analyzing} · {cur[0]}</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, minHeight: 42 }}>
                {phase === "typing" ? (
                  <>{ai.reviewing}<span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 4 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted-2)", animation: `adl-blink 1.2s ${i * 0.15}s infinite ease-in-out` }} />)}</span></>
                ) : <span style={{ animation: "adl-fade-in .3s ease" }}>{cur[1]}</span>}
              </div>
            </div>
            {ai.alerts.map((a, i) => (
              <div key={a.title} style={{ padding: 14, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, display: "flex", gap: 12, marginTop: i ? 10 : 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${a.color}14`, color: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{alertIcons[i]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{a.title}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)" }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{a.body}</div>
                  {"action" in a && a.action && (
                    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                      <button style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 500 }}>{a.action}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
function HowItWorks({ c }: { c: Copy }) {
  const icons = [<IconFolder key="f" size={22} />, <IconUsers key="u" size={22} />, <IconSpark key="s" size={22} />];
  return (
    <section className="section-pad" style={{ background: "var(--bg-alt)", position: "relative", overflow: "hidden" }}>
      <div className="container" style={{ position: "relative" }}>
        <Reveal>
          <div className="section-head">
            <div className="eyebrow"><span className="dot" />{c.how.eyebrow}</div>
            <h2>{c.how.h2a}<br />{c.how.h2b}</h2><p>{c.how.sub}</p>
          </div>
        </Reveal>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, position: "relative" }}>
          <svg viewBox="0 0 800 8" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", top: 38, left: "12%", width: "76%", height: 8, zIndex: 0 }}>
            <line x1="0" y1="4" x2="800" y2="4" stroke="var(--accent)" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>
          {c.how.steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 160} style={{ position: "relative", zIndex: 1 }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ width: 76, height: 76, borderRadius: 18, background: "#fff", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", boxShadow: "var(--shadow-sm)", marginBottom: 22, position: "relative" }}>
                  {icons[i]}
                  <span className="mono" style={{ position: "absolute", top: -10, right: -10, fontSize: 11, background: "var(--ink)", color: "#fff", padding: "3px 7px", borderRadius: 6, letterSpacing: ".04em" }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: 19, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: 340 }}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing (real PLAN_LIMITS) ──────────────────────────────────────────────
function Pricing({ c }: { c: Copy }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const p = c.pricing;
  const order: WorkspacePlan[] = ["solo", "studio", "agence"];
  const unit = (plan: WorkspacePlan): string[] => {
    const lim = PLAN_LIMITS[plan];
    const seats = `${lim.seats} ${lim.seats > 1 ? (c === COPY.fr ? "utilisateurs" : "users") : (c === COPY.fr ? "utilisateur" : "user")}`;
    const projects = lim.projects === null ? (c === COPY.fr ? "Projets illimités" : "Unlimited projects") : (c === COPY.fr ? `Jusqu’à ${lim.projects} projets` : `Up to ${lim.projects} projects`);
    const storage = c === COPY.fr ? `${lim.storageGb} Go de stockage` : `${lim.storageGb} GB storage`;
    return [seats, projects, storage];
  };
  return (
    <section id="pricing" className="section-pad">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <div className="eyebrow"><span className="dot" />{p.eyebrow}</div>
            <h2>{p.h2}</h2><p>{p.sub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 56 }}>
          <div style={{ display: "inline-flex", background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: 99, padding: 4 }}>
            {(["monthly", "yearly"] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)} style={{ padding: "8px 18px", borderRadius: 99, background: billing === b ? "#fff" : "transparent", color: billing === b ? "var(--ink)" : "var(--muted)", border: "none", fontSize: 14, fontWeight: 500, boxShadow: billing === b ? "0 1px 3px rgba(15,23,42,.08)" : "none", transition: "all .2s ease", display: "flex", alignItems: "center", gap: 8 }}>
                {b === "monthly" ? p.monthly : p.yearly}
                {b === "yearly" && <span className="mono" style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 99, background: billing === "yearly" ? "var(--accent-50)" : "transparent", color: billing === "yearly" ? "var(--accent-600)" : "var(--muted)", letterSpacing: ".04em" }}>{p.save}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, alignItems: "flex-start" }}>
          {order.map((plan, i) => {
            const lim = PLAN_LIMITS[plan];
            const featured = plan === "studio";
            const monthly = lim.monthlyPriceMad;
            const price = billing === "yearly" ? Math.round(monthly * 0.83) : monthly;
            const features = [...unit(plan), ...p.highlights[plan]];
            const includesLabel = plan === "solo" ? p.includes : p.includesPlus.replace("{p}", PLAN_LIMITS[order[i - 1] ?? "solo"].label);
            return (
              <Reveal key={plan} delay={i * 120}>
                <div className={featured ? "pricing-featured" : ""} style={{
                  position: "relative", padding: 32, borderRadius: 18,
                  background: featured ? "linear-gradient(180deg,#0B1220 0%,#1E293B 100%)" : "#fff",
                  color: featured ? "#fff" : "var(--ink)", border: featured ? "1px solid #1E293B" : "1px solid var(--line)",
                  boxShadow: featured ? "var(--shadow-lg)" : "var(--shadow-sm)", display: "flex", flexDirection: "column",
                  transform: featured ? "translateY(-12px)" : "translateY(0)",
                }}>
                  {featured && <span className="mono" style={{ position: "absolute", top: -12, left: 32, fontSize: 11, background: "var(--accent)", color: "#fff", padding: "4px 10px", borderRadius: 99, letterSpacing: ".06em", fontWeight: 500 }}>{p.popular}</span>}
                  <div className="mono" style={{ fontSize: 13, fontWeight: 500, color: featured ? "rgba(255,255,255,.7)" : "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{lim.label}</div>
                  <div style={{ marginTop: 6, fontSize: 14.5, color: featured ? "rgba(255,255,255,.7)" : "var(--muted)", lineHeight: 1.5 }}>{p.taglines[plan]}</div>
                  <div style={{ marginTop: 26, display: "flex", alignItems: "baseline", gap: 4 }}>
                    {monthly === 0 ? <span style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em" }}>{p.free}</span> : (
                      <>
                        <span style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>{price}</span>
                        <span style={{ fontSize: 15, color: featured ? "rgba(255,255,255,.6)" : "var(--muted-2)", marginLeft: 4 }}>{p.perMonth}</span>
                      </>
                    )}
                  </div>
                  <Link href="/signup" className="btn" style={{ marginTop: 24, justifyContent: "center", background: featured ? "var(--accent)" : (monthly === 0 ? "#fff" : "var(--ink)"), color: featured ? "#fff" : (monthly === 0 ? "var(--ink)" : "#fff"), border: monthly === 0 && !featured ? "1px solid var(--line)" : "1px solid transparent", boxShadow: featured ? "0 6px 16px -6px rgba(37,99,235,.5)" : "none" }}>{p.ctas[plan]}</Link>
                  <div style={{ height: 1, background: featured ? "rgba(255,255,255,.1)" : "var(--line-2)", margin: "28px 0 22px" }} />
                  <div className="mono" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 14, color: featured ? "rgba(255,255,255,.7)" : "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>{includesLabel}</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {features.map((f) => (
                      <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: featured ? "rgba(255,255,255,.85)" : "var(--ink-2)", lineHeight: 1.45 }}>
                        <span style={{ color: featured ? "#A5C5FF" : "var(--accent)", flexShrink: 0, marginTop: 2 }}><IconCheck size={15} /></span><span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 36, fontSize: 13.5, color: "var(--muted)" }}>{p.footnote}</div>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ({ c }: { c: Copy }) {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="section-pad" style={{ background: "var(--bg-alt)" }}>
      <div className="container" style={{ maxWidth: 880 }}>
        <Reveal>
          <div className="section-head" style={{ marginBottom: 48 }}>
            <div className="eyebrow"><span className="dot" />{c.faq.eyebrow}</div><h2>{c.faq.h2}</h2>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--line)", padding: "0 28px", boxShadow: "var(--shadow-sm)" }}>
            {c.faq.items.map(([q, a], i) => {
              const isOpen = open === i;
              return (
                <div key={q} style={{ borderBottom: i === c.faq.items.length - 1 ? "none" : "1px solid var(--line)" }}>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", textAlign: "left", padding: "22px 0", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{q}</span>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: isOpen ? "var(--accent-50)" : "var(--bg-alt)", color: isOpen ? "var(--accent)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "all .25s ease", flexShrink: 0 }}><IconChevron size={16} /></span>
                  </button>
                  <div style={{ maxHeight: isOpen ? 240 : 0, overflow: "hidden", transition: "max-height .35s ease, opacity .25s ease", opacity: isOpen ? 1 : 0 }}>
                    <div style={{ paddingBottom: 22, paddingRight: 60, fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>{a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "var(--muted)" }}>{c.faq.still} <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>{c.faq.talk}</Link></div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────
function FooterCTA({ c }: { c: Copy }) {
  const f = c.footerCta;
  return (
    <section style={{ padding: "88px 0" }}>
      <div className="container">
        <Reveal y={24}>
          <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#EFF4FF 0%,#F1F5FD 50%,#DBE6FE 100%)", border: "1px solid var(--accent-100)", borderRadius: 24, padding: "72px 56px", textAlign: "center" }}>
            <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right,rgba(37,99,235,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(37,99,235,.08) 1px,transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%,transparent 30%,black 100%)", WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%,transparent 30%,black 100%)" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: "clamp(32px,5vw,48px)", marginBottom: 16, letterSpacing: "-0.03em" }}>{f.h2a}<br />{f.h2b}</h2>
              <p style={{ fontSize: 17, maxWidth: 560, margin: "0 auto 32px", color: "var(--ink-2)" }}>{f.sub}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Link href="/signup" className="btn btn-accent">{f.ctaPrimary} <IconArrowRight size={15} /></Link>
                <Link href="/login" className="btn btn-ghost" style={{ background: "rgba(255,255,255,.7)" }}>{f.ctaSecondary}</Link>
              </div>
              <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>{f.trust}</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function Footer({ c }: { c: Copy }) {
  return (
    <footer style={{ background: "#FCFCFD", borderTop: "1px solid var(--line)", padding: "72px 0 32px" }}>
      <div className="container">
        <div className="foot-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 48, marginBottom: 56 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink)" }}>
              <span style={{ color: "var(--accent)", display: "inline-flex" }}><IconLogo size={22} /></span>
              <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.02em" }}>ArchiDesk</span>
            </div>
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>{c.footer.blurb}</p>
          </div>
          {c.footer.cols.map(([title, links]) => (
            <div key={title}>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 18 }}>{title}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(([label, href]) => (
                  <li key={label}>{href.startsWith("#") ? <a href={href} style={{ fontSize: 14, color: "var(--muted)" }}>{label}</a> : <Link href={href} style={{ fontSize: 14, color: "var(--muted)" }}>{label}</Link>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="hairline" />
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted-2)", flexWrap: "wrap", gap: 12 }}>
          <div>{c.footer.copyright}</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />{c.footer.status}
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const currentLocale = useLocale();
  const locale: Locale = currentLocale === "en" ? "en" : "fr";
  const c = COPY[locale];
  return (
    <main className="adl">
      <style>{ADL_CSS}</style>
      <Nav c={c} locale={locale} />
      <Hero c={c} />
      <TrustStrip c={c} />
      <Features c={c} locale={locale} />
      <AISection c={c} />
      <HowItWorks c={c} />
      <Pricing c={c} />
      <FAQ c={c} />
      <FooterCTA c={c} />
      <Footer c={c} />
    </main>
  );
}
