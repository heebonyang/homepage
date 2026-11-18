import { useSiteSettings } from "./siteSettings";

// 0집 남은 수량 (불러오기 전에는 null). 관리자 페이지 '0집 CD'에서 정한 숫자.
// 사이트에는 숫자를 보여 주지 않고, 품절 표시와 주문 가능 수량에만 씀
export function useAlbumStock() {
  const settings = useSiteSettings();
  return settings ? { stock: settings.albumStock, total: settings.albumTotal } : null;
}
