import type { Metadata } from 'next';
import { MapView } from './MapView';

export const metadata: Metadata = { title: '명당 지도' };

export default function MapPage() {
  return <MapView />;
}
