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
 * contractExtractionLlmSchema — passed to generateObject. Contains only
 * fields the LLM produces. Does NOT include engine-produced fields
 * (languageDetected, rawExtractedText).
 *
 * contractExtractionResultSchema — the full result shape including
 * engine-produced fields. Used to validate the final composed result.
 *
 * Fields that might not be extractable are nullable so partial
 * extraction is accepted.
 */

const contractAddressSchema = z.object({
  street: z.string().nullable().describe('Street name (rua/avenida in Brazil, street/avenue in US, calle in Spanish)'),
  number: z.string().nullable().describe('Street number'),
  complement: z.string().nullable().describe('Unit, apartment, suite, block, etc.'),
  neighborhood: z.string().nullable().describe('Neighborhood or district (bairro in Brazil). Nullable — not all countries use this.'),
  city: z.string().nullable().describe('City name'),
  state: z.string().nullable().describe('State, province, or region (e.g., SP in Brazil, CA in US, CDMX in Mexico)'),
  postalCode: z.string().nullable().describe('Postal or ZIP code (e.g., CEP in Brazil: 88063-300, ZIP in US: 90210, código postal in Mexico/Spain)'),
  country: z.string().nullable().describe('ISO 3166-1 alpha-2 country code (e.g., BR, US, MX, ES, CO). Infer from address format, currency, or language if not explicitly stated.'),
})

const contractRentSchema = z.object({
  amount: z
    .number()
    .int()
    .nonnegative()
    .describe('Rent amount in integer minor units (centavos, cents). Example: R$2,500.00 = 250000'),
  currency: z.string().describe('ISO 4217 currency code (e.g., BRL, USD, EUR)'),
  dueDay: z
    .number()
    .int()
    .min(1)
    .max(31)
    .nullable()
    .describe('Day of month rent is due (1-31)'),
  includes: z
    .array(z.string())
    .nullable()
    .describe('What the stated amount covers, e.g. ["rent", "condo", "IPTU"]'),
})

const contractDatesSchema = z.object({
  start: z.string().describe('Contract start date in YYYY-MM-DD format'),
  end: z.string().describe('Contract end date in YYYY-MM-DD format'),
})

const rentAdjustmentFrequencySchema = z.enum(['monthly', 'quarterly', 'biannual', 'annual', 'other'])
const rentAdjustmentMethodSchema = z.enum(['index', 'fixed_amount', 'fixed_percentage', 'other'])

const contractRentAdjustmentSchema = z.object({
  date: z.string().nullable().describe('Date or description of when the rent adjustment applies (e.g., "2027-01-01", "every January")'),
  frequency: rentAdjustmentFrequencySchema.nullable().describe('How often the rent is adjusted'),
  method: rentAdjustmentMethodSchema.nullable().describe('How the adjustment is calculated: "index" (tied to an inflation index like IPCA, CPI, IPC), "fixed_amount" (specific currency amount increase), "fixed_percentage" (e.g., 5% annual increase), or "other" if unclear'),
  indexName: z.string().nullable().describe('Name of the inflation index if method is "index" (e.g., IPCA in Brazil, CPI in US, IPC in Spain/Mexico). Null if not index-based.'),
  value: z.number().nullable().describe('Fixed adjustment amount (integer minor units) or percentage value. E.g., 5 for a 5% increase, or 50000 for a R$500 increase. Null if index-based.'),
})

const contractPartySchema = z.object({
  name: z.string().nullable().describe('Full legal name of the party'),
  taxId: z.string().nullable().describe('Personal tax ID (CPF in Brazil, SSN in US, DNI in Spain, RFC/CURP in Mexico)'),
  email: z.string().nullable().describe('Email address'),
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

const expenseBundledIntoSchema = z
  .union([expenseTypeSchema, z.literal('rent')])
  .nullable()
  .describe(
    'Where this expense is paid from: ' +
      '"rent" → the amount rolls up into the monthly rent payment (e.g., "the rent includes IPTU"); ' +
      'an expense type like "condo" → the bill is paid together with that category (e.g., a condo fee that covers water); ' +
      'null → this expense has its own dedicated bill. ' +
      'Every recurring service the contract mentions should be a first-class expense entry — if multiple services share one bill, the "secondary" services set bundledInto to the type of the primary bill.',
  )

const contractExpenseSchema = z.object({
  type: expenseTypeSchema.nullable(),
  bundledInto: expenseBundledIntoSchema,
  providerName: z.string().nullable().describe('Name of the utility or service provider'),
  providerTaxId: z.string().nullable().describe('Business tax ID of the provider (CNPJ in Brazil, EIN in US, CIF in Spain, RFC in Mexico)'),
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
// LLM schema — passed to generateObject (no engine-produced fields)
// ---------------------------------------------------------------------------

export const contractExtractionLlmSchema = z.object({
  isRentalContract: z.boolean().describe('Whether this document is a rental/lease contract'),
  propertyType: propertyTypeSchema.nullable(),
  address: contractAddressSchema.nullable().describe('Property address from the contract'),
  rent: contractRentSchema.nullable().describe('Rent payment details'),
  contractDates: contractDatesSchema.nullable().describe('Contract start and end dates'),
  rentAdjustment: contractRentAdjustmentSchema
    .nullable()
    .describe('How rent changes over time, if the contract specifies. Null if the contract is silent on adjustment — do not assume a default. See the inner fields for the adjustment method, frequency, and value.'),
  landlords: z
    .array(contractPartySchema)
    .nullable()
    .describe('Landlord(s) / locador(es) listed in the contract'),
  tenants: z
    .array(contractPartySchema)
    .nullable()
    .describe('Tenant(s) / locatario(s) listed in the contract'),
  expenses: z
    .array(contractExpenseSchema)
    .nullable()
    .describe('Utility and recurring expenses mentioned in the contract'),
})

// ---------------------------------------------------------------------------
// Full result schema — includes engine-produced fields
// ---------------------------------------------------------------------------

export const contractExtractionResultSchema = contractExtractionLlmSchema.extend({
  languageDetected: supportedLanguageSchema.describe('Language detected in the document by the engine'),
  rawExtractedText: z.string().describe('Full text extracted from the document'),
})

// ---------------------------------------------------------------------------
// Inferred types (convenience re-exports)
// ---------------------------------------------------------------------------

export type ContractExtractionLlmSchemaType = z.infer<typeof contractExtractionLlmSchema>
export type ContractExtractionResultSchemaType = z.infer<typeof contractExtractionResultSchema>

// ---------------------------------------------------------------------------
// Compile-time type assertions — catch schema/type drift
// ---------------------------------------------------------------------------

type _LlmSchemaMatchesType = z.infer<typeof contractExtractionLlmSchema> extends ContractExtractionLlmResult
  ? true
  : never
const _llmTypeCheck: _LlmSchemaMatchesType = true

type _ResultSchemaMatchesType = z.infer<typeof contractExtractionResultSchema> extends ContractExtractionResult
  ? true
  : never
const _resultTypeCheck: _ResultSchemaMatchesType = true

// Guard against drift between the Postgres property_type enum (source of truth,
// surfaced via Constants.public.Enums.property_type) and the Zod enum literals
// below. If the DB enum gains/loses a value and the regen is run but the Zod
// schema isn't updated, this assignment fails to type-check.
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

// Same drift guard for expense_type. PT-BR/ES/EN prompts canonicalize native
// expense terms to this set; if the DB enum changes and types are regen'd but
// the Zod enum isn't updated (or vice versa), compilation fails here.
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
void _llmTypeCheck
void _resultTypeCheck
void _propertyTypeEnumCheck
void _propertyTypeAliasCheck
void _expenseTypeEnumCheck
void _expenseTypeAliasCheck
