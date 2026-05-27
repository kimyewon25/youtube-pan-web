"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import CountUp from "react-countup";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TreemapNode = {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  size?: number;
  depth?: number;
  index?: number;
};

function TreemapContent({
  x,
  y,
  width,
  height,
  name,
  size,
  depth,
  index,
}: TreemapNode) {
  if (width <= 0 || height <= 0) return null;

  const d = depth ?? 0;
  const i = index ?? 0;
  const hue = (215 + i * 27) % 360;
  const fill =
    d === 0 ? "hsl(var(--muted))" : `hsl(${hue} 86% 56% / 0.85)`;
  const stroke = "hsl(var(--border))";

  const showLabel = width >= 72 && height >= 40;
  const showSub = width >= 110 && height >= 60;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        rx={8}
        ry={8}
      />
      {showLabel ? (
        <>
          <text
            x={x + 10}
            y={y + 22}
            fill="white"
            fontSize={14}
            fontWeight={700}
          >
            {String(name ?? "")}
          </text>
          {showSub ? (
            <text x={x + 10} y={y + 42} fill="white" fontSize={12} opacity={0.9}>
              {typeof size === "number" ? `${size}회` : ""}
            </text>
          ) : null}
        </>
      ) : null}
    </g>
  );
}

type AnalyzeResponse = {
  video?: {
    video_id: string;
    title: string;
    channel: string;
    channel_id?: string;
    url: string;
    thumbnail_url?: string;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    duration?: number;
    upload_date?: string;
  };
  total_comments_fetched?: number;
  top_words?: { word: string; count: number }[];
  sentiment?: {
    positive: number;
    negative: number;
    neutral: number;
    positive_ratio: number;
    negative_ratio: number;
    neutral_ratio: number;
    average_score: number;
  };
  wordcloud_base64?: string;
  wordcloud_mime_type?: string;
  sample_comments?: { text: string; sentiment: string; score: number }[];
};

export default function Home() {
  const [url, setUrl] = useState<string>(
    "https://www.youtube.com/watch?v=_OEimioamfI",
  );
  const [maxComments, setMaxComments] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  const wordcloudSrc = useMemo(() => {
    if (!data?.wordcloud_base64 || !data?.wordcloud_mime_type) return null;
    return `data:${data.wordcloud_mime_type};base64,${data.wordcloud_base64}`;
  }, [data?.wordcloud_base64, data?.wordcloud_mime_type]);

  const sentimentPie = useMemo(() => {
    const s = data?.sentiment;
    if (!s) return [];
    return [
      { name: "긍정", value: s.positive, color: "hsl(142 76% 36%)" },
      { name: "중립", value: s.neutral, color: "hsl(215 16% 47%)" },
      { name: "부정", value: s.negative, color: "hsl(0 84% 60%)" },
    ];
  }, [data?.sentiment]);

  const sentimentStack = useMemo(() => {
    const s = data?.sentiment;
    if (!s) return null;
    return [
      {
        name: "감정 비율",
        긍정: Math.round((s.positive_ratio ?? 0) * 100),
        중립: Math.round((s.neutral_ratio ?? 0) * 100),
        부정: Math.round((s.negative_ratio ?? 0) * 100),
      },
    ];
  }, [data?.sentiment]);

  const topWords = useMemo(() => {
    const list = data?.top_words ?? [];
    return list
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [data?.top_words]);

  const topWordsPareto = useMemo(() => {
    const list = (data?.top_words ?? [])
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    const total = list.reduce((acc, x) => acc + (x.count ?? 0), 0) || 1;
    let running = 0;
    return list.map((x) => {
      running += x.count ?? 0;
      return {
        word: x.word,
        count: x.count,
        cumPct: Math.round((running / total) * 100),
      };
    });
  }, [data?.top_words]);

  const sampleSentiment = useMemo(() => {
    const list = data?.sample_comments ?? [];
    const counts = list.reduce(
      (acc, c) => {
        if (c.sentiment === "positive") acc.긍정 += 1;
        else if (c.sentiment === "negative") acc.부정 += 1;
        else acc.중립 += 1;
        return acc;
      },
      { 긍정: 0, 중립: 0, 부정: 0 },
    );
    return [
      { name: "긍정", value: counts.긍정, color: "hsl(142 76% 36%)" },
      { name: "중립", value: counts.중립, color: "hsl(215 16% 47%)" },
      { name: "부정", value: counts.부정, color: "hsl(0 84% 60%)" },
    ];
  }, [data?.sample_comments]);

  const scoreHistogram = useMemo(() => {
    const list = data?.sample_comments ?? [];
    const bins = [
      { label: "-1", key: -1, count: 0 },
      { label: "0", key: 0, count: 0 },
      { label: "+1", key: 1, count: 0 },
    ];
    for (const c of list) {
      const s = typeof c.score === "number" ? c.score : 0;
      const idx = s <= -0.5 ? 0 : s >= 0.5 ? 2 : 1;
      bins[idx].count += 1;
    }
    return bins;
  }, [data?.sample_comments]);

  const embedUrl = useMemo(() => {
    const id = data?.video?.video_id;
    if (!id) return null;
    const u = new URL(`https://www.youtube.com/embed/${id}`);
    u.searchParams.set("rel", "0");
    u.searchParams.set("modestbranding", "1");
    return u.toString();
  }, [data?.video?.video_id]);

  const videoMeta = useMemo(() => {
    const v = data?.video;
    if (!v) return null;

    const uploadDate = v.upload_date ? new Date(v.upload_date) : null;
    const durationSec = typeof v.duration === "number" ? v.duration : null;
    const mm = durationSec != null ? Math.floor(durationSec / 60) : null;
    const ss = durationSec != null ? durationSec % 60 : null;

    return {
      ...v,
      uploadDateText:
        uploadDate && !Number.isNaN(uploadDate.getTime())
          ? uploadDate.toLocaleString("ko-KR")
          : null,
      durationText:
        mm != null && ss != null
          ? `${mm}:${String(ss).padStart(2, "0")}`
          : null,
    };
  }, [data?.video]);

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiUrl = new URL("/api/analyze", window.location.origin);
      apiUrl.searchParams.set("url", url);
      apiUrl.searchParams.set("max_comments", String(maxComments));

      const res = await fetch(apiUrl.toString(), { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `API 오류 (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
        );
      }

      const json = (await res.json()) as AnalyzeResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">YouTube PAN</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            유튜브 링크를 넣고 댓글 감정/단어 지표를 확인하세요.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_140px] md:items-end">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                YouTube URL
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                max_comments
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={maxComments}
                onChange={(e) => setMaxComments(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={onAnalyze}
              disabled={loading || !url.trim()}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  분석 중...
                </span>
              ) : (
                "분석하기"
              )}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </section>

        {loading ? (
          <section className="mt-6 rounded-xl border bg-card p-10">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                댓글을 수집하고 분석 중입니다…
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !data ? (
          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 lg:col-span-2">
              <h2 className="text-base font-semibold">지금 할 일</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                유튜브 링크를 입력하고 <span className="font-medium">분석하기</span>
                를 누르면, 댓글 표본을 수집해 감정/단어 지표를 대시보드로 보여줍니다.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">STEP 1</div>
                  <div className="mt-1 font-medium">링크 붙여넣기</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    YouTube URL 입력
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">STEP 2</div>
                  <div className="mt-1 font-medium">댓글 수집</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    max_comments 만큼 표본
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">STEP 3</div>
                  <div className="mt-1 font-medium">대시보드 확인</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    감정/단어/차트/표
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border bg-muted/20 p-4">
                <div className="text-xs font-medium text-muted-foreground">
                  팁
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    표본 분석이므로{" "}
                    <span className="font-medium">max_comments</span>를 늘리면 더
                    안정적인 경향을 볼 수 있어요.
                  </li>
                  <li>
                    분석 결과에는 워드클라우드/Top words/Pareto/트리맵/테이블이
                    함께 표시됩니다.
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-base font-semibold">예시로 바로 테스트</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                아래 버튼을 누르면 입력칸에 예시 URL을 채웁니다.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  className="h-10 rounded-md border bg-background px-3 text-left text-sm hover:bg-accent"
                  onClick={() =>
                    setUrl("https://www.youtube.com/watch?v=_OEimioamfI")
                  }
                >
                  모아나 티저 예고편
                </button>
              </div>

              <div className="mt-5 rounded-lg border p-4">
                <div className="text-xs font-medium text-muted-foreground">
                  현재 제공 지표
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    감정 분포
                  </div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    Top words
                  </div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    Pareto
                  </div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    트리맵
                  </div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    워드클라우드
                  </div>
                  <div className="rounded-md border px-2 py-1 text-muted-foreground">
                    샘플 댓글
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {data ? (
          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 lg:col-span-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                영상
              </h2>

              <div className="mt-3 grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                  {videoMeta?.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={videoMeta.thumbnail_url}
                      alt="thumbnail"
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video w-full" />
                  )}

                  {videoMeta?.durationText ? (
                    <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                      {videoMeta.durationText}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="text-base font-semibold leading-snug">
                    {videoMeta?.title ?? "-"}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/90">
                      {videoMeta?.channel ?? "-"}
                    </span>
                    {videoMeta?.channel_id ? (
                      <span className="rounded-md border bg-background px-2 py-0.5 text-xs">
                        {videoMeta.channel_id}
                      </span>
                    ) : null}
                    {videoMeta?.video_id ? (
                      <span className="rounded-md border bg-background px-2 py-0.5 text-xs">
                        {videoMeta.video_id}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        조회수
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {typeof videoMeta?.view_count === "number" ? (
                          <CountUp
                            key={`view-${videoMeta.video_id}-${videoMeta.view_count}`}
                            end={videoMeta.view_count}
                            duration={1.1}
                            separator=","
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        좋아요
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {typeof videoMeta?.like_count === "number" ? (
                          <CountUp
                            key={`like-${videoMeta.video_id}-${videoMeta.like_count}`}
                            end={videoMeta.like_count}
                            duration={1.1}
                            separator=","
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">댓글</div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {typeof videoMeta?.comment_count === "number" ? (
                          <CountUp
                            key={`comment-${videoMeta.video_id}-${videoMeta.comment_count}`}
                            end={videoMeta.comment_count}
                            duration={1.1}
                            separator=","
                          />
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        업로드
                      </div>
                      <div className="mt-1 font-semibold">
                        {videoMeta?.uploadDateText ?? "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <a
                      href={videoMeta?.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-accent"
                    >
                      YouTube에서 열기
                    </a>
                    <div className="text-muted-foreground">
                      댓글 수집:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        <CountUp
                          key={`fetched-${videoMeta?.video_id ?? "x"}-${data.total_comments_fetched ?? 0}`}
                          end={data.total_comments_fetched ?? 0}
                          duration={0.8}
                          separator=","
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                감정 분포 (도넛)
              </h2>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      isAnimationActive
                    >
                      {sentimentPie.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid gap-2 text-sm">
                {sentimentPie.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                YouTube 미리보기
              </h2>
              <div className="mt-3 flex justify-center">
                <div className="w-full max-w-4xl overflow-hidden rounded-xl border bg-black">
                  <div className="aspect-video w-full">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title="YouTube player"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        embed 정보를 불러올 수 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                감정 비율 (100% 스택)
              </h2>
              <div className="mt-3 h-40 w-full">
                {sentimentStack ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sentimentStack}
                      layout="vertical"
                      margin={{ left: 8, right: 8, top: 10, bottom: 10 }}
                    >
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="name" hide />
                      <RechartsTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) =>
                              `${name}: ${Number(value)}%`
                            }
                          />
                        }
                      />
                      <Bar dataKey="긍정" stackId="a" fill="hsl(142 76% 36%)" />
                      <Bar dataKey="중립" stackId="a" fill="hsl(215 16% 47%)" />
                      <Bar dataKey="부정" stackId="a" fill="hsl(0 84% 60%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2 text-sm">
                {sentimentPie.map((s) => (
                  <div
                    key={`stack-${s.name}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {data.sentiment
                        ? `${Math.round(
                            (s.name === "긍정"
                              ? data.sentiment.positive_ratio
                              : s.name === "중립"
                                ? data.sentiment.neutral_ratio
                                : data.sentiment.negative_ratio) * 100,
                          )}%`
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                평균 점수 (게이지)
              </h2>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={[
                      {
                        name: "avg",
                        value:
                          typeof data.sentiment?.average_score === "number"
                            ? Math.round((data.sentiment.average_score + 1) * 50)
                            : 50,
                      },
                    ]}
                    innerRadius="70%"
                    outerRadius="95%"
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="hsl(221 83% 53%)"
                      background
                    />
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => `${Number(value)} / 100`}
                        />
                      }
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 rounded-md border p-3 text-sm">
                <div className="text-muted-foreground">average_score</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {typeof data.sentiment?.average_score === "number"
                    ? data.sentiment.average_score.toFixed(2)
                    : "-"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  표본({data.total_comments_fetched ?? 0}개) 기준
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                샘플 점수 분포
              </h2>
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreHistogram}
                    margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
                    barCategoryGap="18%"
                  >
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(221 83% 53%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                `sample_comments` 기준 (-1/0/+1 binning)
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Top words (막대)
              </h2>
              <div className="mt-3 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topWords}
                    margin={{ left: 0, right: 0, top: 8, bottom: 24 }}
                    barCategoryGap="12%"
                    barGap={2}
                  >
                    <XAxis
                      dataKey="word"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      tickMargin={10}
                    />
                    <YAxis tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            name === "count" ? `${value}회` : value
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="count"
                      radius={[6, 6, 0, 0]}
                      fill="hsl(221 83% 53%)"
                      isAnimationActive
                      maxBarSize={46}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                Top words (트리맵)
              </h2>
              <div className="mt-3 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={topWords.map((w) => ({ name: w.word, size: w.count }))}
                    dataKey="size"
                    nameKey="name"
                    stroke="hsl(var(--border))"
                    fill="hsl(var(--muted))"
                    aspectRatio={4 / 3}
                    isAnimationActive
                    content={(p) => <TreemapContent {...(p as TreemapNode)} />}
                  >
                    <RechartsTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            name === "size" ? `${value}회` : value
                          }
                        />
                      }
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                박스에 마우스를 올리면 툴팁이 표시됩니다.
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Top words Pareto (바 + 누적%)
              </h2>
              <div className="mt-3 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={topWordsPareto} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="word"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} width={28} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar
                      yAxisId="left"
                      dataKey="count"
                      fill="hsl(221 83% 53%)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumPct"
                      stroke="hsl(142 76% 36%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                샘플 감정 분포
              </h2>
              <div className="mt-3 grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sampleSentiment}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        isAnimationActive
                      >
                        {sampleSentiment.map((entry) => (
                          <Cell
                            key={`sample-${entry.name}`}
                            fill={entry.color}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2 text-sm">
                  {sampleSentiment.map((s) => (
                    <div
                      key={`sample-legend-${s.name}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full border"
                          style={{ backgroundColor: s.color }}
                          aria-hidden
                        />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{s.value}</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">
                    `sample_comments`(표본) 기준 분포
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                워드클라우드 (크게)
              </h2>
              {wordcloudSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wordcloudSrc}
                  alt="wordcloud-large"
                  className="mt-3 w-full rounded-xl border bg-muted/30"
                  style={{ minHeight: 420, objectFit: "contain" }}
                />
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                  워드클라우드 데이터가 없습니다.
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4 lg:col-span-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                샘플 댓글
              </h2>
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[96px]">감정</TableHead>
                      <TableHead className="w-[72px]">점수</TableHead>
                      <TableHead>댓글</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.sample_comments ?? []).map((c, idx) => {
                      const variant =
                        c.sentiment === "positive"
                          ? "default"
                          : c.sentiment === "negative"
                            ? "destructive"
                            : "secondary";
                      const label =
                        c.sentiment === "positive"
                          ? "긍정"
                          : c.sentiment === "negative"
                            ? "부정"
                            : "중립";
                      return (
                        <TableRow key={`${idx}-${c.text.slice(0, 12)}`}>
                          <TableCell>
                            <Badge variant={variant}>{label}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {typeof c.score === "number"
                              ? c.score.toFixed(1)
                              : "-"}
                          </TableCell>
                          <TableCell className="whitespace-pre-wrap">
                            {c.text}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
