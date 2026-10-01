"use client";

import { useEffect, useRef, useState } from "react";

export type StoryStage = { label: string; title: string; points: string[]; side: "start" | "end" | "bottom"; from?: number; to?: number };

type Props = {
  videoUrl: string;
  mobileVideoUrl?: string;
  webmUrl?: string;
  poster: string;
  mobilePoster?: string;
  lengthVh: number;
  introLogo?: string;
  introCaption?: string;
  hint?: string;
  stages: StoryStage[];
  headerOverVideo: boolean;
  labels: { story: string; stage: string; skip: string; loading: string };
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const STAGE_START = 0.1;
const STAGE_END = 0.96;

/**
 * Full-screen scroll-controlled video.
 * A tall section holds a 100svh sticky viewport; page scroll progress (0→1)
 * is mapped to video.currentTime inside a requestAnimationFrame loop. All
 * per-frame updates write to the DOM directly (no React state), so scrolling
 * never re-renders the component.
 */
export function VideoStory(props: Props) {
  const { stages, labels } = props;
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const counter = useRef<HTMLElement>(null);
  const callouts = useRef<(HTMLDivElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stagesRef = useRef(stages);
  stagesRef.current = stages;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sec = section.current;
    const v = video.current;
    if (!sec || !v) return;
    if (reduced) {
      if (props.headerOverVideo) root.dataset.header = "over-video";
      const onScroll = () => {
        const over = sec.getBoundingClientRect().bottom > 72;
        if (props.headerOverVideo) root.dataset.header = over ? "over-video" : "";
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        delete root.dataset.header;
      };
    }

    // Pick the right file for the screen. The poster is already painted underneath.
    const small = window.matchMedia("(max-width: 767px)").matches;
    let src = small && props.mobileVideoUrl ? props.mobileVideoUrl : props.videoUrl;
    if (props.webmUrl && !v.canPlayType("video/mp4")) src = props.webmUrl;
    if (v.getAttribute("src") !== src) {
      v.src = src;
      v.load();
    }

    let duration = 0;
    let current = 0;
    let lastStage = -1;
    let raf = 0;
    let running = false;
    let headerState = "";

    const onMeta = () => {
      duration = Number.isFinite(v.duration) ? v.duration : 0;
    };
    const onData = () => {
      onMeta();
      setReady(true);
    };
    // Browsers without H.264 (some Linux/Firefox builds) fall back to the WebM file.
    const onError = () => {
      if (props.webmUrl && v.getAttribute("src") !== props.webmUrl) {
        v.src = props.webmUrl;
        v.load();
      }
    };
    v.addEventListener("error", onError);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("loadeddata", onData);
    if (v.readyState >= 1) onMeta();
    if (v.readyState >= 2) onData();

    // iOS Safari only renders seeks after the element has been "activated" once.
    const prime = () => {
      v.play()
        .then(() => v.pause())
        .catch(() => {});
      window.removeEventListener("touchstart", prime);
    };
    window.addEventListener("touchstart", prime, { passive: true, once: true });

    const frame = () => {
      raf = 0;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, sec.offsetHeight - vh);
      const p = clamp(-rect.top / total);

      // Video: ease toward the target time; skip while a seek is still in flight.
      if (duration) {
        const target = p * Math.max(0, duration - 0.04);
        current += (target - current) * 0.22;
        if (Math.abs(target - current) < 0.002) current = target;
        if (!v.seeking && Math.abs(v.currentTime - current) > 1 / 90) {
          try {
            v.currentTime = current;
          } catch {}
        }
      }

      // Intro logo fades and lifts away during the first few percent.
      if (intro.current) {
        const o = clamp(1 - p / 0.07);
        intro.current.style.opacity = String(o);
        intro.current.style.transform = `translateY(${(1 - o) * -40}px) scale(${1 + (1 - o) * 0.04})`;
      }
      if (hint.current) hint.current.style.opacity = String(clamp(1 - p / 0.03));

      // Feature callouts
      const span = (STAGE_END - STAGE_START) / Math.max(1, stagesRef.current.length);
      let active = -1;
      callouts.current.forEach((el, i) => {
        if (!el) return;
        // Each stage shows during its own slice of the story (editable in Admin), else an even split.
        const st = stagesRef.current[i];
        const from = st.from != null && st.to != null && st.to > st.from ? st.from / 100 : STAGE_START + i * span;
        const to = st.from != null && st.to != null && st.to > st.from ? st.to / 100 : from + span;
        const local = (p - from) / (to - from);
        const inn = clamp(local / 0.2);
        const out = clamp((1 - local) / 0.2);
        const o = local < 0 || local > 1 ? 0 : Math.min(inn, out);
        if (local >= 0 && local <= 1) active = i;
        el.style.opacity = String(o);
        el.style.setProperty("--shift", `${(1 - o) * 24}px`);
        const line = el.querySelector<HTMLElement>(".callout__line");
        if (line) line.style.transform = `scaleX(${inn})`;
      });
      if (active !== lastStage && counter.current) {
        lastStage = active;
        counter.current.textContent = String(Math.max(1, active + 1)).padStart(2, "0");
      }
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (hud.current) hud.current.classList.toggle("is-on", p > 0.02 && p < 0.995);

      // Header turns transparent while it sits over the video.
      const nextHeader = props.headerOverVideo && rect.bottom > 72 ? "over-video" : "";
      if (nextHeader !== headerState) {
        headerState = nextHeader;
        if (nextHeader) root.dataset.header = nextHeader;
        else delete root.dataset.header;
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    // Only run the loop while the story is on screen.
    const io = new IntersectionObserver(
      ([e]) => {
        running = e.isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(frame);
        if (!running) frame();
      },
      { rootMargin: "100px 0px" },
    );
    io.observe(sec);
    frame();

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      v.removeEventListener("error", onError);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("loadeddata", onData);
      window.removeEventListener("touchstart", prime);
      delete root.dataset.header;
    };
  }, [reduced, props.videoUrl, props.mobileVideoUrl, props.webmUrl, props.headerOverVideo, stages.length]);

  const skip = () => {
    const sec = section.current;
    if (!sec) return;
    const end = sec.offsetTop + sec.offsetHeight - window.innerHeight + 2;
    window.scrollTo({ top: end, behavior: "smooth" });
  };

  const poster = (
    <picture>
      {props.mobilePoster && <source media="(max-width: 767px)" srcSet={props.mobilePoster} />}
      <img className="story__poster" src={props.poster} alt="" fetchPriority="high" decoding="async" width={1920} height={1080} />
    </picture>
  );

  const introBlock =
    props.introLogo || props.introCaption ? (
      <div className="story__intro" ref={intro}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.introLogo && <img src={props.introLogo} alt="GOODMAX" width={560} height={125} />}
        {props.introCaption && <p>{props.introCaption}</p>}
      </div>
    ) : null;

  if (reduced) {
    return (
      <section ref={section} className="story story--static" aria-label={labels.story}>
        <div className="story__sticky">
          {poster}
          <video ref={video} hidden muted playsInline />
          <div className="story__shade" />
          {introBlock}
        </div>
        <div className="container story-static-list">
          {stages.map((s, i) => (
            <div key={i} className="callout">
              <div className="callout__label">
                {String(i + 1).padStart(2, "0")} / {s.label}
              </div>
              <div className="callout__line" />
              <h2>{s.title}</h2>
              <ul>
                {s.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} className="story" style={{ height: `${props.lengthVh}vh` }} aria-label={labels.story}>
      <div className="story__sticky">
        {poster}
        <video
          ref={video}
          className={`story__video${ready ? " is-ready" : ""}`}
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          poster={props.poster}
        />
        <div className="story__grid" />
        <div className="story__shade" />
        {introBlock}
        {props.hint && (
          <div className="story__hint" ref={hint} aria-hidden="true">
            {props.hint}
            <i />
          </div>
        )}
        {stages.map((s, i) => (
          <div
            key={i}
            ref={(el) => {
              callouts.current[i] = el;
            }}
            className={`callout callout--${s.side}`}
          >
            <div className="callout__label">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span>/</span>
              <span>{s.label}</span>
            </div>
            <div className="callout__line" />
            <h2>{s.title}</h2>
            <ul>
              {s.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
        {!ready && <div className="story__loading">{labels.loading}…</div>}
        <div className="story__hud" ref={hud}>
          <span className="story__counter" aria-hidden="true">
            <b ref={counter}>01</b> / {String(stages.length).padStart(2, "0")}
          </span>
          <span className="story__bar" aria-hidden="true">
            <i ref={bar} />
          </span>
          <button type="button" className="story__skip" onClick={skip}>
            {labels.skip}
          </button>
        </div>
      </div>
    </section>
  );
}
