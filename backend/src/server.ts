import "dotenv/config";
import app from "./app";

const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const isValidPort = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort < 65_536;

// Railway always provides PORT. Keep a fallback solely for local development so
// a production deployment never silently listens on an unexpected port.
if (!isValidPort && process.env.NODE_ENV === "production") {
  throw new Error("PORT must be set to a valid port number in production.");
}

const port = isValidPort ? configuredPort : 5002;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`🚆 Railway Block Planning API running on http://${host}:${port}`);
});
