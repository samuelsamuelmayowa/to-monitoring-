export const OTLP_URL = 'https://to-backendapi-v1-kctb.onrender.com/otlp/v1/traces'
// Verified with Node 22.23.3 and auto-instrumentations-node 0.83.1 / sdk-node 0.301.2.
export const OTEL_INSTALL = 'npm install @opentelemetry/api@1.10.0 @opentelemetry/auto-instrumentations-node@0.83.1'
export const OTEL_START = 'node --env-file=.env --require @opentelemetry/auto-instrumentations-node/register server.cjs'
export function otelEnvironment({ name = 'shopping-api', endpoint = OTLP_URL, secret = 'YOUR_PROJECT_SECRET' } = {}) {
  return {
    OTEL_SERVICE_NAME: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    OTEL_TRACES_EXPORTER: 'otlp',
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: 'http/json',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: endpoint,
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: `x-to-project-key=${secret}`,
    OTEL_METRICS_EXPORTER: 'none', OTEL_LOGS_EXPORTER: 'none',
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: '100', OTEL_BSP_MAX_QUEUE_SIZE: '1000',
    OTEL_NODE_ENABLED_INSTRUMENTATIONS: 'http,express',
  }
}
export const envSnippet = options => Object.entries(otelEnvironment(options)).map(([key, value]) => `${key}=${value}`).join('\n')
export const powershellSnippet = options => Object.entries(otelEnvironment(options)).map(([key, value]) => `$env:${key}='${value}'`).join('\n')
