import { describe, expect, it } from 'vitest';
import { classificarTecnologia, ehTecnologia } from './tecnologia';

describe('classificarTecnologia', () => {
  it('detecta desenvolvimento de software', () => {
    expect(
      classificarTecnologia('Desenvolvimento de software sob medida para serviços públicos').categorias,
    ).toContain('software');
  });

  it('detecta aplicativo móvel', () => {
    expect(classificarTecnologia('Desenvolvimento de aplicativo móvel para o cidadão').categorias).toContain(
      'software',
    );
  });

  it('detecta infraestrutura de rede', () => {
    expect(
      classificarTecnologia('Cabeamento estruturado e rede de computadores para a prefeitura').categorias,
    ).toContain('infraestrutura');
  });

  it('detecta servidores e storage', () => {
    expect(classificarTecnologia('Fornecimento de servidores e storage para datacenter').categorias).toContain(
      'infraestrutura',
    );
  });

  it('detecta qualidade de software', () => {
    expect(classificarTecnologia('Serviços de garantia da qualidade de software').categorias).toContain(
      'qualidade',
    );
  });

  it('detecta testes de software', () => {
    expect(classificarTecnologia('Execução de testes automatizados de sistemas').categorias).toContain(
      'testes',
    );
  });

  it('detecta firewall e segurança', () => {
    const resultado = classificarTecnologia('Aquisição de firewall e serviços de segurança da informação');
    expect(resultado.categorias).toContain('seguranca');
  });

  it('detecta licenças de software', () => {
    expect(classificarTecnologia('Renovação de licenças de software de produtividade').categorias).toContain(
      'licencas',
    );
  });

  it('detecta computadores e impressoras como TI geral', () => {
    expect(classificarTecnologia('Aquisição de computadores e impressoras').categorias).toContain('ti-geral');
  });

  it('ignora sistema de esgoto', () => {
    expect(ehTecnologia('Execução de obra de saneamento e sistema de esgoto')).toBe(false);
  });

  it('ignora sistema de irrigação agrícola', () => {
    expect(ehTecnologia('Implementação de sistema de irrigação para agricultura')).toBe(false);
  });

  it('ignora sistema de som para eventos', () => {
    expect(ehTecnologia('Contratação de sistema de som para evento cultural')).toBe(false);
  });

  it('ignora placas eletrônicas de trânsito', () => {
    expect(ehTecnologia('Manutenção de placas eletrônicas de sinalização')).toBe(false);
  });

  it('ignora acento e caixa', () => {
    expect(ehTecnologia('DESENVOLVIMENTO DE SISTEMA INFORMATIZADO')).toBe(true);
  });
});