import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const colors = {
  ink: "#16170E",
  ink2: "#34352B",
  ivory: "#F7F7F4",
  surface: "#FFFFFF",
  muted: "#82806F",
  border: "#E5E2DA",
  blue: "#2A45F0",
  blueSoft: "#E7F0FF",
  mint: "#2F8F5C",
  mintSoft: "#E5F3EB",
  gold: "#E8A317",
  goldSoft: "#FFF3D7",
  rose: "#C75B2E",
  roseSoft: "#FCEFE6",
  plum: "#6B3FA0",
  plumSoft: "#EFE8F8",
};

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const serifStack = 'Georgia, "Times New Roman", serif';

const sceneDuration = 150;
const fadeDuration = 18;

const layout: CSSProperties = {
  fontFamily: fontStack,
  background:
    "linear-gradient(135deg, #fbfbf8 0%, #f7f7f4 52%, #efeee8 100%)",
  color: colors.ink,
};

const gridBackground: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(42, 69, 240, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 69, 240, 0.055) 1px, transparent 1px)",
  backgroundSize: "52px 52px",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

function clamp(frame: number, input: [number, number], output: [number, number]) {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

function sceneFade(frame: number, duration: number) {
  const fadeIn = clamp(frame, [0, fadeDuration], [0, 1]);
  const fadeOut = clamp(frame, [duration - fadeDuration, duration], [1, 0]);
  return Math.min(fadeIn, fadeOut);
}

function SceneShell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = sceneFade(frame, durationInFrames);
  const y = clamp(frame, [0, 24], [24, 0]);

  return (
    <AbsoluteFill style={{ ...layout, ...gridBackground, opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 20%, rgba(42, 69, 240, 0.13), transparent 24%), radial-gradient(circle at 82% 76%, rgba(47, 143, 92, 0.12), transparent 25%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 54,
          display: "flex",
          alignItems: "center",
          gap: 18,
          transform: `translateY(${y}px)`,
        }}
      >
        <LogoMark />
        <div>
          <div style={{ fontSize: 28, fontWeight: 850, lineHeight: 1 }}>
            ArchiDesk
          </div>
          <div
            style={{
              color: colors.muted,
              fontSize: 18,
              fontWeight: 700,
              marginTop: 5,
            }}
          >
            {label}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "150px 82px 72px",
          transform: `translateY(${y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

function LogoMark() {
  return (
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: 16,
        background: colors.ink,
        color: colors.ivory,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: serifStack,
        fontSize: 38,
        fontWeight: 700,
        boxShadow: "0 18px 46px rgba(22, 23, 14, 0.22)",
      }}
    >
      A
    </div>
  );
}

function Headline({
  eyebrow,
  title,
  body,
  width = 780,
}: {
  eyebrow: string;
  title: string;
  body: string;
  width?: number;
}) {
  const frame = useCurrentFrame();
  const titleProgress = spring({
    frame: frame - 6,
    fps: 30,
    config: { damping: 20, stiffness: 95 },
  });
  const bodyOpacity = clamp(frame, [24, 48], [0, 1]);

  return (
    <div style={{ width }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          border: `1px solid ${colors.border}`,
          background: "rgba(255,255,255,0.78)",
          borderRadius: 999,
          padding: "10px 18px",
          color: colors.muted,
          fontSize: 18,
          fontWeight: 850,
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: colors.blue,
          }}
        />
        {eyebrow}
      </div>
      <h1
        style={{
          margin: "26px 0 0",
          fontFamily: serifStack,
          fontSize: 88,
          lineHeight: 0.96,
          fontWeight: 650,
          letterSpacing: 0,
          transform: `translateY(${(1 - titleProgress) * 34}px)`,
          opacity: titleProgress,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "26px 0 0",
          maxWidth: 680,
          color: colors.ink2,
          fontSize: 29,
          lineHeight: 1.32,
          fontWeight: 650,
          opacity: bodyOpacity,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function BrowserFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        boxShadow: "0 26px 90px rgba(22, 23, 14, 0.15)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          height: 54,
          borderBottom: `1px solid ${colors.border}`,
          background: "#FAFAF8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          {["#FF5F57", "#F2B705", "#2F8F5C"].map((color) => (
            <span
              key={color}
              style={{ width: 13, height: 13, borderRadius: 999, background: color }}
            />
          ))}
        </div>
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 999,
            padding: "8px 16px",
            color: colors.muted,
            fontSize: 15,
            fontWeight: 800,
            background: colors.surface,
          }}
        >
          Live studio workspace
        </div>
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  delay = 0,
}: {
  label: string;
  value: string;
  color: string;
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 18, stiffness: 120 },
  });

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        padding: 24,
        transform: `translateY(${(1 - progress) * 26}px)`,
        opacity: progress,
      }}
    >
      <div style={{ color: colors.muted, fontSize: 18, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: 34,
          lineHeight: 1.1,
          marginTop: 12,
          fontWeight: 950,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PhaseRow({
  label,
  status,
  value,
  color,
  delay,
}: {
  label: string;
  status: string;
  value: number;
  color: string;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const width = clamp(frame - delay, [0, 38], [0, value]);

  return (
    <div style={{ marginBottom: 27 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        <span>{label}</span>
        <span style={{ color: colors.muted }}>{status}</span>
      </div>
      <div
        style={{
          height: 11,
          borderRadius: 999,
          background: "#F0EEE8",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function AppDashboard() {
  const frame = useCurrentFrame();
  const cardIn = spring({
    frame: frame - 8,
    fps: 30,
    config: { damping: 22, stiffness: 90 },
  });

  return (
    <BrowserFrame
      style={{
        width: 1000,
        transform: `scale(${0.93 + cardIn * 0.07}) translateY(${(1 - cardIn) * 30}px)`,
        opacity: cardIn,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "246px 1fr", minHeight: 640 }}>
        <aside
          style={{
            borderRight: `1px solid ${colors.border}`,
            background: colors.surface,
            padding: 26,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 32 }}>
            <LogoMark />
            <div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>Atelier Studio</div>
              <div style={{ fontSize: 15, color: colors.muted, fontWeight: 700 }}>
                Architecture ops
              </div>
            </div>
          </div>
          {["Dashboard", "Projects", "Tasks", "Site", "Invoices"].map((item, index) => (
            <div
              key={item}
              style={{
                height: 48,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 16px",
                marginBottom: 8,
                background: index === 1 ? "#F2F2EE" : "transparent",
                color: index === 1 ? colors.ink : colors.muted,
                fontSize: 18,
                fontWeight: 850,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: index === 1 ? colors.blue : "#D8D5CA",
                }}
              />
              {item}
            </div>
          ))}
        </aside>
        <main style={{ background: "#F7F7F4", padding: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 26,
            }}
          >
            <div>
              <div
                style={{
                  color: colors.muted,
                  fontSize: 15,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Project health
              </div>
              <div style={{ marginTop: 8, fontSize: 36, fontWeight: 950 }}>
                Villa Anfa renovation
              </div>
            </div>
            <Pill color={colors.mint} background={colors.mintSoft}>
              Healthy
            </Pill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <StatCard label="Progress" value="68%" color={colors.blue} delay={8} />
            <StatCard label="Budget left" value="312k" color={colors.mint} delay={13} />
            <StatCard label="Open issues" value="7" color={colors.rose} delay={18} />
            <StatCard label="Approvals" value="4" color={colors.plum} delay={23} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 310px",
              gap: 18,
              marginTop: 20,
            }}
          >
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                padding: 26,
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 950, marginBottom: 24 }}>
                Architecture phases
              </div>
              <PhaseRow label="Concept" status="Done" value={100} color={colors.mint} delay={16} />
              <PhaseRow
                label="Design development"
                status="In review"
                value={74}
                color={colors.blue}
                delay={24}
              />
              <PhaseRow label="Permits" status="Waiting" value={42} color={colors.gold} delay={32} />
              <PhaseRow
                label="Site supervision"
                status="Upcoming"
                value={18}
                color={colors.rose}
                delay={40}
              />
            </div>
            <div
              style={{
                borderRadius: 16,
                background: colors.ink,
                color: colors.surface,
                padding: 24,
              }}
            >
              <div style={{ color: colors.gold, fontSize: 17, fontWeight: 950 }}>AI brief</div>
              <p style={{ fontSize: 20, lineHeight: 1.42, fontWeight: 650 }}>
                Permit approval is the main risk this week. Follow up on drawing set A-214.
              </p>
              {["Create follow-up", "Assign site photos", "Prepare client update"].map(
                (task) => (
                  <div
                    key={task}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginTop: 11,
                      fontSize: 16,
                      fontWeight: 750,
                    }}
                  >
                    {task}
                  </div>
                ),
              )}
            </div>
          </div>
        </main>
      </div>
    </BrowserFrame>
  );
}

function Pill({
  children,
  color,
  background,
}: {
  children: ReactNode;
  color: string;
  background: string;
}) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "10px 16px",
        color,
        background,
        fontSize: 17,
        fontWeight: 900,
      }}
    >
      {children}
    </div>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const panel = spring({
    frame: frame - 28,
    fps: 30,
    config: { damping: 20, stiffness: 78 },
  });

  return (
    <SceneShell label="AI Operating System for Architecture Firms">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Headline
          eyebrow="Architecture operations"
          title="Run the whole studio from one calm workspace."
          body="Projects, site reports, approvals, invoices, client communication, and AI follow-ups for architecture teams in Morocco."
          width={760}
        />
        <div
          style={{
            transform: `translateX(${(1 - panel) * 70}px) scale(${0.96 + panel * 0.04})`,
            opacity: panel,
          }}
        >
          <AppDashboard />
        </div>
      </div>
    </SceneShell>
  );
}

function WorkflowScene() {
  return (
    <SceneShell label="Project Control">
      <div style={{ display: "grid", gridTemplateColumns: "690px 1fr", gap: 72 }}>
        <Headline
          eyebrow="From first sketch to handover"
          title="Every architecture phase stays visible."
          body="Track phases, deadlines, tasks, BOQ items, files, site issues, and team workload without forcing the studio into generic task software."
          width={690}
        />
        <WorkflowBoard />
      </div>
    </SceneShell>
  );
}

function WorkflowBoard() {
  const items = [
    { title: "Concept", body: "Client brief, moodboards, first estimates", color: colors.mint },
    { title: "Permits", body: "Submission files, blockers, authority follow-up", color: colors.gold },
    { title: "Site supervision", body: "Visits, issues, photos, contractor actions", color: colors.rose },
    { title: "Handover", body: "Approvals, invoices, final document set", color: colors.plum },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 22,
        alignSelf: "center",
      }}
    >
      {items.map((item, index) => (
        <WorkflowCard key={item.title} item={item} delay={index * 9} />
      ))}
    </div>
  );
}

function WorkflowCard({
  item,
  delay,
}: {
  item: { title: string; body: string; color: string };
  delay: number;
}) {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay - 10,
    fps: 30,
    config: { damping: 19, stiffness: 95 },
  });

  return (
    <div
      style={{
        height: 250,
        borderRadius: 18,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        padding: 30,
        boxShadow: "0 22px 60px rgba(22, 23, 14, 0.09)",
        transform: `translateY(${(1 - progress) * 42}px)`,
        opacity: progress,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          background: item.color,
          marginBottom: 24,
        }}
      />
      <div style={{ fontSize: 29, fontWeight: 950, marginBottom: 12 }}>{item.title}</div>
      <div style={{ color: colors.ink2, fontSize: 22, lineHeight: 1.32, fontWeight: 650 }}>
        {item.body}
      </div>
    </div>
  );
}

function PortalScene() {
  return (
    <SceneShell label="Client Portal">
      <div style={{ display: "grid", gridTemplateColumns: "760px 1fr", gap: 66 }}>
        <ClientPortal />
        <Headline
          eyebrow="Client confidence"
          title="Share progress without losing control."
          body="Clients get a clean portal for files, approvals, invoices, and messages while the internal team keeps the operational source of truth."
          width={700}
        />
      </div>
    </SceneShell>
  );
}

function ClientPortal() {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 22, stiffness: 86 },
  });

  return (
    <BrowserFrame
      style={{
        alignSelf: "center",
        transform: `translateX(${(1 - progress) * -60}px)`,
        opacity: progress,
      }}
    >
      <div style={{ padding: 34, width: 760, minHeight: 560, background: "#F7F7F4" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: colors.muted, fontSize: 17, fontWeight: 900 }}>
              Client portal
            </div>
            <div style={{ fontSize: 38, fontWeight: 950, marginTop: 8 }}>Riad Lumiere</div>
          </div>
          <Pill color={colors.blue} background={colors.blueSoft}>
            Shared
          </Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 32 }}>
          <PortalTile label="Approvals" value="4 pending" color={colors.plum} />
          <PortalTile label="Files" value="28 shared" color={colors.blue} />
          <PortalTile label="Invoices" value="2 open" color={colors.gold} />
          <PortalTile label="Messages" value="12 updates" color={colors.mint} />
        </div>
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            background: colors.surface,
            marginTop: 22,
            padding: 26,
          }}
        >
          {["Validate revised lighting plan", "Review material moodboard", "Pay invoice FAC-0042"].map(
            (item, index) => (
              <ApprovalRow key={item} label={item} index={index} />
            ),
          )}
        </div>
      </div>
    </BrowserFrame>
  );
}

function PortalTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        padding: 24,
      }}
    >
      <div style={{ color: colors.muted, fontSize: 18, fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontSize: 30, fontWeight: 950, marginTop: 10 }}>{value}</div>
    </div>
  );
}

function ApprovalRow({ label, index }: { label: string; index: number }) {
  const frame = useCurrentFrame();
  const opacity = clamp(frame - index * 8, [20, 44], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 62,
        borderBottom: index === 2 ? "none" : `1px solid ${colors.border}`,
        opacity,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800 }}>{label}</div>
      <Pill color={colors.mint} background={colors.mintSoft}>
        Ready
      </Pill>
    </div>
  );
}

function AiScene() {
  return (
    <SceneShell label="AI Assistants">
      <div style={{ display: "grid", gridTemplateColumns: "700px 1fr", gap: 68 }}>
        <Headline
          eyebrow="Less admin, better follow-through"
          title="AI turns project noise into next actions."
          body="Meeting notes become decisions and tasks. Site observations become reports. Project risks become clear follow-ups before they slow the studio down."
          width={700}
        />
        <AiConsole />
      </div>
    </SceneShell>
  );
}

function AiConsole() {
  const frame = useCurrentFrame();
  const lines = [
    "Meeting summary generated",
    "6 decisions extracted",
    "9 action items assigned",
    "Friday client update drafted",
  ];

  return (
    <div
      style={{
        borderRadius: 24,
        background: colors.ink,
        color: colors.surface,
        padding: 36,
        minHeight: 610,
        alignSelf: "center",
        boxShadow: "0 30px 90px rgba(22, 23, 14, 0.24)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 34 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: colors.gold,
          }}
        />
        <div>
          <div style={{ fontSize: 28, fontWeight: 950 }}>ArchiDesk AI</div>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 18, fontWeight: 750 }}>
            Operational assistant
          </div>
        </div>
      </div>
      <div
        style={{
          borderRadius: 18,
          background: "rgba(255,255,255,0.08)",
          padding: 26,
          fontSize: 27,
          lineHeight: 1.38,
          fontWeight: 700,
          minHeight: 170,
        }}
      >
        {typewriter(
          "The permit package is blocked by missing client validation. Prepare a concise approval request and assign the site photo follow-up.",
          frame,
          16,
        )}
        <span style={{ color: colors.gold }}>_</span>
      </div>
      <div style={{ marginTop: 28 }}>
        {lines.map((line, index) => {
          const opacity = clamp(frame - index * 10, [42, 60], [0, 1]);
          const x = clamp(frame - index * 10, [42, 60], [24, 0]);

          return (
            <div
              key={line}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                padding: "17px 18px",
                marginBottom: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.07)",
                opacity,
                transform: `translateX(${x}px)`,
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: colors.mint,
                }}
              />
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function typewriter(text: string, frame: number, start: number) {
  const visible = Math.max(0, Math.floor((frame - start) * 1.9));
  return text.slice(0, visible);
}

function FinanceScene() {
  return (
    <SceneShell label="Budgets, Time, Invoices">
      <div style={{ display: "grid", gridTemplateColumns: "720px 1fr", gap: 62 }}>
        <FinancePanel />
        <Headline
          eyebrow="Profitability stays visible"
          title="See the business side before it becomes urgent."
          body="Budget left, unpaid invoices, recurring billing, time cost, and risk signals live next to the project work."
          width={720}
        />
      </div>
    </SceneShell>
  );
}

function FinancePanel() {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - 9,
    fps: 30,
    config: { damping: 20, stiffness: 90 },
  });

  return (
    <div
      style={{
        alignSelf: "center",
        borderRadius: 24,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        padding: 32,
        boxShadow: "0 28px 82px rgba(22, 23, 14, 0.13)",
        transform: `translateY(${(1 - progress) * 46}px)`,
        opacity: progress,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: colors.muted, fontSize: 18, fontWeight: 900 }}>
            Portfolio money view
          </div>
          <div style={{ fontSize: 42, fontWeight: 950, marginTop: 8 }}>1.84M MAD</div>
        </div>
        <Pill color={colors.mint} background={colors.mintSoft}>
          Margin protected
        </Pill>
      </div>
      <div style={{ marginTop: 34, display: "grid", gap: 18 }}>
        {[
          { label: "Planned budget", value: 88, color: colors.blue },
          { label: "Time cost consumed", value: 56, color: colors.gold },
          { label: "Invoices collected", value: 72, color: colors.mint },
          { label: "Unpaid exposure", value: 24, color: colors.rose },
        ].map((row, index) => (
          <FinanceBar key={row.label} row={row} delay={index * 8} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 30 }}>
        <PortalTile label="Recurring" value="6 active" color={colors.plum} />
        <PortalTile label="Late invoices" value="2 risks" color={colors.rose} />
      </div>
    </div>
  );
}

function FinanceBar({
  row,
  delay,
}: {
  row: { label: string; value: number; color: string };
  delay: number;
}) {
  const frame = useCurrentFrame();
  const width = clamp(frame - delay, [20, 54], [0, row.value]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          fontWeight: 850,
          marginBottom: 10,
        }}
      >
        <span>{row.label}</span>
        <span style={{ color: colors.muted }}>{row.value}%</span>
      </div>
      <div style={{ height: 15, borderRadius: 999, background: "#F0EEE8" }}>
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: 999,
            background: row.color,
          }}
        />
      </div>
    </div>
  );
}

function ClosingScene() {
  const frame = useCurrentFrame();
  const scale = spring({
    frame: frame - 16,
    fps: 30,
    config: { damping: 18, stiffness: 75 },
  });

  return (
    <SceneShell label="Architecture Studio OS">
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ width: 1120, transform: `scale(${0.94 + scale * 0.06})` }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
            <LogoMark />
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: serifStack,
              fontSize: 112,
              lineHeight: 0.96,
              fontWeight: 650,
              letterSpacing: 0,
            }}
          >
            ArchiDesk
          </h2>
          <p
            style={{
              margin: "28px auto 0",
              maxWidth: 920,
              color: colors.ink2,
              fontSize: 34,
              lineHeight: 1.28,
              fontWeight: 700,
            }}
          >
            The AI operating system for architects, decorators, and design studios.
          </p>
          <div
            style={{
              marginTop: 42,
              display: "flex",
              justifyContent: "center",
              gap: 14,
            }}
          >
            {["Projects", "Portal", "AI", "Invoices", "Reports"].map((item) => (
              <Pill key={item} color={colors.blue} background={colors.blueSoft}>
                {item}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </SceneShell>
  );
}

export function AppPresentation() {
  return (
    <AbsoluteFill style={layout}>
      <Sequence from={0} durationInFrames={180} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={180} durationInFrames={sceneDuration} premountFor={30}>
        <WorkflowScene />
      </Sequence>
      <Sequence from={330} durationInFrames={sceneDuration} premountFor={30}>
        <PortalScene />
      </Sequence>
      <Sequence from={480} durationInFrames={sceneDuration} premountFor={30}>
        <AiScene />
      </Sequence>
      <Sequence from={630} durationInFrames={sceneDuration} premountFor={30}>
        <FinanceScene />
      </Sequence>
      <Sequence from={780} durationInFrames={300} premountFor={30}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
}
