import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocs() {
  return (
    <main style={{ padding: "24px" }}>
      <h1>T.O. Monitoring API Documentation</h1>
      <p>
        Connect your application using OpenTelemetry.
      </p>

      <SwaggerUI
        url="/openapi.yaml"
        supportedSubmitMethods={[]}
      />
    </main>
  );
}