import type { Store } from '@/lib/repo';

/** 명당: 금색 왕관 핀 */
export const CROWN_PIN = `<svg width="38" height="46" viewBox="0 0 38 46" aria-hidden="true"><path d="M19 45c-1.2-4.5-15-16.5-15-27a15 15 0 0 1 30 0c0 10.5-13.8 22.5-15 27z" fill="#FFC94A" stroke="#0B0D1F" stroke-width="2"/><path d="M10.5 23.5l1.8-9 4.4 3.8L19 11l2.3 7.3 4.4-3.8 1.8 9z" fill="#0B0D1F"/><rect x="10.5" y="25" width="17" height="2.8" rx="1.4" fill="#0B0D1F"/></svg>`;

/** 일반 판매점 핀 */
export const STORE_PIN = `<svg width="26" height="32" viewBox="0 0 26 32" aria-hidden="true"><path d="M13 31c-1-3.2-10-11-10-18a10 10 0 0 1 20 0c0 7-9 14.8-10 18z" fill="#3987e5" stroke="#0B0D1F" stroke-width="2"/><circle cx="13" cy="13" r="4" fill="#fff"/></svg>`;

/** 핀 + 이름표. 이름은 외부 데이터이므로 innerHTML 이 아닌 textContent 로만 넣습니다. */
export function markerElement(store: Store, selected: boolean, onClick: () => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `zz-marker${selected ? ' zz-selected' : ''}`;
  el.setAttribute('aria-label', `${store.name}${store.is_hot ? ' (명당)' : ''}`);

  const wrap = document.createElement('span');
  wrap.className = 'zz-pinwrap';
  const pin = document.createElement('span');
  pin.className = 'zz-pin';
  pin.innerHTML = store.is_hot ? CROWN_PIN : STORE_PIN;
  const label = document.createElement('span');
  label.className = `zz-label${store.is_hot ? ' zz-label-hot' : ''}`;
  label.textContent = store.name;
  wrap.append(pin, label);
  el.append(wrap);

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

export function meElement(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'zz-me';
  el.setAttribute('aria-label', '내 위치');
  return el;
}
