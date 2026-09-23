import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MUNICIPIOS_PR } from '../lib/municipios-pr';
import type { Licitacao } from '../lib/tipos';

interface Props {
  licitacoes: Licitacao[];
  onFiltrarMunicipio: (municipio: string) => void;
}

const COORDS = new Map(MUNICIPIOS_PR.map((m) => [m.nome, m]));

export function MapaLicitacoes({ licitacoes, onFiltrarMunicipio }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<L.LayerGroup | null>(null);
  const aoFiltrarRef = useRef(onFiltrarMunicipio);
  aoFiltrarRef.current = onFiltrarMunicipio;

  const porMunicipio = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const lic of licitacoes) {
      if (!lic.municipio) continue;
      contagem.set(lic.municipio, (contagem.get(lic.municipio) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  }, [licitacoes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mapa = L.map(el, { zoomControl: true, attributionControl: true }).setView(
      [-24.85, -51.8],
      7,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    marcadoresRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;

    const redesenhar = () => mapa.invalidateSize();
    const timer = window.setTimeout(redesenhar, 50);
    window.addEventListener('resize', redesenhar);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', redesenhar);
      mapa.remove();
      mapaRef.current = null;
      marcadoresRef.current = null;
    };
  }, []);

  useEffect(() => {
    const marcadores = marcadoresRef.current;
    const mapa = mapaRef.current;
    if (!marcadores || !mapa) return;

    marcadores.clearLayers();
    const pontos: L.LatLng[] = [];
    const raioMaximo = porMunicipio[0]?.[1] ?? 1;

    for (const [municipio, total] of porMunicipio) {
      const coord = COORDS.get(municipio);
      if (!coord) continue;
      const latlng: L.LatLngExpression = [coord.lat, coord.lng];
      pontos.push(L.latLng(coord.lat, coord.lng));

      const raio = 5 + Math.round((total / raioMaximo) * 9);
      const marcador = L.circleMarker(latlng, {
        radius: raio,
        color: '#6d2ef1',
        weight: 1.5,
        fillColor: '#8b5cf6',
        fillOpacity: 0.75,
      });

      marcador.bindPopup(
        `<strong>${municipio}</strong><br/>${total} ${
          total === 1 ? 'oportunidade' : 'oportunidades'
        }<br/><button class="mapa__filtro" type="button">Filtrar só aqui</button>`,
      );
      marcador.on('popupopen', () => {
        const btn = marcador
          .getPopup()
          ?.getElement()
          ?.querySelector<HTMLButtonElement>('.mapa__filtro');
        const aoFiltrar = aoFiltrarRef.current;
        if (btn) {
          btn.onclick = () => aoFiltrar(municipio);
        }
      });

      marcador.addTo(marcadores);
    }

    if (pontos.length > 0) {
      mapa.fitBounds(L.latLngBounds(pontos).pad(0.3), { maxZoom: 9 });
    } else {
      mapa.setView([-24.85, -51.8], 7);
    }
  }, [porMunicipio]);

  return (
    <div className="mapa__moldura" aria-label="Mapa das oportunidades por município do Paraná">
      <div ref={containerRef} className="mapa__mapa" />
      <p className="mapa__dica">
        Cada ponto representa um município; o tamanho indica o número de oportunidades. Clique em um
        ponto e depois em “Filtrar só aqui” para aplicar o filtro no mapa.
      </p>
    </div>
  );
}