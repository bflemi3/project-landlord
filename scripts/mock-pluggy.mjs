#!/usr/bin/env node
/**
 * Tiny mock of Pluggy's /auth + /transactions endpoints for local integration
 * testing. Point the webhook at it by setting PLUGGY_BASE_URL.
 *
 * Configure the transactions returned via the MOCK_PLUGGY_FIXTURE env var
 * (JSON array of Pluggy transactions). When unset, returns no transactions.
 *
 * Usage:
 *   MOCK_PLUGGY_FIXTURE='[{"id":"tx1","accountId":"acct","date":"2026-09-05T10:00:00Z","amount":2500,"currencyCode":"BRL","type":"CREDIT"}]' \
 *     node scripts/mock-pluggy.mjs 8787
 */
import { createServer } from 'node:http'

const port = Number(process.argv[2] ?? 8787)
const fixture = process.env.MOCK_PLUGGY_FIXTURE
  ? JSON.parse(process.env.MOCK_PLUGGY_FIXTURE)
  : []

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  console.error(`[mock-pluggy] ${req.method} ${url.pathname}${url.search}`)

  if (req.method === 'POST' && url.pathname === '/auth') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ apiKey: 'mock-api-key' }))
    return
  }

  if (req.method === 'GET' && url.pathname === '/transactions') {
    const accountId = url.searchParams.get('accountId')
    const results = accountId
      ? fixture.filter((t) => !t.accountId || t.accountId === accountId)
      : fixture
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ results }))
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(port, '0.0.0.0', () => {
  console.error(`[mock-pluggy] listening on http://0.0.0.0:${port} (${fixture.length} fixture tx)`)
})
