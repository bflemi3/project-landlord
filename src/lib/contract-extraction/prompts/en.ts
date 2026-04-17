export const enPrompt = `The contract is in English. It is likely a US residential lease (Civil Code of the governing state) but may also be UK, Canadian, Australian, or other English-speaking jurisdictions. Note: an English-language lease can still be for a property in a non-English-speaking country (e.g., a Mexico City apartment leased to an expat) — use the address, currency symbol, and tax-ID format to determine jurisdiction, not the contract language.

## Document structure

English-language leases typically have named sections rather than numbered clauses:
- PARTIES (or LANDLORD AND TENANT)
- PREMISES (or PROPERTY)
- TERM (or LEASE TERM)
- RENT
- SECURITY DEPOSIT
- UTILITIES (or SERVICES)
- LATE FEES
- DEFAULT / TERMINATION
- SIGNATURES

Section order varies (TERM sometimes comes before PARTIES). Trust the labeled headings over positional heuristics.

## Parties — landlords and tenants

- "Landlord" or "Lessor" → landlords[]. Usually one individual or entity; occasionally a property management company acting for an owner.
- "Tenant" or "Lessee" or "Resident" → tenants[]. Often multiple co-tenants on the same lease, especially for houses or shared apartments — return every named tenant.
- Capture the full legal name as written.
- Tax ID for individuals in the US is typically an SSN (XXX-XX-XXXX) but most leases do NOT include it. Return null if not stated. For entities, an EIN (XX-XXXXXXX) may appear. Store exactly as written.

## Address

- street → street name and designation only, WITHOUT the street number. "1234 Elm Street" → street "Elm Street", number "1234". "500 Main Avenue, Suite 200" → street "Main Avenue", number "500", complement "Suite 200".
- number → the street number ("1234", "500").
- complement → unit / apartment / suite / floor (e.g., "Apt 4B", "Suite 200", "Unit 3").
- neighborhood → typically absent in US addresses; return null. Some US contracts mention neighborhood or subdivision — populate if explicit.
- city → the city name (e.g., "San Francisco", "Austin", "London").
- state → two-letter state abbreviation in the US (CA, TX, NY, FL). For Australia, the state abbreviation (NSW, VIC, QLD). For Canada, the province abbreviation (ON, BC, QC). For the UK, leave state null — the UK does not use states; country + city + postcode is sufficient.
- postalCode → US ZIP ("90210" or "90210-1234"), UK postcode ("SW1A 1AA"), Canadian ("M5V 3A8").
- country → ISO 3166-1 alpha-2: "US", "GB", "CA", "AU", "IE", "NZ".

## Rent

- Look for "RENT" section. Typical phrasing: "Tenant shall pay rent in the amount of $X,XXX.XX per month".
- US / English currency formatting uses "," as thousands separator and "." as decimal: "$2,500.00" = 2500.00 USD = 250000 minor units.
- currency → "USD" for US contracts, "GBP" for UK (£), "CAD" for Canada, "AUD" for Australia, "EUR" for Ireland. Infer from the currency symbol and jurisdiction. The "$" symbol is ambiguous — resolve by address: $ in a US address → USD, $ in a Mexican address → MXN, $ in a Colombian address → COP, $ in an Argentine address → ARS.
- dueDay → typically "on the first day of each month" or "due on the Xth of each month". Parse to the integer day. If the contract specifies a non-numeric due date ("last business day of each month", "first Friday of the month"), return null — dueDay is an integer and cannot represent those rules.
- includes → if the lease says "Rent includes water and trash" or similar, list those here. Otherwise null.

## Contract dates

- "TERM" or "LEASE TERM" section. Start and end dates.
- US date format: MM/DD/YYYY ("03/15/2026") or "Month DD, YYYY" ("March 15, 2026").
- UK / Commonwealth date format: DD/MM/YYYY ("15/03/2026") or "DD Month YYYY" ("15 March 2026").
- Month-name dates are unambiguous — always prefer them when available. For numeric dates, use the jurisdiction (US → MM/DD, everywhere else English → DD/MM) to disambiguate.
- Months in English: January=01, February=02, March=03, April=04, May=05, June=06, July=07, August=08, September=09 (also "Sept"), October=10, November=11, December=12. Three-letter abbreviations (Jan/Feb/Mar/...) and month numbers are also common.
- Always convert to YYYY-MM-DD.

## Rent adjustment

- US leases rarely include automatic adjustment — most residential leases are fixed-term with a renewal negotiation. If there is no adjustment clause, return null.
- When present, common patterns:
  - CPI / Consumer Price Index escalation → method "index", indexName "CPI"
  - Fixed percentage increase ("rent increases 3% annually") → method "fixed_percentage", value 3
  - Fixed dollar increase ("rent increases by $50 per year") → method "fixed_amount", value 5000 (minor units)
- UK leases may reference RPI (Retail Price Index) → indexName "RPI".

## Expenses (utilities)

The "type" field is a canonical English enum. Map common lease terms:
- "electricity" / "electric" / "power" → "electricity"
- "water" → "water"
- "gas" / "natural gas" → "gas"
- "internet" / "broadband" → "internet"
- "HOA dues" / "homeowner association fees" / "condo dues" → "condo"
- "trash" / "garbage" / "waste removal" → "trash"
- "sewer" → "sewer"
- "cable" / "TV" / "cable TV" → "cable"
- "maintenance" / "general upkeep" → "maintenance"
- "property tax" / "council tax" (UK) → "other"
- Anything else that does not fit an explicit category → "other"

## Expense bundling (bundledInto)

Every recurring utility the lease mentions is a first-class expense entry. When multiple services share a single real-world bill, they stay as separate entries and the "secondary" ones set bundledInto to the parent:

- "Rent includes water and trash" → entries:
  - rent itself stays in the rent object; rent.includes documents the bundle
  - water: { type: "water", bundledInto: "rent", ... }
  - trash: { type: "trash", bundledInto: "rent", ... }
- "HOA dues cover water, trash, and maintenance" → entries:
  - condo: { type: "condo", bundledInto: null, ... }
  - water: { type: "water", bundledInto: "condo", ... }
  - trash: { type: "trash", bundledInto: "condo", ... }
  - maintenance: { type: "maintenance", bundledInto: "condo", ... }
- "Water and sewer" billed together by one utility → two entries:
  - water: { type: "water", bundledInto: null, ... }
  - sewer: { type: "sewer", bundledInto: "water", ... }
- "Tenant is responsible for electricity, gas, and internet" → three entries, all bundledInto: null (three independent bills).

Use bundledInto: null when the expense has its own dedicated bill. Use bundledInto: "rent" only when the lease explicitly says the rent payment covers this service. Use bundledInto: <expense type> when another expense's bill covers this service.

Leases typically state "Tenant is responsible for X, Y, Z; Landlord is responsible for A, B". List every utility the lease mentions, regardless of who pays. providerName and providerTaxId are almost always absent — return null.

## Property type

- "apartment" / "unit" / "flat" / "condo" / "condominium" → apartment
- "house" / "single-family home" / "townhouse" / "duplex" → house
- "commercial" / "office" / "retail" / "warehouse" → commercial
- Anything else → other`
