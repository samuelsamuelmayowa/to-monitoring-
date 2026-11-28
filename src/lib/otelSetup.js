export const OTLP_URL = 'https://to-backendapi-v1-kctb.onrender.com/otlp/v1/traces'
// Pinned to the installed Node 22.23.3 / OpenTelemetry API 1.10.0 family.
export const OTEL_INSTALL = 'npm install @opentelemetry/api@1.10.0 @opentelemetry/auto-instrumentations-node@0.83.1 @opentelemetry/sdk-node@0.301.2 @opentelemetry/sdk-trace@3.1.1 @opentelemetry/resources@3.1.1 @opentelemetry/exporter-trace-otlp-http@0.301.2'
export const OTEL_START = 'node --env-file=.env --require ./monitoring-preload.cjs server.cjs'
export const integrations = [
  { id:'http', name:'Express · HTTP only', status:'Experimental', instruments:'http,express', install:'', telemetry:'Incoming HTTP SERVER spans: method, normalized route, status and duration. HTTP CLIENT calls can appear in enabled advanced tracing.', verify:'Call an existing development GET route, for example /health. No database is required.' },
  { id:'mysql2', name:'Express + MySQL2', status:'Experimental', instruments:'http,express,mysql2', install:'npm install mysql2@3.16.0', telemetry:'HTTP SERVER and supported MySQL CLIENT operations, correlated by Trace ID. Operation names remain neutral unless explicitly available.', verify:'Call a development route that performs a harmless SELECT 1 using your existing private test connection. Do not paste SQL into telemetry.' },
  { id:'mongodb', name:'Express + MongoDB driver', status:'Experimental', instruments:'http,express,mongodb', install:'npm install mongodb@6.21.0', telemetry:'HTTP SERVER and sanitized MongoDB CLIENT calls. Supported operation labels include FIND, INSERT, UPDATE, DELETE, AGGREGATE and COUNT; unsupported names become query.', verify:'Use a disposable local database and call a development route that uses collection.findOne({}) against synthetic records.' },
  { id:'mongoose', name:'Express + Mongoose', status:'Experimental', instruments:'http,express,mongodb', install:'npm install mongoose@8.19.2', telemetry:'HTTP SERVER and MongoDB driver CLIENT calls beneath Mongoose. Mongoose is an ODM built on the MongoDB driver; this baseline intentionally disables mongoose instrumentation to avoid counting both layers.', verify:'Connect Mongoose only to a disposable local database, then call a route that awaits Model.findOne({}).lean().exec(). No synthetic record contents enter telemetry.' },
  { id:'mysql', name:'Express + legacy mysql driver', status:'Experimental', instruments:'http,express,mysql', install:'npm install mysql@2.18.1', telemetry:'Uses the separate mysql instrumentation, not mysql2. The parser accepts safe mysql CLIENT metadata; this exact driver configuration has not passed an end-to-end test here.', verify:'Validate against your isolated development database before rollout. Do not enable both mysql and mysql2 unless the application actually uses both drivers.' },
]
export const integrationFor = id => integrations.find(item => item.id === id) || integrations[0]
export function otelEnvironment({ name='shopping-api', endpoint=OTLP_URL, secret='YOUR_PROJECT_SECRET', integration='http' }={}) {
  return {
    OTEL_SERVICE_NAME: name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,100).replace(/^[^a-z]+/,'') || 'node-service',
    OTEL_TRACES_EXPORTER:'otlp', OTEL_EXPORTER_OTLP_TRACES_PROTOCOL:'http/json',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:endpoint,
    OTEL_EXPORTER_OTLP_TRACES_HEADERS:`x-to-project-key=${secret}`,
    OTEL_METRICS_EXPORTER:'none', OTEL_LOGS_EXPORTER:'none',
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE:'100', OTEL_BSP_MAX_QUEUE_SIZE:'1000',
    OTEL_NODE_ENABLED_INSTRUMENTATIONS:integrationFor(integration).instruments,
  }
}
export const envSnippet = options => Object.entries(otelEnvironment(options)).map(([key,value])=>`${key}=${value}`).join('\n')
export const powershellSnippet = options => Object.entries(otelEnvironment(options)).map(([key,value])=>`$env:${key}='${String(value).replaceAll("'", "''")}'`).join('\n')
