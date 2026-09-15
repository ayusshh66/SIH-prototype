import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT ?? 5002);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`🚆 Railway Block Planning API running on http://${host}:${port}`);
});
