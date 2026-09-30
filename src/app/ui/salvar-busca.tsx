import { acaoSalvarBusca } from '../acoes-busca';

/**
 * Botao "salvar esta busca" da home. Os filtros da URL vao como campos
 * escondidos porque a action precisa reconstituir o recorte — e a URL e' a
 * unica copia fiel dele (o componente pai ja a montou a partir dos mesmos
 * filtros que a tela mostra).
 */
export function SalvarBusca({ url }: { url: URLSearchParams }) {
  const campos = [...url.entries()].filter(([chave]) => chave !== 'pagina' && chave !== 'erro');

  return (
    <form action={acaoSalvarBusca} className="salvar-busca">
      {campos.map(([chave, valor]) => (
        <input key={chave} type="hidden" name={chave} value={valor} />
      ))}

      <input
        type="text"
        name="nome"
        className="salvar-busca__nome"
        placeholder="Nome da busca (opcional)"
        maxLength={120}
        aria-label="Nome da busca"
      />

      <label className="salvar-busca__alerta">
        <input type="checkbox" name="alertas" defaultChecked />
        <span>Alertar por e-mail</span>
      </label>

      <button type="submit" className="ferramenta">
        Salvar esta busca
      </button>
    </form>
  );
}
