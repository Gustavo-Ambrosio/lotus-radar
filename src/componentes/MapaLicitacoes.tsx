import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coordenadasDeLicitacao } from '../lib/geo';
import type { Licitacao } from '../lib/tipos';

interface Props {
  licitacoes: Licitacao[];
  onFiltrarMunicipio: (municipio: string) => void;
}

const CENTRO_NACIONAL: L.LatLngTuple = [-14.2, -51.9];
const ZOOM_INICIAL = 4;

export function MapaLicitacoes({ licitacoes, onFiltrarMunicipio }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<L.LayerGroup | null>(null);
  const aoFiltrarRef = useRef(onFiltrarMunicipio);
  aoFiltrarRef.current = onFiltrarMunicipio;

  const porMunicipio = useMemo(() => {
    const contagem = new Map<
      string,
      { municipio: string; uf: string; total: number; lat: number; lng: number }
    >();
    for (const lic of licitacoes) {
      if (!lic.municipio) continue;
      const chave = `${lic.uf}|${lic.municipio}`;
      const atual = contagem.get(chave);
      const coords = atual ? null : coordenadasDeLicitacao(lic.uf, lic.municipio);
      contagem.set(chave, {
        municipio: lic.municipio,
        uf: lic.uf,
        total: (atual?.total ?? 0) + 1,
        lat: atual?.lat ?? coords?.lat ?? 0,
        lng: atual?.lng ?? coords?.lng ?? 0,
      });
    }
    return [...contagem.entries()]
      .filter(([, dados]) => dados.lat !== 0 && dados.lng !== 0)
      .map(([chave, dados]) => ({ chave, ...dados }))
      .sort((a, b) => b.total - a.total);
  }, [licitacoes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mapa = L.map(el, { zoomControl: true, attributionControl: true }).setView(
      CENTRO_NACIONAL,
      ZOOM_INICIAL,
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
    const raioMaximo = porMunicipio[0]?.total ?? 1;

    for (const ponto of porMunicipio) {
      const latlng: L.LatLngExpression = [ponto.lat, ponto.lng];
      pontos.push(L.latLng(ponto.lat, ponto.lng));

      const raio = 5 + Math.round((ponto.total / raioMaximo) * 9);
      const marcador = L.circleMarker(latlng, {
        radius: raio,
        color: '#6d2ef1',
        weight: 1.5,
        fillColor: '#8b5cf6',
        fillOpacity: 0.75,
      });

      const rotulo = ponto.uf && ponto.uf !== 'BR' ? `${ponto.municipio} — ${ponto.uf}` : ponto.municipio;
      marcador.bindPopup(
        `<strong>${rotulo}</strong><br/>${ponto.total} ${
          ponto.total === 1 ? 'oportunidade' : 'oportunidades'
        }<br/><button class="mapa__filtro" type="button">Filtrar só aqui</button>`,
      );
      marcador.on('popupopen', () => {
        const btn = marcador
          .getPopup()
          ?.getElement()
          ?.querySelector<HTMLButtonElement>('.mapa__filtro');
        const aoFiltrar = aoFiltrarRef.current;
        if (btn) {
          btn.onclick = () => aoFiltrar(ponto.municipio);
        }
      });

      marcador.addTo(marcadores);
    }

    if (pontos.length > 0) {
      mapa.fitBounds(L.latLngBounds(pontos).pad(0.3), { maxZoom: 12 });
    } else {
      mapa.setView(CENTRO_NACIONAL, ZOOM_INICIAL);
    }
  }, [porMunicipio]);

  return (
    <div className="mapa__moldura" aria-label="Mapa das oportunidades por município do Brasil">
      <div ref={containerRef} className="mapa__mapa" />
      <p className="mapa__dica">
        Cada ponto representa um município; o tamanho indica o número de oportunidades. Clique em um
        ponto e depois em “Filtrar só aqui” para aplicar o filtro no mapa.
      </p>
    </div>
  );
}