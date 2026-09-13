import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT ?? 5000);

app.listen(port, () => {
  console.log(`🚆 Railway Block Planning API running on http://localhost:${port}`);
});
