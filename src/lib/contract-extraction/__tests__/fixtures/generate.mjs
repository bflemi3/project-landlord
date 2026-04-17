// Generates synthetic DOCX contract fixtures for contract-extraction tests.
//
// Running this script twice produces byte-semantically identical DOCX content
// (aside from zip timestamps in the archive metadata). Each fixture is modeled
// on real-world rental-contract structure researched during Task 5 — clause
// ordering, section naming, and legal phrasing are idiomatic for each
// country/language, not invented.
//
// Usage:
//   node src/lib/contract-extraction/__tests__/fixtures/generate.mjs
//
// PDF conversion happens separately via LibreOffice — see fixtures/README.md.
//
// docx package version: 9.6.1 (pinned in devDependencies).

import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Authoring helpers
// ---------------------------------------------------------------------------

/** A simple paragraph of plain prose. */
const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  })

/** A paragraph with mixed bold / regular runs — used for "LABEL: value" lines. */
const pRuns = (runs, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    alignment: opts.alignment ?? AlignmentType.JUSTIFIED,
    children: runs.map(
      (r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italics }),
    ),
  })

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 180 },
    children: [new TextRun({ text, bold: true })],
  })

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true })],
  })

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true })],
  })

const blank = () => new Paragraph({ children: [new TextRun({ text: '' })] })

/**
 * Two-column table cell builder. Cells need real borders so the structure
 * survives mammoth's walker as table rows rather than inline text.
 */
const cell = (children, opts = {}) =>
  new TableCell({
    width: { size: opts.width ?? 50, type: WidthType.PERCENTAGE },
    children: Array.isArray(children) ? children : [children],
  })

const twoColTable = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            cell([pRuns([{ text: label, bold: true }])], { width: 35 }),
            cell([p(value)], { width: 65 }),
          ],
        }),
    ),
  })

/** Persist a Document to disk via the docx Packer. */
async function writeDoc(filename, doc) {
  const buffer = await Packer.toBuffer(doc)
  await writeFile(join(__dirname, filename), buffer)
  console.log(`wrote ${filename} (${buffer.length} bytes)`)
}

// ---------------------------------------------------------------------------
// PT-BR synthetic 1 — formal Quadro Resumo via table, IPCA annual adjustment
// Property: Apartment in São Paulo, SP. Two landlords, one tenant.
// ---------------------------------------------------------------------------

function ptBrSynthetic1() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Contrato de Locação Residencial',
    sections: [
      {
        children: [
          h1('CONTRATO DE LOCAÇÃO RESIDENCIAL'),
          blank(),
          h2('QUADRO RESUMO'),
          twoColTable([
            [
              '1. LOCADOR',
              'RICARDO MENDES SILVA, brasileiro, casado, engenheiro civil, portador do RG nº 22.145.887-1 SSP/SP e inscrito no CPF/MF sob o nº 321.654.987-00, residente e domiciliado na Rua Haddock Lobo, nº 1025, apto. 82, Cerqueira César, São Paulo, SP, CEP 01414-002.',
            ],
            [
              '2. LOCATÁRIAS',
              'MARIA APARECIDA FERREIRA, brasileira, solteira, médica veterinária, portadora do RG nº 18.776.221-4 SSP/SP e CPF nº 456.789.123-45, e JOÃO CARLOS OLIVEIRA, brasileiro, solteiro, analista de sistemas, RG nº 35.998.112-7 SSP/SP e CPF nº 789.123.456-78, residentes e domiciliados na Rua Teodoro Sampaio, nº 2140, apto. 54, Pinheiros, São Paulo, SP.',
            ],
            [
              '3. IMÓVEL LOCADO',
              'Apartamento nº 142, do 14º andar, Bloco A, do Edifício Residencial Jardins Prime, situado na Rua Bela Cintra, nº 1870, Jardim Paulista, São Paulo, SP, CEP 01415-002, composto de 3 (três) dormitórios, sendo 1 (uma) suíte, sala de estar/jantar, cozinha, área de serviço, banheiro social e 2 (duas) vagas de garagem demarcadas na subsolo.',
            ],
            ['4. ALUGUEL MENSAL', 'R$ 3.500,00 (três mil e quinhentos reais).'],
            ['5. VENCIMENTO', 'Todo dia 10 (dez) de cada mês.'],
            [
              '6. PRAZO',
              '12 (doze) meses, com início em 01 de março de 2026 e término em 28 de fevereiro de 2027.',
            ],
            ['7. DESTINAÇÃO', 'Residencial, uso exclusivo do núcleo familiar das LOCATÁRIAS.'],
            [
              '8. REAJUSTE',
              'Anualmente, pelo índice IPCA/IBGE acumulado nos últimos 12 (doze) meses, na data de aniversário do contrato.',
            ],
            [
              '9. GARANTIA',
              'Caução em dinheiro equivalente a 3 (três) aluguéis, nos termos do art. 37, I, da Lei nº 8.245/91.',
            ],
          ]),
          blank(),
          h2('DAS CLÁUSULAS E CONDIÇÕES'),
          p(
            'Pelo presente instrumento particular de locação residencial, de um lado RICARDO MENDES SILVA, doravante denominado LOCADOR, e de outro MARIA APARECIDA FERREIRA e JOÃO CARLOS OLIVEIRA, doravante denominados em conjunto LOCATÁRIAS, ambos já qualificados no Quadro Resumo acima, têm entre si, justo e contratado o seguinte:',
          ),
          blank(),
          h3('CLÁUSULA PRIMEIRA — DO OBJETO'),
          p(
            'O LOCADOR dá em locação às LOCATÁRIAS o imóvel descrito no campo (3) do Quadro Resumo, destinado exclusivamente à finalidade indicada no campo (7).',
          ),
          h3('CLÁUSULA SEGUNDA — DO ALUGUEL'),
          p(
            'O aluguel mensal, livremente convencionado entre as partes, é o valor constante do campo (4) do Quadro Resumo, a ser pago até a data estipulada no campo (5), mediante transferência bancária PIX para a conta de titularidade do LOCADOR (chave PIX: 321.654.987-00).',
          ),
          p(
            'PARÁGRAFO ÚNICO — O atraso no pagamento implicará multa de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA/IBGE, sem prejuízo das demais sanções previstas na Lei do Inquilinato.',
          ),
          h3('CLÁUSULA TERCEIRA — DO REAJUSTE'),
          p(
            'O aluguel será reajustado anualmente, na data de aniversário do contrato, conforme indicado no campo (8) do Quadro Resumo, pela variação acumulada do IPCA (Índice Nacional de Preços ao Consumidor Amplo) apurado pelo IBGE nos 12 (doze) meses imediatamente anteriores.',
          ),
          h3('CLÁUSULA QUARTA — DOS ENCARGOS'),
          p(
            'Correrão por conta das LOCATÁRIAS, além do aluguel, os seguintes encargos: (a) taxa condominial mensal paga à administradora HABITA GESTÃO PREDIAL LTDA., CNPJ 12.345.678/0001-90; (b) Imposto Predial e Territorial Urbano (IPTU) lançado pela Prefeitura Municipal de São Paulo; (c) energia elétrica fornecida pela ENEL DISTRIBUIÇÃO SÃO PAULO S.A., CNPJ 61.695.227/0001-93; (d) água e esgoto fornecidos pela COMPANHIA DE SANEAMENTO BÁSICO DO ESTADO DE SÃO PAULO – SABESP, CNPJ 43.776.517/0001-80; (e) gás encanado fornecido pela COMGÁS – COMPANHIA DE GÁS DE SÃO PAULO, CNPJ 61.856.571/0001-17.',
          ),
          p(
            'PARÁGRAFO ÚNICO — As LOCATÁRIAS obrigam-se a apresentar ao LOCADOR, sempre que solicitados, os comprovantes de quitação dos encargos acima.',
          ),
          h3('CLÁUSULA QUINTA — DO PRAZO'),
          p(
            'O prazo da locação é o estipulado no campo (6) do Quadro Resumo. Findo o prazo, não havendo manifestação escrita em sentido contrário com antecedência mínima de 30 (trinta) dias, o contrato passará a vigorar por prazo indeterminado, nos termos do art. 46, § 1º, da Lei nº 8.245/91.',
          ),
          h3('CLÁUSULA SEXTA — DA RESCISÃO ANTECIPADA'),
          p(
            'A rescisão antecipada pelas LOCATÁRIAS, antes de concluídos os primeiros 12 (doze) meses, sujeita-as ao pagamento de multa calculada proporcionalmente ao tempo restante do contrato, nos termos do art. 4º da Lei nº 8.245/91.',
          ),
          h3('CLÁUSULA SÉTIMA — DA GARANTIA'),
          p(
            'A garantia locatícia dar-se-á mediante caução em dinheiro equivalente a 3 (três) aluguéis, depositada em conta poupança conjunta em nome das partes, sendo devolvida ao término da locação, corrigida pelo IPCA, descontados eventuais débitos ou danos apurados na vistoria de saída.',
          ),
          h3('CLÁUSULA OITAVA — DO FORO'),
          p(
            'Fica eleito o foro da Comarca da Capital do Estado de São Paulo para dirimir quaisquer questões oriundas do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.',
          ),
          blank(),
          p(
            'E, por estarem assim justos e contratados, firmam o presente em 3 (três) vias de igual teor e forma, na presença das testemunhas abaixo identificadas.',
          ),
          blank(),
          p('São Paulo, 22 de fevereiro de 2026.', { alignment: AlignmentType.CENTER }),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('RICARDO MENDES SILVA — LOCADOR', { alignment: AlignmentType.CENTER, bold: true }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('MARIA APARECIDA FERREIRA — LOCATÁRIA', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('JOÃO CARLOS OLIVEIRA — LOCATÁRIO', { alignment: AlignmentType.CENTER, bold: true }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// PT-BR synthetic 2 — prose-only, informal, different clause ordering,
// different date format, house (not apartment), IGP-M adjustment.
// ---------------------------------------------------------------------------

function ptBrSynthetic2() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Contrato Particular de Locação',
    sections: [
      {
        children: [
          h1('CONTRATO PARTICULAR DE LOCAÇÃO DE IMÓVEL URBANO RESIDENCIAL'),
          blank(),
          p(
            'Pelo presente instrumento particular, e na melhor forma de direito, as partes a seguir identificadas ajustam e contratam entre si a locação do imóvel urbano residencial descrito na Cláusula Segunda, mediante as cláusulas e condições a seguir estabelecidas, que mutuamente aceitam e outorgam:',
          ),
          blank(),
          h2('CLÁUSULA PRIMEIRA — DAS PARTES CONTRATANTES'),
          p(
            'LOCADORA: ANA BEATRIZ SOUZA NASCIMENTO, brasileira, divorciada, advogada, inscrita na OAB/RJ sob o nº 145.632, portadora do RG nº 11.554.338-2 IFP/RJ e do CPF nº 123.987.654-32, residente e domiciliada na Rua Visconde de Pirajá, nº 550, apto. 702, Ipanema, Rio de Janeiro, RJ, CEP 22410-003, e-mail anabeatriz@exemplo.com.br.',
          ),
          p(
            'LOCATÁRIO: PEDRO HENRIQUE COSTA ALMEIDA, brasileiro, casado sob o regime da comunhão parcial de bens, jornalista, portador do RG nº 22.887.554-9 IFP/RJ e do CPF nº 654.321.987-01, residente e domiciliado na Rua Jardim Botânico, nº 618, apto. 303, Jardim Botânico, Rio de Janeiro, RJ.',
          ),
          blank(),
          h2('CLÁUSULA SEGUNDA — DO IMÓVEL LOCADO'),
          p(
            'Casa residencial situada à Rua Aristides Espínola, nº 88, bairro Leblon, cidade do Rio de Janeiro, Estado do Rio de Janeiro, CEP 22440-050, com dois pavimentos, três quartos (sendo uma suíte master), sala de estar, sala de jantar, cozinha, lavanderia, dois banheiros, quintal com piscina e vaga para dois veículos. O sobrado encontra-se em perfeito estado de conservação, conforme laudo de vistoria de entrada assinado pelas partes.',
          ),
          blank(),
          h2('CLÁUSULA TERCEIRA — DO PRAZO'),
          p(
            'A locação vigorará por um período de 30 (trinta) meses, com termo inicial em 15/04/2026 e término em 14/10/2028, independentemente de qualquer aviso ou notificação ao seu término.',
          ),
          blank(),
          h2('CLÁUSULA QUARTA — DO ALUGUEL MENSAL'),
          p(
            'O valor mensal do aluguel é de R$ 5.200,00 (cinco mil e duzentos reais), a ser pago pelo LOCATÁRIO à LOCADORA até o 1º (primeiro) dia útil de cada mês, mediante depósito ou transferência bancária para a conta corrente de titularidade da LOCADORA (Banco do Brasil, agência 1234-5, conta 67890-1, CPF 123.987.654-32).',
          ),
          p(
            'PARÁGRAFO ÚNICO — O aluguel será reajustado anualmente pelo IGP-M/FGV, ou, na sua falta ou extinção, pelo IPCA/IBGE, sempre na data de aniversário do presente contrato.',
          ),
          blank(),
          h2('CLÁUSULA QUINTA — DAS DESPESAS ACESSÓRIAS'),
          p(
            'Além do aluguel, correrão por conta exclusiva do LOCATÁRIO as despesas decorrentes do uso do imóvel, a saber: (i) IPTU lançado pela Prefeitura Municipal do Rio de Janeiro; (ii) tarifas de água e esgoto prestadas pela CEDAE – Companhia Estadual de Águas e Esgotos, CNPJ 33.352.394/0001-04; (iii) energia elétrica fornecida pela LIGHT SERVIÇOS DE ELETRICIDADE S.A., CNPJ 60.444.437/0001-46; (iv) serviço de internet e TV a cabo de livre escolha do LOCATÁRIO.',
          ),
          blank(),
          h2('CLÁUSULA SEXTA — DA GARANTIA'),
          p(
            'Em garantia do fiel cumprimento das obrigações assumidas, o LOCATÁRIO deposita, nesta data, a importância de R$ 15.600,00 (quinze mil e seiscentos reais), correspondente a 3 (três) aluguéis mensais, a título de caução, na forma do art. 37, I, da Lei nº 8.245/91.',
          ),
          blank(),
          h2('CLÁUSULA SÉTIMA — DAS OBRIGAÇÕES DO LOCATÁRIO'),
          p(
            'Obriga-se o LOCATÁRIO a: (a) utilizar o imóvel exclusivamente para fins residenciais; (b) pagar pontualmente o aluguel e demais encargos; (c) conservar o imóvel e proceder a pequenos reparos decorrentes do uso; (d) não realizar benfeitorias sem prévia autorização escrita da LOCADORA; (e) devolver o imóvel, ao final da locação, nas mesmas condições em que o recebeu, salvo o desgaste natural.',
          ),
          blank(),
          h2('CLÁUSULA OITAVA — DA RESCISÃO'),
          p(
            'Qualquer das partes poderá rescindir o presente contrato, antes do término do prazo pactuado, mediante notificação por escrito com antecedência mínima de 30 (trinta) dias, pagando a parte que der causa à rescisão multa equivalente a 3 (três) aluguéis, reduzida proporcionalmente ao tempo cumprido do contrato, nos termos do art. 4º da Lei do Inquilinato.',
          ),
          blank(),
          h2('CLÁUSULA NONA — DO FORO'),
          p(
            'As partes elegem o foro da Comarca da Capital do Estado do Rio de Janeiro, com expressa renúncia a qualquer outro, por mais privilegiado que seja, para dirimir as questões oriundas do presente contrato.',
          ),
          blank(),
          p(
            'E por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor, na presença das testemunhas abaixo.',
          ),
          blank(),
          p('Rio de Janeiro, 10 de abril de 2026.', { alignment: AlignmentType.CENTER }),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('ANA BEATRIZ SOUZA NASCIMENTO — LOCADORA', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('PEDRO HENRIQUE COSTA ALMEIDA — LOCATÁRIO', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// EN synthetic 1 — California residential lease, MM/DD/YYYY dates.
// ---------------------------------------------------------------------------

function enSynthetic1() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Residential Lease Agreement',
    sections: [
      {
        children: [
          h1('RESIDENTIAL LEASE AGREEMENT'),
          p(
            'This Residential Lease Agreement (the "Agreement") is made and entered into as of 03/05/2026 (the "Effective Date"), by and between the parties identified below.',
            { alignment: AlignmentType.JUSTIFIED },
          ),
          blank(),
          h2('1. PARTIES'),
          p(
            'LANDLORD: John Smith, an individual with a mailing address of 742 Evergreen Terrace, Los Angeles, CA 90026 (Tax ID: 123-45-6789).',
          ),
          p(
            'TENANT: Emily Carter, an individual with a mailing address of 1500 Wilshire Boulevard, Apt 215, Los Angeles, CA 90017 (Tax ID: 987-65-4321).',
          ),
          blank(),
          h2('2. PREMISES'),
          p(
            'Landlord hereby leases to Tenant, and Tenant hereby leases from Landlord, the residential apartment located at 3400 Sunset Boulevard, Unit 506, Los Angeles, California 90026 (the "Premises"). The Premises consists of two (2) bedrooms, two (2) bathrooms, one (1) assigned parking space, and approximately 1,050 square feet of living space.',
          ),
          blank(),
          h2('3. TERM'),
          p(
            'The term of this Agreement shall commence on 04/01/2026 and shall terminate on 03/31/2027 (the "Term"), unless sooner terminated in accordance with the provisions of this Agreement.',
          ),
          blank(),
          h2('4. RENT'),
          p(
            'Tenant agrees to pay Landlord monthly rent in the amount of $2,400.00 (two thousand four hundred dollars) in United States currency. Rent shall be due and payable in advance on the 1st day of each calendar month, without demand, offset, or deduction, by electronic transfer to the account designated in writing by Landlord.',
          ),
          p(
            'LATE CHARGES. Any rent payment received more than five (5) days after the due date shall be subject to a late charge equal to five percent (5%) of the overdue amount.',
          ),
          blank(),
          h2('5. RENT ADJUSTMENT'),
          p(
            'Upon each anniversary of the Effective Date, the monthly rent shall be adjusted by the percentage change in the Consumer Price Index for All Urban Consumers (CPI-U), Los Angeles–Long Beach–Anaheim area, as published by the U.S. Bureau of Labor Statistics over the preceding twelve (12) months.',
          ),
          blank(),
          h2('6. SECURITY DEPOSIT'),
          p(
            'Concurrently with the execution of this Agreement, Tenant shall deposit with Landlord the sum of $4,800.00 as a security deposit. The security deposit shall be held in accordance with California Civil Code §1950.5 and returned to Tenant, less any lawful deductions, within twenty-one (21) days following the termination of this Agreement.',
          ),
          blank(),
          h2('7. UTILITIES AND SERVICES'),
          p(
            'Tenant shall be responsible for the following utilities and services supplied to the Premises: (a) electricity, billed by Southern California Edison (EIN: 95-1240335); (b) gas service, billed by Southern California Gas Company (EIN: 95-1240705); (c) water and sewer, billed by the Los Angeles Department of Water and Power; (d) internet and cable television, at Tenant\'s option and expense. Landlord shall be responsible for trash collection and exterior landscaping.',
          ),
          blank(),
          h2('8. USE OF PREMISES'),
          p(
            'The Premises shall be used and occupied by Tenant exclusively as a private, single-family residence. Tenant shall not use the Premises for any unlawful purpose or in violation of any applicable federal, state, or local law or regulation.',
          ),
          blank(),
          h2('9. MAINTENANCE AND REPAIRS'),
          p(
            'Tenant shall maintain the Premises in a clean and sanitary condition and shall promptly notify Landlord in writing of any needed repairs. Landlord shall be responsible for major structural repairs, plumbing, and electrical systems, except where damage is caused by Tenant\'s negligence or misuse.',
          ),
          blank(),
          h2('10. DEFAULT AND REMEDIES'),
          p(
            'In the event Tenant fails to pay rent when due or otherwise breaches this Agreement, Landlord may, after providing a written three-day notice to pay or quit, pursue all remedies available under California law, including termination of the lease and recovery of possession of the Premises.',
          ),
          blank(),
          h2('11. GOVERNING LAW'),
          p(
            'This Agreement shall be governed by and construed in accordance with the laws of the State of California. Any action to enforce this Agreement shall be brought in the Superior Court of the State of California, County of Los Angeles.',
          ),
          blank(),
          p(
            'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date first above written.',
          ),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('John Smith — LANDLORD', { alignment: AlignmentType.CENTER, bold: true }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('Emily Carter — TENANT', { alignment: AlignmentType.CENTER, bold: true }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// EN synthetic 2 — Texas residential lease, "Month DD, YYYY" dates, different
// section ordering (TERM before PARTIES/PREMISES), two tenants, house.
// ---------------------------------------------------------------------------

function enSynthetic2() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Texas Residential Lease',
    sections: [
      {
        children: [
          h1('TEXAS RESIDENTIAL LEASE AGREEMENT'),
          blank(),
          h2('ARTICLE I — TERM OF LEASE'),
          p(
            'The term of this lease shall begin on June 1, 2026 and shall end on May 31, 2028, for a total duration of twenty-four (24) months, unless sooner terminated as herein provided.',
          ),
          blank(),
          h2('ARTICLE II — PARTIES'),
          p(
            'This lease agreement is entered into on May 15, 2026, between Margaret Anne Thompson, whose address is 4821 Lamar Boulevard, Austin, Texas 78751 (hereinafter referred to as "Landlord", SSN: 456-78-9012), and David Michael Reynolds and Jennifer Lynn Reynolds, husband and wife, whose current address is 2400 Guadalupe Street, Apt 14, Austin, Texas 78705 (hereinafter collectively referred to as "Tenant", SSNs: 234-56-7890 and 345-67-8901 respectively).',
          ),
          blank(),
          h2('ARTICLE III — PREMISES'),
          p(
            'Landlord hereby leases to Tenant the single-family residence commonly known as 1847 East 12th Street, Austin, Travis County, Texas 78702 (the "Leased Premises"), consisting of three (3) bedrooms, two (2) bathrooms, an attached two-car garage, and a fenced backyard of approximately 0.18 acres.',
          ),
          blank(),
          h2('ARTICLE IV — RENT'),
          p(
            'Tenant shall pay to Landlord as rent for the Leased Premises the sum of One Thousand Eight Hundred Fifty and 00/100 United States Dollars ($1,850.00) per month, payable in advance on or before the fifth (5th) day of each month during the Term.',
          ),
          p(
            'The first month\'s rent shall be paid upon execution of this lease. Subsequent payments shall be made by ACH transfer or certified funds to Landlord\'s designated account.',
          ),
          blank(),
          h2('ARTICLE V — RENT ESCALATION'),
          p(
            'Commencing on the first anniversary of the Term and each anniversary thereafter, the monthly rent shall be increased by the lesser of (i) three percent (3%) or (ii) the percentage increase in the Consumer Price Index for All Urban Consumers (CPI-U), South Region, as published by the U.S. Bureau of Labor Statistics.',
          ),
          blank(),
          h2('ARTICLE VI — SECURITY DEPOSIT'),
          p(
            'Tenant shall deposit with Landlord, upon execution of this lease, the sum of $1,850.00 as security for the faithful performance by Tenant of all terms, covenants, and conditions of this lease. The security deposit shall be returned in accordance with Chapter 92 of the Texas Property Code.',
          ),
          blank(),
          h2('ARTICLE VII — UTILITIES'),
          p(
            'Tenant shall pay, directly to the providers, all charges for utilities and services consumed at the Leased Premises, including but not limited to: (1) electricity, provided by Austin Energy (a division of the City of Austin); (2) water, wastewater, and trash collection, provided by Austin Water Utility; (3) natural gas, provided by Texas Gas Service (EIN: 74-1032546); (4) internet and telecommunications services, at Tenant\'s option. Landlord shall pay for pest control and quarterly HVAC servicing.',
          ),
          blank(),
          h2('ARTICLE VIII — MAINTENANCE'),
          p(
            'Tenant acknowledges that the Leased Premises is in good and habitable condition. Tenant shall keep and maintain the Leased Premises in clean and sanitary condition and shall be responsible for the cost of any repairs required due to Tenant\'s negligence, misuse, or abuse.',
          ),
          blank(),
          h2('ARTICLE IX — USE AND OCCUPANCY'),
          p(
            'The Leased Premises shall be used as a private single-family residence only, and shall not be occupied by more than four (4) persons without the prior written consent of Landlord. No commercial activity shall be conducted on the Leased Premises.',
          ),
          blank(),
          h2('ARTICLE X — PETS'),
          p(
            'Tenant is permitted to keep up to two (2) domesticated dogs weighing no more than 40 pounds each, upon payment of a non-refundable pet fee of $300.00 per animal and an additional monthly pet rent of $25.00 per animal.',
          ),
          blank(),
          h2('ARTICLE XI — DEFAULT'),
          p(
            'Any failure by Tenant to pay rent within five (5) days of the due date, or any material breach of any other covenant of this lease, shall constitute a default. Upon default, Landlord may pursue all remedies available under Texas law, including filing a forcible entry and detainer action in the Justice of the Peace Court of Travis County.',
          ),
          blank(),
          h2('ARTICLE XII — GOVERNING LAW AND VENUE'),
          p(
            'This lease shall be governed by the laws of the State of Texas. Venue for any dispute arising out of this lease shall lie exclusively in the courts of Travis County, Texas.',
          ),
          blank(),
          p(
            'EXECUTED in duplicate originals on the date first written above, each party acknowledging receipt of a fully executed copy.',
          ),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('Margaret Anne Thompson — LANDLORD', { alignment: AlignmentType.CENTER, bold: true }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('David Michael Reynolds — TENANT', { alignment: AlignmentType.CENTER, bold: true }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('Jennifer Lynn Reynolds — TENANT', { alignment: AlignmentType.CENTER, bold: true }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// ES synthetic 1 — Mexican contrato de arrendamiento, RFC + CURP, MXN.
// ---------------------------------------------------------------------------

function esSynthetic1() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Contrato de Arrendamiento',
    sections: [
      {
        children: [
          h1('CONTRATO DE ARRENDAMIENTO DE CASA HABITACIÓN'),
          blank(),
          p(
            'CONTRATO DE ARRENDAMIENTO que celebran por una parte, en calidad de ARRENDADOR, el C. CARLOS EDUARDO MARTÍNEZ RAMÍREZ, y por la otra, en calidad de ARRENDATARIA, la C. SOFÍA ALEJANDRA GÓMEZ HERRERA, al tenor de las siguientes DECLARACIONES y CLÁUSULAS:',
          ),
          blank(),
          h2('DECLARACIONES'),
          h3('I. Declara el ARRENDADOR:'),
          p(
            'a) Ser persona física, de nacionalidad mexicana, mayor de edad, con plena capacidad jurídica para contratar y obligarse, con Registro Federal de Contribuyentes MARC-850712-H24 y CURP MARC850712HDFRMR09, con domicilio en Avenida de los Insurgentes Sur número 1425, interior 502, colonia Del Valle Centro, Alcaldía Benito Juárez, Ciudad de México, código postal 03100.',
          ),
          p(
            'b) Ser legítimo propietario del inmueble que más adelante se describe y cuya propiedad acredita con la escritura pública número 45.782, volumen 203, otorgada ante la fe del Notario Público número 127 de la Ciudad de México.',
          ),
          h3('II. Declara la ARRENDATARIA:'),
          p(
            'a) Ser persona física, de nacionalidad mexicana, mayor de edad, soltera, con Registro Federal de Contribuyentes GOHS-920318-KL4 y CURP GOHS920318MDFMHF05, con domicilio actual en Calle Amatlán número 88, colonia Condesa, Alcaldía Cuauhtémoc, Ciudad de México.',
          ),
          p(
            'b) Que tiene interés en tomar en arrendamiento el inmueble objeto de este contrato para destinarlo exclusivamente a casa habitación.',
          ),
          blank(),
          h2('CLÁUSULAS'),
          h3('PRIMERA. DEL OBJETO'),
          p(
            'El ARRENDADOR da en arrendamiento a la ARRENDATARIA el departamento ubicado en Avenida Nuevo León número 247, interior 8, colonia Hipódromo Condesa, Alcaldía Cuauhtémoc, Ciudad de México, código postal 06100, el cual cuenta con 2 (dos) recámaras, sala-comedor, cocina integral, 2 (dos) baños completos y 1 (un) cajón de estacionamiento.',
          ),
          blank(),
          h3('SEGUNDA. DEL DESTINO'),
          p(
            'El inmueble objeto del presente contrato será destinado única y exclusivamente para casa habitación de la ARRENDATARIA, quedando prohibido cualquier uso distinto, incluyendo el comercial o industrial, así como el subarrendamiento total o parcial del inmueble sin consentimiento previo y por escrito del ARRENDADOR.',
          ),
          blank(),
          h3('TERCERA. DE LA VIGENCIA'),
          p(
            'La vigencia del presente contrato será de 12 (doce) meses forzosos para ambas partes, iniciando el día 1 de mayo de 2026 y concluyendo el 30 de abril de 2027. Al término del plazo, si ninguna de las partes notifica su intención en contrario con al menos 30 (treinta) días naturales de anticipación, el contrato se prorrogará por períodos iguales conforme al artículo 2486 del Código Civil para la Ciudad de México.',
          ),
          blank(),
          h3('CUARTA. DE LA RENTA'),
          p(
            'La renta mensual pactada por ambas partes es la cantidad de $18,500.00 (DIECIOCHO MIL QUINIENTOS PESOS 00/100 MONEDA NACIONAL), que la ARRENDATARIA se obliga a pagar al ARRENDADOR por mensualidades adelantadas, a más tardar el día 5 (cinco) de cada mes, mediante transferencia electrónica interbancaria (SPEI) a la cuenta CLABE 012180001234567890 del banco BBVA México, a nombre del ARRENDADOR.',
          ),
          blank(),
          h3('QUINTA. DEL INCREMENTO DE LA RENTA'),
          p(
            'La renta se incrementará anualmente, a partir del primer aniversario del presente contrato, conforme al Índice Nacional de Precios al Consumidor (INPC) publicado por el Instituto Nacional de Estadística y Geografía (INEGI), tomando como referencia la variación acumulada en los doce meses inmediatos anteriores.',
          ),
          blank(),
          h3('SEXTA. DEL DEPÓSITO EN GARANTÍA'),
          p(
            'En este acto, la ARRENDATARIA entrega al ARRENDADOR la cantidad de $37,000.00 (TREINTA Y SIETE MIL PESOS 00/100 M.N.), equivalente a 2 (dos) meses de renta, por concepto de depósito en garantía, el cual será reintegrado al término del contrato, previo descuento de los adeudos pendientes y los daños que, en su caso, presente el inmueble.',
          ),
          blank(),
          h3('SÉPTIMA. DE LOS SERVICIOS'),
          p(
            'Serán por cuenta exclusiva de la ARRENDATARIA los siguientes servicios consumidos en el inmueble: (a) energía eléctrica suministrada por la Comisión Federal de Electricidad (CFE), RFC CFE-370814-QI0; (b) agua potable suministrada por el Sistema de Aguas de la Ciudad de México (SACMEX); (c) gas natural suministrado por Gas Natural México, S.A. de C.V., RFC GNM-970509-KV7; (d) servicio de internet y telefonía de libre elección de la ARRENDATARIA. Las cuotas del régimen de propiedad en condominio correrán por cuenta del ARRENDADOR.',
          ),
          blank(),
          h3('OCTAVA. DE LA CONSERVACIÓN DEL INMUEBLE'),
          p(
            'La ARRENDATARIA se obliga a conservar el inmueble en el mismo buen estado en que lo recibe, realizando a su costa las reparaciones menores derivadas del uso ordinario. Las reparaciones mayores, estructurales o de instalaciones hidráulicas, sanitarias o eléctricas, correrán por cuenta del ARRENDADOR, salvo que sean consecuencia de uso indebido por parte de la ARRENDATARIA.',
          ),
          blank(),
          h3('NOVENA. DE LA RESCISIÓN'),
          p(
            'Serán causas de rescisión del presente contrato, sin necesidad de declaración judicial, las siguientes: (i) la falta de pago de dos mensualidades consecutivas de renta; (ii) el uso del inmueble para fines distintos a los pactados; (iii) el subarrendamiento no autorizado; (iv) el incumplimiento de cualquiera otra obligación derivada del presente contrato o de la legislación aplicable.',
          ),
          blank(),
          h3('DÉCIMA. DE LA JURISDICCIÓN'),
          p(
            'Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que por razón de su domicilio presente o futuro pudiera corresponderles.',
          ),
          blank(),
          p(
            'Leído que fue el presente contrato por ambas partes y enteradas de su contenido, alcance y consecuencias legales, lo firman por duplicado en la Ciudad de México, a los 20 (veinte) días del mes de abril de 2026.',
          ),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('C. CARLOS EDUARDO MARTÍNEZ RAMÍREZ — ARRENDADOR', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('C. SOFÍA ALEJANDRA GÓMEZ HERRERA — ARRENDATARIA', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// ES synthetic 2 — Spanish (Spain) contrato de arrendamiento de vivienda,
// DNI, euros, different terminology (vivienda, fianza), LAU references.
// ---------------------------------------------------------------------------

function esSynthetic2() {
  return new Document({
    creator: 'Mabenn test fixtures',
    title: 'Contrato de Arrendamiento de Vivienda',
    sections: [
      {
        children: [
          h1('CONTRATO DE ARRENDAMIENTO DE VIVIENDA'),
          blank(),
          p('En Madrid, a 18 de marzo de 2026.', { alignment: AlignmentType.RIGHT }),
          blank(),
          h2('REUNIDOS'),
          p(
            'De una parte, DON JAVIER ROMERO FERNÁNDEZ, mayor de edad, de nacionalidad española, con domicilio a estos efectos en Calle Velázquez nº 87, 4º izquierda, 28006 Madrid, provisto de DNI número 05.678.432-B, actuando en su propio nombre y derecho (en adelante, el "ARRENDADOR").',
          ),
          p(
            'De otra parte, DOÑA LUCÍA MORENO VÁZQUEZ, mayor de edad, de nacionalidad española, con domicilio en Calle Fuencarral nº 120, 2º derecha, 28010 Madrid, provista de DNI número 50.123.987-K, actuando en su propio nombre y derecho (en adelante, la "ARRENDATARIA").',
          ),
          blank(),
          h2('EXPONEN'),
          p(
            'I. Que el ARRENDADOR es propietario en pleno dominio de la vivienda sita en Calle Hermosilla nº 45, planta 3ª puerta B, 28001 Madrid, con referencia catastral 0678901VK4707N0012DR, finca registral nº 18.234 del Registro de la Propiedad nº 27 de Madrid.',
          ),
          p(
            'II. Que la ARRENDATARIA se halla interesada en la toma en arrendamiento de dicha vivienda, destinándola a satisfacer su necesidad permanente de vivienda habitual.',
          ),
          p(
            'III. Que reconociéndose mutuamente capacidad legal suficiente, las partes convienen formalizar el presente contrato de arrendamiento de vivienda conforme a la Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos, con arreglo a las siguientes',
          ),
          blank(),
          h2('CLÁUSULAS'),
          h3('PRIMERA. OBJETO DEL CONTRATO'),
          p(
            'Mediante el presente contrato, el ARRENDADOR arrienda a la ARRENDATARIA, que acepta, la vivienda descrita en el Expositivo I anterior. La vivienda, de 95 metros cuadrados construidos, consta de tres dormitorios, salón-comedor, cocina equipada, dos cuartos de baño, terraza orientada al sur, y plaza de garaje vinculada número 14 en la planta sótano del mismo edificio.',
          ),
          blank(),
          h3('SEGUNDA. DESTINO'),
          p(
            'La vivienda objeto del presente contrato se destinará exclusivamente a vivienda habitual y permanente de la ARRENDATARIA, quedando expresamente prohibido cualquier otro uso, así como la cesión o subarriendo, total o parcial, salvo autorización expresa y por escrito del ARRENDADOR.',
          ),
          blank(),
          h3('TERCERA. DURACIÓN'),
          p(
            'El plazo de duración del presente contrato se establece en UN (1) AÑO, con inicio el día 1 de abril de 2026 y finalización el 31 de marzo de 2027. No obstante, llegada la fecha de vencimiento, el contrato se prorrogará obligatoriamente por plazos anuales hasta que el arrendamiento alcance una duración mínima de cinco (5) años, conforme a lo dispuesto en el artículo 9 de la Ley 29/1994.',
          ),
          blank(),
          h3('CUARTA. RENTA'),
          p(
            'La renta pactada por ambas partes asciende a MIL DOSCIENTOS EUROS (1.200,00 €) mensuales, que la ARRENDATARIA se compromete a satisfacer por mensualidades anticipadas, dentro de los siete (7) primeros días naturales de cada mes, mediante transferencia bancaria a la cuenta ES21 0049 0001 50 2345678901 titularidad del ARRENDADOR.',
          ),
          blank(),
          h3('QUINTA. ACTUALIZACIÓN DE LA RENTA'),
          p(
            'La renta se actualizará anualmente, en la fecha en que se cumpla cada año de vigencia del contrato, aplicando la variación porcentual experimentada por el Índice de Precios al Consumo (IPC) general nacional publicado por el Instituto Nacional de Estadística (INE) en los doce meses inmediatamente anteriores a la fecha de actualización.',
          ),
          blank(),
          h3('SEXTA. FIANZA Y GARANTÍAS ADICIONALES'),
          p(
            'A la firma del presente contrato, la ARRENDATARIA entrega al ARRENDADOR, en metálico, la cantidad de 1.200,00 € equivalente a una (1) mensualidad de renta, en concepto de fianza legal obligatoria, conforme al artículo 36 de la Ley 29/1994. La fianza será depositada por el ARRENDADOR en el Instituto de la Vivienda de Madrid (IVIMA) dentro del plazo legal.',
          ),
          p(
            'Adicionalmente, la ARRENDATARIA entrega la suma de 2.400,00 € como garantía complementaria, equivalente a dos (2) mensualidades de renta, conforme permite el artículo 36.5 de la citada Ley.',
          ),
          blank(),
          h3('SÉPTIMA. GASTOS Y SUMINISTROS'),
          p(
            'Serán de cuenta de la ARRENDATARIA los siguientes gastos y suministros vinculados al uso efectivo de la vivienda: (a) energía eléctrica contratada con Iberdrola Clientes, S.A.U., CIF A-95758389; (b) suministro de agua prestado por Canal de Isabel II, S.A., CIF A-86488087; (c) gas natural contratado con Naturgy Iberia, S.A., CIF A-61797536; (d) internet y telefonía, a libre elección de la ARRENDATARIA. Serán de cuenta del ARRENDADOR los gastos de comunidad de propietarios y el Impuesto sobre Bienes Inmuebles (IBI).',
          ),
          blank(),
          h3('OCTAVA. CONSERVACIÓN Y OBRAS'),
          p(
            'La ARRENDATARIA se obliga a conservar la vivienda en las mismas condiciones en las que la recibe, siendo de su cuenta las pequeñas reparaciones derivadas del desgaste ordinario por el uso. Las obras de conservación necesarias para mantener la vivienda en condiciones de habitabilidad serán realizadas por el ARRENDADOR conforme al artículo 21 de la Ley de Arrendamientos Urbanos.',
          ),
          blank(),
          h3('NOVENA. RESOLUCIÓN ANTICIPADA'),
          p(
            'Transcurridos los primeros seis (6) meses de duración del contrato, la ARRENDATARIA podrá desistir del mismo, preavisando al ARRENDADOR con al menos treinta (30) días de antelación, conforme al artículo 11 de la Ley 29/1994, debiendo indemnizar al ARRENDADOR con una cantidad equivalente a una mensualidad de renta por cada año que reste de cumplir del contrato, prorrateándose los períodos inferiores al año.',
          ),
          blank(),
          h3('DÉCIMA. FUERO'),
          p(
            'Para cuantas cuestiones puedan derivarse de la interpretación, cumplimiento o ejecución del presente contrato, las partes, con renuncia a su propio fuero si lo tuvieren, se someten expresamente a los Juzgados y Tribunales de la ciudad de Madrid.',
          ),
          blank(),
          p(
            'Y en prueba de conformidad, las partes firman el presente contrato por duplicado ejemplar y a un solo efecto, en el lugar y fecha al principio indicados.',
          ),
          blank(),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('D. JAVIER ROMERO FERNÁNDEZ — EL ARRENDADOR', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
          blank(),
          p('_________________________________________', { alignment: AlignmentType.CENTER }),
          p('Dª LUCÍA MORENO VÁZQUEZ — LA ARRENDATARIA', {
            alignment: AlignmentType.CENTER,
            bold: true,
          }),
        ],
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// Main — emit all six synthetic DOCX fixtures.
// ---------------------------------------------------------------------------

async function main() {
  await writeDoc('pt-br-synthetic-1.docx', ptBrSynthetic1())
  await writeDoc('pt-br-synthetic-2.docx', ptBrSynthetic2())
  await writeDoc('en-synthetic-1.docx', enSynthetic1())
  await writeDoc('en-synthetic-2.docx', enSynthetic2())
  await writeDoc('es-synthetic-1.docx', esSynthetic1())
  await writeDoc('es-synthetic-2.docx', esSynthetic2())
  console.log('done — 6 DOCX fixtures emitted')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
