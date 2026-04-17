export const ptBrPrompt = `The contract is in Brazilian Portuguese. It is governed by Lei do Inquilinato (Lei nº 8.245/1991) and follows typical Brazilian drafting conventions.

## Document structure

Brazilian rental contracts (contrato de locação residencial) typically have:
- A "Quadro Resumo" (summary table) at the top with the headline terms — often rendered as a real table with label/value rows. When the document has a Quadro Resumo, trust it as the primary source for rent, dates, parties, and address, and use the body clauses to confirm. If a Quadro Resumo row and a later body clause disagree, prefer the Quadro Resumo unless the body clause reads as an explicit amendment or correction.
- Numbered clauses: CLÁUSULA PRIMEIRA, CLÁUSULA SEGUNDA, etc., typically covering object (property), prazo (term), aluguel (rent), despesas (expenses), reajuste (adjustment), rescisão (termination).
- Party blocks labeled LOCADOR / LOCADORES (landlord(s)) and LOCATÁRIO / LOCATÁRIOS (tenant(s)).

## Parties — landlords and tenants

- LOCADOR / LOCADORES → landlords[]. Very commonly two people (a married couple as co-owners). Return both. Occasionally the landlord is a company (e.g., "IMOBILIÁRIA XYZ LTDA", a construtora, or a holding) — in that case there will typically be one landlord entry with a company name and a CNPJ.
- LOCATÁRIO / LOCATÁRIOS → tenants[]. Usually one person; occasionally two (co-tenants / fiadores solidários).
- Names are full legal names. Brazilian names often have three or four parts (given + multiple surnames) — capture the whole name.
- Tax ID:
  - Individuals use CPF in the format XXX.XXX.XXX-XX (e.g., 040.032.329-09).
  - Companies use CNPJ in the format XX.XXX.XXX/XXXX-XX (e.g., 12.345.678/0001-90). A party identified by CNPJ is an entity, not an individual.
  - Store the value exactly as written, including dots, slash, and dash. Do not reformat.
- A party block typically contains: name, nationality, marital status, profession, CPF (or CNPJ), RG (general ID), address. Only name, taxId, and email map to the schema — ignore the rest.

## Address

Brazilian addresses have specific components. Map them as:
- street → "Rua X" or "Avenida X" or "Estrada X" (include the type word, e.g., "Rua das Flores")
- number → the street number (e.g., "533"). Strip any "nº" / "número" / "n°" prefix and return just the digits.
- complement → apartment / unit / block (e.g., "Bloco B, Apartamento 501", "Apto 5127", "Casa 2")
- neighborhood → the bairro (e.g., "Campeche", "Vila Madalena")
- city → the município (e.g., "Florianópolis", "São Paulo")
- state → two-letter state abbreviation (SC, SP, RJ, MG, etc.)
- postalCode → CEP normalized to the canonical format XXXXX-XXX (e.g., "88063-300"). If the contract shows the CEP without the dash ("88063300") or with other punctuation ("88.063-300"), rewrite it to XXXXX-XXX before returning.
- country → "BR"

## Rent

- Look for "VALOR DO ALUGUEL", "ALUGUEL MENSAL", or an "Aluguel" row in the Quadro Resumo.
- Brazilian currency formatting uses "." as thousands separator and "," as decimal separator: "R$ 6.300,00" = 6300.00 BRL = 630000 minor units. "R$ 1.250,50" = 1250.50 BRL = 125050 minor units.
- currency → almost always "BRL" (the "R$" symbol). Rarely a Brazilian contract denominates rent in USD or EUR for a foreign-tenant arrangement — use the symbol actually shown ("US$" / "$" in a US context → USD, "€" → EUR). Do not default to BRL if the symbol is explicitly foreign.
- dueDay → typically stated as "até o dia X" or "no dia X de cada mês". In a Quadro Resumo this often appears as a terse row with just the number ("Vencimento: 5", "Dia de pagamento: 5", "Dia do vencimento: 05"). If the contract specifies a non-numeric due date ("último dia útil do mês", "primeiro dia útil"), return null.
- includes → if the rent amount explicitly bundles expenses (e.g., "aluguel inclui condomínio e IPTU"), list them here. Otherwise null.

## Contract dates

- "PRAZO" clause or Quadro Resumo. Start (início) and end (término).
- Brazilian date format: DD/MM/YYYY or "DD de [mês] de YYYY" ("01 de março de 2026").
- Months in Portuguese: janeiro=01, fevereiro=02, março=03, abril=04, maio=05, junho=06, julho=07, agosto=08, setembro=09, outubro=10, novembro=11, dezembro=12.
- Always convert to YYYY-MM-DD.

## Rent adjustment (reajuste)

- Look for "REAJUSTE" clause or Quadro Resumo row.
- Brazilian contracts most commonly use IPCA or IGP-M as the inflation index → method "index", indexName "IPCA" or "IGP-M".
- Adjustment is typically annual ("anual", "a cada 12 meses") → frequency "annual".
- If the contract is silent on adjustment, return null for the whole rentAdjustment object — do not fill in defaults.

## Expenses (despesas)

The "type" field is a canonical English enum — normalize every Brazilian term to one of the allowed values:
- "luz" / "energia elétrica" / "força elétrica" → "electricity"
- "água" → "water"
- "gás" / "gás canalizado" / "gás de cozinha" → "gas"
- "internet" / "banda larga" → "internet"
- "condomínio" / "taxa condominial" → "condo"
- "lixo" / "coleta de lixo" → "trash"
- "esgoto" → "sewer"
- "TV a cabo" / "TV por assinatura" → "cable"
- "manutenção" / "conservação" → "maintenance"
- "IPTU" (imposto predial, municipal property tax) → "other"
- Anything else that does not fit an explicit category → "other"

## Expense bundling (bundledInto)

Every recurring service the contract mentions is a first-class expense entry. When multiple services share a single real-world bill, they stay as separate entries and the "secondary" ones set bundledInto to the parent:

- "O aluguel inclui condomínio e IPTU" (rent covers condo and IPTU) → three entries:
  - rent itself stays in the rent object; rent.includes documents the bundle
  - condo expense: { type: "condo", bundledInto: "rent", ... }
  - IPTU expense: { type: "other", bundledInto: "rent", ... }
- "A taxa condominial inclui água e coleta de lixo" (condo fee covers water and trash) → three entries:
  - condo: { type: "condo", bundledInto: null, ... }  (condo itself has its own bill)
  - water: { type: "water", bundledInto: "condo", ... }
  - trash: { type: "trash", bundledInto: "condo", ... }
- "Conta de água" billed together with "esgoto" by the same utility (common in Brazil — CASAN, SABESP) → two entries:
  - water: { type: "water", bundledInto: null, ... }
  - sewer: { type: "sewer", bundledInto: "water", ... }
- "O locatário arcará com as despesas de luz, água e gás" (tenant pays electricity, water, gas separately) → three separate entries, all with bundledInto: null (three independent bills).

Use bundledInto: null when the expense has its own dedicated bill. Use bundledInto: "rent" only when the contract explicitly says the rent payment covers this service. Use bundledInto: <expense type> when another expense's bill covers this service.

Contracts often specify which party pays each expense (responsabilidade). The expenses[] array is every expense the contract mentions, regardless of who pays — the bill-ownership distinction is handled elsewhere. Return providerName and providerTaxId as null unless a specific provider is named.

## Property type

- "apartamento" / "cobertura" / "kitnet" / "loft" / "studio" → apartment
- "casa" / "sobrado" → house
- "sala comercial" / "loja" / "galpão" / "escritório" → commercial
- Anything else → other`
