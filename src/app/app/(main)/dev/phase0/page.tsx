import { EnlivLookupPanel } from './enliv-lookup'
import { EnlivUploadPanel } from './enliv-upload'
import { CnpjIdentifyPanel } from './cnpj-identify'
import { PluggyConnectPanel } from './pluggy-connect'

export default function Phase0Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Phase 0: Infrastructure Spike</h1>
        <p className="text-muted-foreground mt-1">
          Dev-only page for testing core integrations. Not deployed.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold">1. Enliv API Lookup (by CPF)</h2>
          <EnlivLookupPanel />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">2. Enliv PDF Extraction</h2>
          <EnlivUploadPanel />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">3. CNPJ Bill Identification</h2>
          <CnpjIdentifyPanel />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">4. Pluggy Open Finance</h2>
          <PluggyConnectPanel />
        </section>
      </div>
    </div>
  )
}
