import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const maxComments = searchParams.get("max_comments") ?? "20";

  if (!url) {
    return NextResponse.json(
      { error: "url 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const upstream = new URL(
    "https://youtube-pan-api-haqf.onrender.com/api/analyze",
  );
  upstream.searchParams.set("url", url);
  upstream.searchParams.set("max_comments", maxComments);

  const res = await fetch(upstream.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    // Next 캐시 비활성 (데모/대시보드에서 최신 응답을 보려는 목적)
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "application/json";
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": contentType,
    },
  });
}
