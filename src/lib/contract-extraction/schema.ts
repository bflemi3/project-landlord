import { z } from 'zod'
import { Constants } from '@/lib/types/database'
import type {
  ContractExtractionLlmResult,
  ContractExtractionResult,
  ExpenseType,
  PropertyType,
} from './types'

/**
 * Zod schemas for contract extraction.
 *
 * There are two schema layers here:
 *
 * 1. `contractExtractionLlmSchema` — the schema passed to `Output.object({ schema })` in `generateText`.
 *    Uses sentinel values (empty string "" / empty array []) instead of
 *    `.nullable()` on most fields. Why: Anthropic's structured-output endpoint
 *    caps schemas at 16 parameters with union types (each `.nullable()` emits
 *    `anyOf: [T, null]`, counting as one union). With every address/party/
 *    expense string made nullable the count hit 33 and the API rejected the
 *    request. The engine normalizes sentinels back to null after extraction.
 *
 * 2. `contractExtractionResultSchema` — the full result shape. Engine-produced
 *    fields (languageDetected, rawExtractedText) extend the LLM shape.
 *
 * Integer bounds / non-negative checks live in `.refine()` instead of `.int()`
 * + `.min()` / `.max()` — zod v4's `.int()` auto-emits
 * ±Number.MAX_SAFE_INTEGER bounds into the JSON schema, which Anthropic also
 * rejects ("For 'integer' type, properties maximum, minimum are not
 * supported"). `.refine()` preserves runtime validation without touching the
 * schema sent to the model.
 */

// ---------------------------------------------------------------------------
// LLM-facing schemas — sentinels, not null
// ---------------------------------------------------------------------------

const llmAddressSchema = z.object({
  street: z.string().describe('Street name (rua/avenida in Brazil, street/avenue in US, calle in Spanish). Empty string "" if not stated.'),
  number: z.string().describe('Street number. Empty string "" if not stated.'),
  complement: z.string().describe('Unit, apartment, suite, block, etc. Empty string "" if not stated.'),
  neighborhood: z.string().describe('Neighborhood or district (bairro in Brazil). Empty string "" if not stated or not applicable.'),
  city: z.string().describe('City name. Empty string "" if not stated.'),
  state: z.string().describe('State, province, or region (e.g., SP in Brazil, CA in US, CDMX in Mexico). Empty string "" if not stated.'),
  postalCode: z.string().describe('Postal or ZIP code (e.g., CEP in Brazil: 88063-300, ZIP in US: 90210, código postal in Mexico/Spain). Empty string "" if not stated.'),
  country: z.string().describe('ISO 3166-1 alpha-2 country code (e.g., BR, US, MX, ES, CO). Infer from address format, currency, or language if not explicitly stated. Empty string "" only if truly undeterminable.'),
})

const llmRentSchema = z.object({
  amount: z
    .number()
    .refine((n) => Number.isInteger(n) && n >= 0, {
      message: 'amount must be a non-negative integer (minor units)',
    })
    .describe(
      'Rent amount in integer minor units (centavos, cents). Must be a whole non-negative integer — do not emit a decimal. Example: R$2,500.00 = 250000. Use 0 only if the contract does not state a rent.',
    ),
  currency: z.string().describe('ISO 4217 currency code (e.g., BRL, USD, EUR). Empty string "" only if truly undeterminable.'),
  dueDay: z
    .number()
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 31, {
      message: 'dueDay must be an integer between 1 and 31',
    })
    .nullable()
    .describe(
      'Day of month rent is due. Whole integer in the range 1..31 (inclusive). Null if the contract does not specify a numeric due day.',
    ),
  includes: z
    .array(z.string())
    .describe('What the stated amount covers, e.g. ["rent", "condo", "IPTU"]. Empty array [] if the contract does not break this out.'),
})

const llmContractDatesSchema = z.object({
  start: z.string().describe('Contract start date in YYYY-MM-DD format. Empty string "" if not stated.'),
  end: z.string().describe('Contract end date in YYYY-MM-DD format. Empty string "" if not stated.'),
})

const rentAdjustmentFrequencySchema = z.enum(['monthly', 'quarterly', 'biannual', 'annual', 'other'])
const rentAdjustmentMethodSchema = z.enum(['index', 'fixed_amount', 'fixed_percentage', 'other'])

const llmRentAdjustmentSchema = z.object({
  date: z.string().describe('Date or description of when the rent adjustment applies (e.g., "2027-01-01", "every January"). Empty string "" if not stated.'),
  frequency: rentAdjustmentFrequencySchema.nullable().describe('How often the rent is adjusted. Null if the contract does not specify.'),
  method: rentAdjustmentMethodSchema.nullable().describe('How the adjustment is calculated: "index" (tied to an inflation index like IPCA, CPI, IPC), "fixed_amount" (specific currency amount increase), "fixed_percentage" (e.g., 5% annual increase), or "other" if unclear. Null if the contract does not specify.'),
  indexName: z.string().describe('Name of the inflation index if method is "index" (e.g., IPCA in Brazil, CPI in US, IPC in Spain/Mexico). Empty string "" if not index-based.'),
  value: z.number().nullable().describe('Fixed adjustment amount (integer minor units) or percentage value. E.g., 5 for a 5% increase, or 50000 for a R$500 increase. Null if index-based or not applicable.'),
})

const llmPartySchema = z.object({
  name: z.string().describe('Full legal name of the party. Empty string "" if not stated.'),
  taxId: z.string().describe('Personal tax ID (CPF in Brazil, SSN in US, DNI in Spain, RFC/CURP in Mexico). Empty string "" if not stated.'),
  email: z.string().describe('Email address. Empty string "" if not stated.'),
})

const expenseTypeSchema = z
  .enum([
    'electricity',
    'water',
    'gas',
    'internet',
    'condo',
    'trash',
    'sewer',
    'cable',
    'maintenance',
    'other',
  ])
  .describe(
    'Canonical expense category. Normalize the contract\'s native term to this set — do not translate literally, classify semantically. ' +
      'Mapping guidance: ' +
      'PT-BR "luz"/"energia elétrica" → electricity; "água" → water; "gás" → gas; "internet" → internet; ' +
      '"condomínio"/"taxa condominial" → condo; "IPTU" → other; "lixo" → trash; "esgoto" → sewer; "manutenção" → maintenance. ' +
      'ES "energía eléctrica"/"electricidad"/"luz" → electricity; "agua" → water; "gas"/"gas natural" → gas; ' +
      '"comunidad"/"gastos de comunidad" → condo; "mantenimiento"/"cuota de mantenimiento" → maintenance; ' +
      '"IBI"/"predial" → other. ' +
      'EN "electricity"/"electric" → electricity; "water" → water; "gas"/"natural gas" → gas; "HOA dues" → condo; ' +
      '"trash"/"garbage"/"waste" → trash; "sewer" → sewer; "cable"/"TV" → cable. ' +
      'Use "other" for any expense that does not fit an explicit category (IPTU, IBI, predial, security fees, pool fees, etc.). ' +
      'Bundled expenses like "água e esgoto" should be split into separate entries (one "water", one "sewer").',
  )

// `bundledInto` uses "none" as the sentinel for "expense has its own dedicated
// bill" to avoid adding a third `.nullable()` union branch on top of the
// existing expense-type + "rent" literal union. The engine maps "none" → null.
const llmExpenseBundledIntoSchema = z
  .union([expenseTypeSchema, z.literal('rent'), z.literal('none')])
  .describe(
    'Where this expense is paid from: ' +
      '"rent" → the amount rolls up into the monthly rent payment (e.g., "the rent includes IPTU"); ' +
      'an expense type like "condo" → the bill is paid together with that category (e.g., a condo fee that covers water); ' +
      '"none" → this expense has its own dedicated bill. ' +
      'Every recurring service the contract mentions should be a first-class expense entry — if multiple services share one bill, the "secondary" services set bundledInto to the type of the primary bill.',
  )

const llmExpenseSchema = z.object({
  type: expenseTypeSchema.nullable(),
  bundledInto: llmExpenseBundledIntoSchema,
  providerName: z.string().describe('Name of the utility or service provider. Empty string "" if not stated (the common case).'),
  providerTaxId: z.string().describe('Business tax ID of the provider (CNPJ in Brazil, EIN in US, CIF in Spain, RFC in Mexico). Empty string "" if not stated (the common case).'),
})

const supportedLanguageSchema = z.enum(['pt-br', 'en', 'es'])

const propertyTypeSchema = z
  .enum(['apartment', 'house', 'commercial', 'other'])
  .describe(
    'Type of property. Allowed values: apartment, house, commercial, other. ' +
      'Mapping guidance: Brazilian "apartamento"/"cobertura"/"kitnet"/"loft"/"studio" → apartment; ' +
      '"casa"/"sobrado" → house; "sala comercial"/"loja"/"galpão"/"escritório" → commercial; ' +
      'anything else → other. Return null if the contract does not indicate the property type.',
  )

// ---------------------------------------------------------------------------
// LLM schema — passed to Output.object({ schema }) in generateText
//
// Union-typed field count: propertyType, rent.dueDay, rentAdjustment (top),
// rentAdjustment.frequency, rentAdjustment.method, rentAdjustment.value,
// expense.type, expense.bundledInto (enum|literal|literal). That's 8 —
// comfortably under Anthropic's 16-parameter cap on union types.
// ---------------------------------------------------------------------------

export const contractExtractionLlmSchema = z.object({
  isRentalContract: z.boolean().describe('Whether this document is a rental/lease contract'),
  propertyType: propertyTypeSchema.nullable(),
  address: llmAddressSchema.describe('Property address from the contract. If no address is stated, emit empty strings for every field.'),
  rent: llmRentSchema.describe('Rent payment details. If no rent is stated (which would be unusual for a rental contract), emit amount 0 and empty strings.'),
  contractDates: llmContractDatesSchema.describe('Contract start and end dates. Empty strings if not stated.'),
  rentAdjustment: llmRentAdjustmentSchema
    .nullable()
    .describe('How rent changes over time, if the contract specifies. Null if the contract is silent on adjustment — do not assume a default. See the inner fields for the adjustment method, frequency, and value.'),
  landlords: z
    .array(llmPartySchema)
    .describe('Landlord(s) / locador(es) listed in the contract. Empty array [] if none are named.'),
  tenants: z
    .array(llmPartySchema)
    .describe('Tenant(s) / locatario(s) listed in the contract. Empty array [] if none are named.'),
  expenses: z
    .array(llmExpenseSchema)
    .describe('Utility and recurring expenses mentioned in the contract. Empty array [] if the contract mentions none.'),
})

// ---------------------------------------------------------------------------
// Post-normalization schemas — match the public ContractExtractionLlmResult
// shape (nullable everywhere it's semantically meaningful). These are used
// to runtime-validate the normalized output and for the test-time
// contractExtractionResultSchema checks.
// ---------------------------------------------------------------------------

const contractAddressSchema = z.object({
  street: z.string().nullable(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
})

const contractRentSchema = z.object({
  amount: z.number().refine((n) => Number.isInteger(n) && n >= 0, {
    message: 'amount must be a non-negative integer (minor units)',
  }),
  currency: z.string().nullable(),
  dueDay: z
    .number()
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 31, {
      message: 'dueDay must be an integer between 1 and 31',
    })
    .nullable(),
  // Always an array — empty means "no bundling info", not "field absent".
  includes: z.array(z.string()),
})

const contractDatesSchema = z.object({
  start: z.string().nullable(),
  end: z.string().nullable(),
})

const contractRentAdjustmentSchema = z.object({
  date: z.string().nullable(),
  frequency: rentAdjustmentFrequencySchema.nullable(),
  method: rentAdjustmentMethodSchema.nullable(),
  indexName: z.string().nullable(),
  value: z.number().nullable(),
})

const contractPartySchema = z.object({
  name: z.string().nullable(),
  taxId: z.string().nullable(),
  email: z.string().nullable(),
})

const expenseBundledIntoSchema = z.union([expenseTypeSchema, z.literal('rent')]).nullable()

const contractExpenseSchema = z.object({
  type: expenseTypeSchema.nullable(),
  bundledInto: expenseBundledIntoSchema,
  providerName: z.string().nullable(),
  providerTaxId: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// Full result schema — includes engine-produced fields. This is what the
// engine returns (post-normalization), and what consumers parse.
// ---------------------------------------------------------------------------

const contractExtractionLlmResultSchema = z.object({
  isRentalContract: z.boolean(),
  propertyType: propertyTypeSchema.nullable(),
  address: contractAddressSchema.nullable(),
  rent: contractRentSchema.nullable(),
  contractDates: contractDatesSchema.nullable(),
  rentAdjustment: contractRentAdjustmentSchema.nullable(),
  landlords: z.array(contractPartySchema).nullable(),
  tenants: z.array(contractPartySchema).nullable(),
  expenses: z.array(contractExpenseSchema).nullable(),
})

export const contractExtractionResultSchema = contractExtractionLlmResultSchema.extend({
  languageDetected: supportedLanguageSchema.describe('Language detected in the document by the engine'),
  rawExtractedText: z.string().describe('Full text extracted from the document'),
})

// Back-compat export — some tests / consumers want the "expected result" shape
// without engine fields. This matches `ContractExtractionLlmResult`.
export const contractExtractionLlmResultShape = contractExtractionLlmResultSchema

// ---------------------------------------------------------------------------
// Inferred types (convenience re-exports)
// ---------------------------------------------------------------------------

export type ContractExtractionLlmSchemaType = z.infer<typeof contractExtractionLlmSchema>
export type ContractExtractionResultSchemaType = z.infer<typeof contractExtractionResultSchema>

// ---------------------------------------------------------------------------
// Compile-time type assertions — catch schema/type drift
// ---------------------------------------------------------------------------

// Post-normalization schema must match ContractExtractionLlmResult exactly.
type _ResultSchemaMatchesType = z.infer<typeof contractExtractionLlmResultSchema> extends ContractExtractionLlmResult
  ? true
  : never
const _resultLlmTypeCheck: _ResultSchemaMatchesType = true

type _FullResultMatchesType = z.infer<typeof contractExtractionResultSchema> extends ContractExtractionResult
  ? true
  : never
const _fullResultTypeCheck: _FullResultMatchesType = true

// Guard against drift between the Postgres property_type enum (source of
// truth, surfaced via Constants.public.Enums.property_type) and the Zod enum
// literals below. If the DB enum gains/loses a value and the regen is run
// but the Zod schema isn't updated, this assignment fails to type-check.
type _ZodPropertyTypeValue = z.infer<typeof propertyTypeSchema>
type _DbPropertyTypeValue = (typeof Constants.public.Enums.property_type)[number]
type _PropertyTypeZodMatchesDb = [_ZodPropertyTypeValue] extends [_DbPropertyTypeValue]
  ? [_DbPropertyTypeValue] extends [_ZodPropertyTypeValue]
    ? true
    : never
  : never
const _propertyTypeEnumCheck: _PropertyTypeZodMatchesDb = true
type _PropertyTypeAliasMatchesDb = [PropertyType] extends [_DbPropertyTypeValue]
  ? [_DbPropertyTypeValue] extends [PropertyType]
    ? true
    : never
  : never
const _propertyTypeAliasCheck: _PropertyTypeAliasMatchesDb = true

// Same drift guard for expense_type.
type _ZodExpenseTypeValue = z.infer<typeof expenseTypeSchema>
type _DbExpenseTypeValue = (typeof Constants.public.Enums.expense_type)[number]
type _ExpenseTypeZodMatchesDb = [_ZodExpenseTypeValue] extends [_DbExpenseTypeValue]
  ? [_DbExpenseTypeValue] extends [_ZodExpenseTypeValue]
    ? true
    : never
  : never
const _expenseTypeEnumCheck: _ExpenseTypeZodMatchesDb = true
type _ExpenseTypeAliasMatchesDb = [ExpenseType] extends [_DbExpenseTypeValue]
  ? [_DbExpenseTypeValue] extends [ExpenseType]
    ? true
    : never
  : never
const _expenseTypeAliasCheck: _ExpenseTypeAliasMatchesDb = true

// Suppress unused variable warnings
void _resultLlmTypeCheck
void _fullResultTypeCheck
void _propertyTypeEnumCheck
void _propertyTypeAliasCheck
void _expenseTypeEnumCheck
void _expenseTypeAliasCheck
