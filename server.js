import express from "express";

const app = express();
const PORT = 3001;

app.get("/api/avatar", async (req, res) => {
  try {
    const ign = String(req.query.ign || "").trim();

    if (!ign) {
      return res.status(400).json({ error: "Missing IGN." });
    }

    const response = await fetch(
      `https://maplelegends.com/api/getavatar?name=${encodeURIComponent(ign)}`,
      { redirect: "follow" }
    );

    const finalUrl = response.url;

    if (!finalUrl.includes("/api/character/")) {
      return res.status(500).json({
        error: "Unexpected redirect URL from MapleLegends.",
        finalUrl,
      });
    }

    const match = finalUrl.match(/\/api\/character\/([^/]+)\/stand/i);
    if (!match) {
      return res.status(500).json({
        error: "Could not parse character segment from redirected URL.",
        finalUrl,
      });
    }

    const decoded = decodeURIComponent(match[1]);
    const items = JSON.parse(`[${decoded}]`);

    return res.json({ items, finalUrl });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown server error.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});