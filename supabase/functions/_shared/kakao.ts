/** 카카오 로컬 API 로 주소 → 좌표 (KAKAO_REST_API_KEY 가 없으면 건너뜀) */
export async function geocodeAddress(address: string, restKey: string | undefined): Promise<{ lat: number; lng: number } | null> {
  if (!restKey) return null;
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${restKey}` } });
  if (!res.ok) return null;
  const body = (await res.json()) as { documents?: Array<{ x: string; y: string }> };
  const doc = body.documents?.[0];
  if (!doc) return null;
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
