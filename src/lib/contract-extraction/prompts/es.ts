export const esPrompt = `The contract is in Spanish. It is likely a Mexican "contrato de arrendamiento" (governed by the Código Civil of the relevant state) or a Spanish "contrato de arrendamiento de vivienda" (governed by Ley de Arrendamientos Urbanos 29/1994). Latin-American Spanish contracts (Colombia, Argentina, Chile) follow similar conventions.

## Document structure

Spanish rental contracts typically have named sections:
- COMPARECIENTES / PARTES (parties) — sometimes split into ARRENDADOR and ARRENDATARIO blocks
- OBJETO / INMUEBLE (property)
- RENTA / PRECIO (rent)
- VIGENCIA / DURACIÓN / PLAZO (term)
- SERVICIOS (utilities)
- FIANZA (deposit)
- CLÁUSULAS (numbered clauses: PRIMERA, SEGUNDA, TERCERA…)

Look for sections labeled REUNIDOS, EXPONEN, CLÁUSULAS — these are common in Spain-style contracts. Mexican contracts more typically open with DECLARACIONES or ANTECEDENTES and then move to CLÁUSULAS, skipping REUNIDOS/EXPONEN.

## Parties — landlords and tenants

- ARRENDADOR / ARRENDADORES / LOCADOR → landlords[]. Usually one person; occasionally a co-ownership.
- ARRENDATARIO / ARRENDATARIOS / INQUILINO / LOCATARIO → tenants[]. Often one person or one couple.
- Names are full legal names. Spanish-speaking naming conventions use two surnames (paterno + materno in Mexico; first surname + second surname in Spain) — capture both.
- Tax ID depends on jurisdiction:
  - **Mexico**: RFC (e.g., "MARC-850712-H24" — 4 letters + date + 3 chars) or CURP (18 chars). A contract may list both — prefer RFC if both are present, otherwise whichever is shown. Store exactly as written.
  - **Spain**: DNI ("12345678-A") for Spanish citizens, NIE ("X1234567-B") for foreign residents, CIF for companies. Store exactly as written.
  - **Colombia**: Cédula de Ciudadanía (CC).
  - **Argentina**: DNI.

## Address

Spanish address conventions:
- street → "Calle X", "Avenida X", "Paseo X", "Carrera X" (Colombia). Include the type word (e.g., "Calle Hermosilla", "Avenida Nuevo León").
- number → the street number (e.g., "45", "247"). Note: some Spanish contracts write "nº 45" — extract just "45".
- complement → apartment / floor / unit. Spanish patterns: "planta 3ª puerta B", "piso 2º", "interior 8", "depto 4A". Mexican: "interior 8", "departamento 501".
- neighborhood → "colonia" in Mexico (e.g., "Hipódromo Condesa"), "barrio" elsewhere. In Spain neighborhoods are rarely labeled separately — may be null.
- city → the city (e.g., "Ciudad de México", "Madrid", "Barcelona", "Bogotá").
- state → federative entity / autonomous community / department:
  - Mexico: state name or abbreviation (CDMX, Jalisco, Nuevo León). For Ciudad de México, state is also "Ciudad de México" (federative entity).
  - Spain: autonomous community or province (Madrid, Cataluña, Andalucía). Often omitted in Spanish contracts since the city implies it.
  - Colombia: department.
- postalCode → Mexico uses 5 digits ("06100"), Spain uses 5 digits ("28001"), Colombia uses 6 digits. Labeled as "código postal" or "CP".
- country → ISO 3166-1 alpha-2: "MX", "ES", "CO", "AR", "CL", "PE".

## Rent

- Look for "RENTA", "PRECIO", "CANON", or "IMPORTE DEL ARRENDAMIENTO".
- Currency symbols and formatting:
  - Mexico: "$" with MXN context → MXN. "$18,500.00" = 18500.00 MXN = 1850000 minor units. Mexican formatting uses "," as thousands, "." as decimal.
  - Spain: "€" → EUR. "1.200,00 €" uses "." as thousands, "," as decimal → 1200.00 EUR = 120000 minor units.
  - Colombia: "$" with COP context → COP.
  - Argentina: "$" with ARS context → ARS.
- currency → "MXN", "EUR", "COP", "ARS" etc. Infer from currency symbol and country.
- dueDay → "pagadero el día X de cada mes" / "los primeros X días de cada mes" / "el día X". Parse to the integer day. If the contract specifies a range ("del 1 al 5 de cada mes") use the last day of the grace window. If the contract specifies a non-numeric due date ("último día hábil", "primer viernes del mes"), return null.
- includes → if rent explicitly covers services ("la renta incluye agua y mantenimiento"), list them. Otherwise null.

## Contract dates

- "VIGENCIA", "DURACIÓN", "PLAZO" section.
- Spanish date format: DD/MM/YYYY or "DD de [mes] de YYYY" ("1 de mayo de 2026").
- Months in Spanish: enero=01, febrero=02, marzo=03, abril=04, mayo=05, junio=06, julio=07, agosto=08, septiembre=09, octubre=10, noviembre=11, diciembre=12.
- Always convert to YYYY-MM-DD.

## Rent adjustment

- Mexican contracts commonly use INPC (Índice Nacional de Precios al Consumidor) → method "index", indexName "INPC".
- Spanish contracts commonly reference IPC (Índice de Precios de Consumo, published by INE) → method "index", indexName "IPC". The Ley de Arrendamientos Urbanos limits annual adjustments — the contract may say "actualización anual conforme al IPC".
- Colombian contracts may reference IPC (Colombia's own IPC) or a fixed percentage.
- Adjustment is typically annual → frequency "annual".
- If the contract is silent, return null for the whole rentAdjustment object.

## Expenses (servicios)

The "type" field is a canonical English enum — normalize every Spanish term to one of the allowed values:
- "energía eléctrica" / "electricidad" / "luz" → "electricity"
- "agua" → "water"
- "gas" / "gas natural" → "gas"
- "internet" → "internet"
- "comunidad" / "gastos de comunidad" (HOA in Spain) → "condo"
- "mantenimiento" / "cuota de mantenimiento" (common in Mexican condos) → "condo" if it is a building/community fee, otherwise "maintenance" for general upkeep/repairs
- "basura" / "recolección de basura" → "trash"
- "alcantarillado" / "drenaje" → "sewer"
- "cable" / "televisión por cable" → "cable"
- "IBI" (Impuesto sobre Bienes Inmuebles, Spanish property tax) → "other"
- "predial" (Mexican property tax) → "other"
- Anything else that does not fit an explicit category → "other"

## Expense bundling (bundledInto)

Every recurring service the contract mentions is a first-class expense entry. When multiple services share a single real-world bill, they stay as separate entries and the "secondary" ones set bundledInto to the parent:

- "La renta incluye gastos de comunidad" (rent covers community fees) → entries:
  - rent itself stays in the rent object; rent.includes documents the bundle
  - condo expense: { type: "condo", bundledInto: "rent", ... }
- "La cuota de mantenimiento incluye agua y recolección de basura" (condo/maintenance fee covers water and trash) → three entries:
  - condo: { type: "condo", bundledInto: null, ... }
  - water: { type: "water", bundledInto: "condo", ... }
  - trash: { type: "trash", bundledInto: "condo", ... }
- "Agua y alcantarillado" billed together by the same utility → two entries:
  - water: { type: "water", bundledInto: null, ... }
  - sewer: { type: "sewer", bundledInto: "water", ... }
- "El arrendatario pagará los servicios de electricidad, agua y gas" (tenant pays these three separately) → three entries, all bundledInto: null (three independent bills).

Use bundledInto: null when the expense has its own dedicated bill. Use bundledInto: "rent" only when the contract explicitly says the rent payment covers this service. Use bundledInto: <expense type> when another expense's bill covers this service.

List every expense the contract mentions, regardless of who pays (arrendador or arrendatario). providerName and providerTaxId are almost always absent — return null.

## Property type

- "departamento" / "apartamento" / "piso" / "estudio" → apartment
- "casa" / "chalet" / "adosado" / "dúplex" → house
- "local comercial" / "oficina" / "nave industrial" → commercial
- Anything else → other`
