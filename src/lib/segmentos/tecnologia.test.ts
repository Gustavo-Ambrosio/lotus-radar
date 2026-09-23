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

  it('detecta suporte técnico e help desk', () => {
    const resultado = classificarTecnologia(
      'Contratação de help desk e service desk para atendimento ao usuário',
    );
    expect(resultado.categorias).toContain('ti-geral');
    expect(resultado.principal).toBe('ti-geral');
  });

  it('detecta outsourcing e serviços continuados de TI', () => {
    expect(classificarTecnologia('Outsourcing de TI com serviços continuados de suporte').categorias).toContain(
      'ti-geral',
    );
  });

  it('detecta suporte técnico em informática', () => {
    expect(classificarTecnologia('Prestação de serviços técnicos de informática e suporte em TI').categorias).toContain(
      'ti-geral',
    );
  });

  it('detecta administração e manutenção de servidores com Linux', () => {
    const resultado = classificarTecnologia(
      'Administração e manutenção de servidores com Linux e alta disponibilidade',
    );
    expect(resultado.categorias).toContain('infraestrutura');
  });

  it('detecta monitoramento de rede com Zabbix e Grafana', () => {
    const resultado = classificarTecnologia('Monitoramento de rede e servidores com Zabbix e Grafana (NOC)');
    expect(resultado.categorias).toContain('infraestrutura');
    expect(resultado.principal).toBe('infraestrutura');
  });

  it('detecta switches, roteadores e rede de dados', () => {
    expect(
      classificarTecnologia('Fornecimento de switches, roteadores e gerenciamento de rede de dados').categorias,
    ).toContain('infraestrutura');
  });

  it('detecta firewall NGFW, SD-WAN, VPN e EDR', () => {
    const resultado = classificarTecnologia(
      'Implementação de firewall NGFW, SD-WAN, VPN e antivírus corporativo com EDR e XDR',
    );
    expect(resultado.categorias).toContain('seguranca');
    expect(resultado.principal).toBe('seguranca');
  });

  it('detecta gestão de vulnerabilidades e serviços gerenciados de segurança', () => {
    expect(
      classificarTecnologia(
        'Serviços gerenciados de segurança com gestão de vulnerabilidades e proteção de servidores',
      ).categorias,
    ).toContain('seguranca');
  });

  it('não trata central de atendimento ao usuário do SUS como tecnologia', () => {
    expect(ehTecnologia('Central de atendimento ao usuário do SUS e agendamento de consultas')).toBe(false);
  });
});