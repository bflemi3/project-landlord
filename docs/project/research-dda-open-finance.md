# Research: DDA, Open Finance, and Utility Bill Automation in Brazil

**Date:** 2026-04-09
**Status:** Research complete, not yet actioned
**Relevance:** Phase 2-3 feature — automate bill discovery and payment detection

---

## Executive Summary

We investigated whether platforms like Pluggy, Belvo, Celcoin, and Brazil's financial infrastructure (DDA, Nuclea, Open Finance) could support a workflow where a tenant or landlord enters their CPF, the system surfaces utility bills posted to them, and automatically detects when those bills are paid.

**Finding:** The full dream workflow is not feasible today. However, a hybrid approach is viable:

- **Bill discovery** stays manual (upload + ingestion + extraction)
- **Payment detection** can be automated via Open Finance (tenant connects bank)
- **Condo fee discovery** can be automated via DDA (Celcoin API, no bank OAuth)

---

## The Core Infrastructure Problem

Brazil has two separate billing instruments:

| | Boletos Bancarios | Guias de Convenio |
|---|---|---|
| Used by | Condo fees, loans, tuition, health plans | Electric, water, gas, internet, telephone |
| Registered in DDA? | Yes | No |
| CPF lookup possible? | Yes, via DDA | No |
| Examples | Condo admin charges, bank loans | ENEL, Sabesp, Comgas, CPFL, Vivo |

Utility bills (the most important charges for our product) are convenio guides, which are completely invisible to DDA. This is a systemic limitation of Brazil's financial infrastructure.

---

## Platform Comparison

| Platform | Can surface utility bills by CPF? | Can surface boleto charges by CPF? | Can detect payment? | Requires bank login? | Pricing |
|---|---|---|---|---|---|
| **Celcoin** | No | Yes (DDA API) | Only for boletos paid through Celcoin | No — CPF + adhesion term | Not public (sales-driven) |
| **Pluggy** | No | No (no DDA access) | Only for boletos Pluggy issued | Yes — full bank OAuth | Not public |
| **Belvo** | No | No (no DDA access) | Only for Pix payments initiated through them | Yes — full bank OAuth | Not public |
| **Tecnospeed** | No | Yes (DDA API "PlugDDA") | Unknown | Unknown | Not public |
| **Dock** | No | Yes (DDA) | Likely | Unknown | Not public |
| **QI Tech** | No | Yes (DDA) | Likely | Unknown | Not public |

No platform can surface utility bills by CPF. The data is not in any centralized system accessible to non-bank companies.

---

## DDA (Debito Direto Autorizado)

### What it is

A centralized feed of boletos bancarios issued against a CPF/CNPJ, operated by Nuclea (formerly CIP). When a company registers a boleto, DDA subscribers see it before it arrives by mail.

### What it covers

- Condo fees (if issued as boletos bancarios)
- Loan payments
- Health plan charges
- University tuition
- Any charge issued as a boleto bancario

### What it does NOT cover

- Electric bills (ENEL, CPFL, Light, Neoenergia)
- Water bills (Sabesp)
- Gas bills (Comgas)
- Internet/phone bills (Vivo, Tim, Claro)
- Tax guides (IPTU, IPVA)

These are issued as "Guias de Convenio" — a different payment instrument that is not registered in the DDA system.

### Access via Celcoin

Celcoin offers a DDA API:

1. Register a user by CPF/CNPJ (requires signed adhesion term)
2. Receive webhook notifications when new boletos are issued to that CPF
3. No bank OAuth required — just CPF + consent
4. Registration processed on business days 6h-22h BRT
5. The fintech must store the signed adhesion term (Celcoin/BACEN may audit)

### Limitations

- Only covers boletos bancarios, not utility convenio guides
- Cannot detect payment status for boletos paid at other institutions
- DDA historically required the user to register at their own bank — Celcoin's API may handle this as intermediary

---

## Nuclea (formerly CIP)

### Plataforma de Consulta de Status de Boleto

A commercial API product that checks whether a specific boleto has been paid.

- **Input:** Barcode (linha digitavel) + due date
- **Output:** Paid/unpaid status, with real-time updates
- **Two modes:** On-demand query, or continuous monitoring with webhook notifications
- **Access:** Available to non-banks (fintechs, retailers can contract directly with Nuclea)
- **Coverage:** Boletos bancarios only — NOT convenio/utility bills
- **Pricing:** Not public (contact Nuclea sales)

### Nova Plataforma de Cobranca

The centralized boleto registry (mandatory since 2018). All boletos bancarios must be registered here before they can be paid. Provides real-time status, fraud prevention, and payment-after-due-date calculation. Does not cover convenio guides. Does not create new third-party data access patterns — access still limited to CIP participants and Nuclea's commercial API customers.

---

## Open Finance Brasil

### The viable path for payment detection

If a tenant connects their bank account via Open Finance (OAuth through Pluggy or Belvo), the transaction feed includes utility bill payments with enough detail to match against charge instances.

### Transaction data available

| Field | Description | Usefulness |
|---|---|---|
| `type` | `CONVENIO_ARRECADACAO` (utility) or `BOLETO` | Identifies payment type |
| `partieCnpjCpf` | Counterpart CNPJ (mandatory since BCB IN 371, May 2023) | Maps to provider profile |
| `transactionAmount` | Payment amount | Matches charge instance |
| `transactionDateTime` | When paid | Confirms payment window |
| `transactionName` | Bank statement description text | Often includes provider name |
| `completedAuthorisedPaymentType` | `TRANSACAO_EFETIVADA`, `LANCAMENTO_FUTURO`, `TRANSACAO_PROCESSANDO` | Payment lifecycle status |

### What you CAN detect

- When a utility bill has been paid (debit appears as CONVENIO_ARRECADACAO or BOLETO)
- Which provider was paid (via CNPJ)
- How much was paid and when

### What you CANNOT detect

- Pending/upcoming bills (Open Finance shows transactions, not pending charges)
- Bill details (line items, consumption data, breakdown) — only the payment event

### Data refresh cadence

| Transaction type | Appears on | Immutable by |
|---|---|---|
| PIX | D+0 | D+0 |
| TED | D+0 | D+0 |
| BOLETO | D+0 | D+1 |
| CONVENIO_ARRECADACAO | D+0 | D+1 |

Polling constraints: BCB imposes monthly limits on API calls per CPF/CNPJ. Recent transactions (~6 days) allow ~240 calls/month. Practically, poll daily or every few hours.

### Consent flow

1. User taps "Connect your bank" in the app
2. Pluggy/Belvo widget opens — user picks their bank
3. Redirect to bank's app for OAuth authorization
4. User confirms data sharing scope
5. Redirect back to app — done

- Consent lasts 12+ months (recent regulatory changes allow longer)
- Starting January 2026: "Jornada Sem Redirecionamento" (JSR) allows in-app re-consent without bank redirect (FIDO2)
- ~154 million active consents exist in Brazil — users are familiar with this flow

### Becoming a data recipient

No BCB license needed — use Pluggy or Belvo as intermediaries:

| | Pluggy | Belvo |
|---|---|---|
| BCB Licensed | Yes (ITP, June 2024) | Yes (ITP, Dec 2023) |
| Bank coverage | 30+ institutions, ~90% market | 60+ institutions, ~90% market |
| Utility payment detail | Has `boletoMetadata` with barcode for some banks | Stronger categorization (85% accuracy) |
| Pricing | Not public (free trial + 20 accounts) | Not public (free sandbox + 25 links) |
| Best for | Better raw payment data | Better auto-categorization |

Both offer sandbox access immediately. Production integration in weeks.

---

## Payment Matching Strategy

### Provider CNPJ table

Add provider CNPJ to existing provider invoice profiles:

| Provider | CNPJ | Charge Type |
|---|---|---|
| ENEL SP | 61.695.227/0001-93 | Electric |
| Sabesp | 43.776.517/0001-80 | Water |
| Comgas | 61.856.571/0001-17 | Gas |
| Vivo | 02.558.157/0001-62 | Internet |

Note: Some providers have multiple CNPJs per state (ENEL SP, ENEL RJ, ENEL CE). The table must map multiple CNPJs to one provider.

### Matching logic

When a new transaction appears in the tenant's feed:

1. **CNPJ** — maps to provider profile, which maps to charge definition
2. **Amount** — matches the charge instance amount (within tolerance for rounding/fees)
3. **Date** — falls within the statement period or payment window
4. **Transaction type** — `CONVENIO_ARRECADACAO` or `BOLETO`
5. **Property/unit** — tenant is linked to a specific unit with specific charge definitions

### Confidence tiers

| Match quality | Action |
|---|---|
| CNPJ match + amount match + date window | Auto-mark as paid |
| CNPJ match + amount close (within ~5%) | Surface for one-tap confirmation |
| No CNPJ but name match + amount match | Surface for manual confirmation |
| Ambiguous | Don't match — tenant marks manually |

### Known caveats

- CNPJ is mandatory since May 2023 but may be absent for batch BOLETO/CONVENIO transactions
- When CNPJ is absent, fall back to `transactionName` text matching
- The standard Open Finance API does NOT expose barcode/linha digitavel (Pluggy's `boletoMetadata` may have it for some banks)

---

## Utility Company Direct APIs

Major utilities (ENEL, Sabesp, Comgas, CPFL, Light, Neoenergia) all have customer portals but none offer public APIs for third-party integration. Access requires account number + CPF and is designed for account holders only. Screen scraping is fragile and ToS-violating.

Bilateral partnerships with individual utilities are possible at scale but not viable for MVP.

---

## Recommended Approach by Phase

### MVP (current)

- Bill discovery: upload + ingestion email + deterministic extraction
- Payment confirmation: manual (tenant marks paid, landlord confirms)
- No DDA or Open Finance integration

### Phase 2

- **Open Finance integration** via Pluggy or Belvo for payment detection
  - Tenant connects bank → system watches for matching transactions → auto-marks paid
  - Requires: consent UX, webhook infrastructure, matching logic, error handling
  - Estimated integration effort: weeks (API is straightforward, UX and matching logic are the work)

### Phase 3

- **DDA via Celcoin** for condo fee auto-discovery
  - Register tenant/landlord CPF → receive condo fee boletos automatically
  - Requires: Celcoin commercial contract, adhesion term UX, webhook handling
- **Nuclea boleto status** for tracking boleto payment status
  - For boletos surfaced via DDA, check if they've been paid
  - Requires: Nuclea commercial contract or BaaS partner access
- Explore bilateral utility partnerships if scale justifies it

---

## Cost Considerations

| Item | Cost | Notes |
|---|---|---|
| Pluggy or Belvo integration | Not public — request quotes | Per-connection/per-link pricing model |
| Celcoin DDA API | Not public — contact comercial@celcoin.com.br | Volume-based, negotiated |
| Nuclea boleto status API | Not public — contact Nuclea sales | Commercial API product |
| Feasibility spike (Phase 2) | $900-$2,700 | 10-30 hours depending on depth |

All Brazilian financial infrastructure providers use sales-driven pricing. Budget for discovery calls before committing.

---

## Sources

### Pluggy
- [Open Finance overview](https://www.pluggy.ai/en/open-finance)
- [API docs](https://docs.pluggy.ai/)
- [Boleto Management API (beta)](https://docs.pluggy.ai/docs/boleto-management-api)
- [Payment data coverage](https://docs.pluggy.ai/docs/payment-data-open-finance-coverage)
- [Transaction docs](https://docs.pluggy.ai/docs/transactions)
- [Connectors coverage](https://docs.pluggy.ai/docs/connectors-coverage)

### Belvo
- [Banking aggregation overview (Brazil)](https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-introduction)
- [Bills (OFDA) data](https://developers.belvo.com/docs/bills-ofda-data)
- [Transactions (OFDA) data](https://developers.belvo.com/docs/transactions-ofda-data)
- [Data retrieval limits](https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-data-retrieval-limits)
- [Plans and pricing](https://belvo.com/plans-and-pricing/)

### Celcoin
- [DDA API documentation](https://developers.celcoin.com.br/docs/sobre-dda)
- [DDA launch announcement](https://www.celcoin.com.br/news/celcoin-lanca-api-de-debito-direto-autorizado-dda/)
- [Bill payment APIs](https://developers.celcoin.com.br/docs/pagamento-de-contas-1)
- [Boleto payment status](https://developers.celcoin.com.br/docs/consultar-status-de-pagamento-de-boleto)

### Nuclea / CIP
- [Boleto status platform](https://www.nuclea.com.br/plataforma-de-consulta-de-status-de-boleto/)
- [DDA](https://www.nuclea.com.br/dda/)

### Open Finance Brasil
- [Official site](https://openfinancebrasil.org.br/)
- [Accounts API 2.3.0 spec](https://raw.githubusercontent.com/OpenBanking-Brasil/openapi/main/swagger-apis/accounts/2.3.0.yml)

### Regulatory
- [FEBRABAN DDA overview](https://portal.febraban.org.br/pagina/3051/1088/pt-br/dda)
- [FEBRABAN Nova Plataforma de Boletos](https://portal.febraban.org.br/pagina/3150/1094/pt-br/servicos-novo-plataforma-boletos)
- [BCB JSR regulation](https://www.machadomeyer.com.br/en/recent-publications/publications/banking-insurance-and-finance/bcb-regulates-journey-without-redirection-in-open-finance)
