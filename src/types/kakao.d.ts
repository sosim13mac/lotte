/* 카카오맵 JavaScript SDK 중 쫄깃로또가 쓰는 부분만 최소 타입 선언 */
declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    panTo(latlng: LatLng): void;
    getBounds(): LatLngBounds;
    setLevel(level: number): void;
    getLevel(): number;
    relayout(): void;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: HTMLElement | string;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    });
    setMap(map: Map | null): void;
    setZIndex(zIndex: number): void;
  }

  namespace event {
    function addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
    function removeListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
  }
}

interface Window {
  kakao?: { maps: typeof kakao.maps };
}
