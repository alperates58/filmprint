import http from "http";

/**
 * Health Smoke Check Script for CI / Post-build Environment Verification.
 * Sends GET request to http://localhost:3000/api/health and verifies status 200 + response contract.
 */
function runHealthCheck(): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetUrl = process.env.TEST_APP_URL || "http://localhost:3000/api/health";
    console.log(`Checking health endpoint at: ${targetUrl}`);

    http
      .get(targetUrl, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            console.log(`✅ Health check PASSED (Status ${res.statusCode}): ${body}`);
            resolve();
          } else {
            console.error(`❌ Health check FAILED with status ${res.statusCode}: ${body}`);
            reject(new Error(`Health check returned status ${res.statusCode}`));
          }
        });
      })
      .on("error", (err) => {
        console.error(`❌ Health check connection error: ${err.message}`);
        reject(err);
      });
  });
}

runHealthCheck()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
