import { useMemo, useState } from "react";
import JSZip from "jszip";

const EMOTIONS = [
  "hit",
  "hot",
  "bewildered",
  "blaze",
  "stunned",
  "angry",
  "oops",
  "wink",
  "cheers",
  "chu",
  "cry",
  "pain",
  "qBlue",
  "shine",
  "smile",
  "blink",
  "dam",
  "bowing",
  "default",
  "troubled",
  "vomit",
  "despair",
  "glitter",
  "hum",
  "love",
];

function classifyItems(items) {
  const out = {
    body: null,
    head: null,
    hair: null,
    face: null,
    hat: null,
    faceAccessory: null,
    eyeDecoration: null,
    earrings: null,
  };

  for (const item of items) {
    const id = item.itemId;

    if (out.body === null && id >= 2000 && id < 3000) {
      out.body = id;
      continue;
    }
    if (out.head === null && id >= 12000 && id < 13000) {
      out.head = id;
      continue;
    }
    if (out.hair === null && id >= 30000 && id < 50000) {
      out.hair = id;
      continue;
    }
    if (out.face === null && id >= 20000 && id < 30000) {
      out.face = id;
      continue;
    }
    if (out.hat === null && id >= 1000000 && id < 1010000) {
      out.hat = id;
      continue;
    }
    if (out.faceAccessory === null && id >= 1010000 && id < 1020000) {
      out.faceAccessory = id;
      continue;
    }
    if (out.eyeDecoration === null && id >= 1020000 && id < 1030000) {
      out.eyeDecoration = id;
      continue;
    }
    if (out.earrings === null && id >= 1030000 && id < 1040000) {
      out.earrings = id;
      continue;
    }
  }

  return out;
}

function buildJson(slotIds, emotion, uniqueId) {
  if (!slotIds.body || !slotIds.head || !slotIds.hair || !slotIds.face) {
    throw new Error("Missing required slots: Body, Head, Hair, or Face.");
  }

  const selectedItems = {
    Body: {
      id: slotIds.body,
      region: "GMS",
      version: "265",
      alpha: 0,
    },
    Head: {
      id: slotIds.head,
      region: "GMS",
      version: "265",
    },
    Hair: {
      id: slotIds.hair,
      region: "GMS",
      version: "265",
    },
    Face: {
      id: slotIds.face,
      region: "GMS",
      version: "265",
    },
  };

  if (slotIds.eyeDecoration) {
    selectedItems["Eye Decoration"] = {
      id: slotIds.eyeDecoration,
      region: "GMS",
      version: "265",
    };
  }

  if (slotIds.faceAccessory) {
    selectedItems["Face Accessory"] = {
      id: slotIds.faceAccessory,
      region: "GMS",
      version: "265",
    };
  }

  if (slotIds.hat) {
    selectedItems.Hat = {
      id: slotIds.hat,
      region: "GMS",
      version: "265",
    };
  }

  if (slotIds.earrings) {
    selectedItems.Earrings = {
      id: slotIds.earrings,
      region: "GMS",
      version: "265",
    };
  }

  return {
    id: uniqueId,
    type: "character",
    action: "stand1",
    emotion,
    skin: slotIds.body,
    zoom: 5,
    frame: 0,
    selectedItems,
    visible: true,
    position: {
      x: 0,
      y: 0,
    },
  };
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9_-]/gi, "_");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function decodeUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export default function App() {
  const [ign, setIgn] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotIds, setSlotIds] = useState(null);
  const [redirectedUrl, setRedirectedUrl] = useState("");
  const [decodedRedirectedUrl, setDecodedRedirectedUrl] = useState("");
  const [zipBlob, setZipBlob] = useState(null);
  const [zipFilename, setZipFilename] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const summary = useMemo(() => {
    if (!slotIds) return [];
    return [
      ["Body", slotIds.body],
      ["Head", slotIds.head],
      ["Hair", slotIds.hair],
      ["Face", slotIds.face],
      ["Hat", slotIds.hat],
      ["Face Accessory", slotIds.faceAccessory],
      ["Eye Decoration", slotIds.eyeDecoration],
      ["Earrings", slotIds.earrings],
    ];
  }, [slotIds]);

  async function generate() {
    const trimmedIgn = ign.trim();
    if (!trimmedIgn) {
      setStatus("Enter an IGN first.");
      return;
    }

    setLoading(true);
    setStatus("Loading avatar data...");
    setSlotIds(null);
    setRedirectedUrl("");
    setDecodedRedirectedUrl("");
    setZipBlob(null);
    setZipFilename("");
    setCopyStatus("");

    try {
      const response = await fetch(`/api/avatar?ign=${encodeURIComponent(trimmedIgn)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load avatar data.");
      }

      const classified = classifyItems(data.items);

      if (!classified.body || !classified.head || !classified.hair || !classified.face) {
        throw new Error("Could not find all required slots: Body, Head, Hair, Face.");
      }

      setSlotIds(classified);
      setRedirectedUrl(data.finalUrl);
      setDecodedRedirectedUrl(decodeUrl(data.finalUrl));

      const zip = new JSZip();
      const safeIgn = sanitizeFileName(trimmedIgn);
      const folder = zip.folder(safeIgn) || zip;
      const baseId = Date.now();

      EMOTIONS.forEach((emotion, index) => {
        const json = buildJson(classified, emotion, baseId + index + 1);
        folder.file(
          `${safeIgn}_${emotion}.json`,
          JSON.stringify(json, null, 2)
        );
      });

      folder.file(
        `${safeIgn}_metadata.json`,
        JSON.stringify(
          {
            ign: trimmedIgn,
            generatedAt: new Date().toISOString(),
            redirectedUrl: data.finalUrl,
            decodedRedirectedUrl: decodeUrl(data.finalUrl),
            detectedSlots: classified,
            emotions: EMOTIONS,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: "blob" });
      setZipBlob(blob);
      setZipFilename(`${safeIgn}_maplesim_jsons.zip`);

      setStatus(`Generated ZIP with ${EMOTIONS.length} JSON files for ${trimmedIgn}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!decodedRedirectedUrl) return;
    try {
      await navigator.clipboard.writeText(decodedRedirectedUrl);
      setCopyStatus("Copied.");
      window.setTimeout(() => setCopyStatus(""), 1500);
    } catch {
      setCopyStatus("Copy failed.");
      window.setTimeout(() => setCopyStatus(""), 1500);
    }
  }

  function downloadZip() {
    if (!zipBlob || !zipFilename) return;
    downloadBlob(zipFilename, zipBlob);
  }

  return (
    <div className="app-shell">
      <div className="card">
        <h1>MapleLegends Emoji JSON Generator</h1>
        <p className="subtitle">
          Generates JSON files for import into https://maples.im. Unfortunately, does not allow further edits of the images.
        </p>
        <p>Created by thsscapi (Sparrow)</p>

        <div className="controls">
          <input
            value={ign}
            onChange={(e) => setIgn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") generate();
            }}
            placeholder="Enter IGN"
          />
          <button onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate ZIP"}
          </button>
        </div>

        <div className="status-box inline-status-box">
          <span>{status || "No files generated yet."}</span>
          {zipBlob && (
            <button onClick={downloadZip} className="secondary-btn inline-download-btn">Download ZIP</button>
          )}
        </div>

        <div className="instructions-box">
          <h2>Step 1: Obtain your images</h2>
          <ol>
            <li>Enter IGN of the character and click Generate.</li>
            <li>Download the ZIP file above and unzip it.</li>
            <li>Go to https://maples.im</li>
            <li>Mouseover the "+" icon below and click Import Character</li>
            <li>Navigate to your unzipped folder and select all the JSON files</li>
            <li>Right-click the image you want and save it</li>
          </ol>
        </div>

        <div className="instructions-box">
          <h2>Step 2: Upload to Discord</h2>
          <ol>
            <li>On Discord, click the Emoji button, then Add Emoji</li>
            <li>Select your downloaded image, then adjust the Zoom and Position</li>
            <li>Save it and you're done!</li>
          </ol>
        </div>

        {(slotIds || redirectedUrl) && (
          <div className="compact-grid preview-first-grid">
            {redirectedUrl && (
              <div className="panel compact-panel preview-panel">
                <h2>Character preview</h2>
                <div className="preview-box">
                  <img src={redirectedUrl} alt="Character preview" className="character-preview" />
                </div>
              </div>
            )}

            {slotIds && (
              <div className="panel compact-panel">
                <h2>Detected slots</h2>
                <div className="slot-list compact-list">
                  {summary.map(([label, value]) => (
                    <div key={label} className="slot-row compact-row">
                      <span>{label}</span>
                      <code>{String(value ?? "-")}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {decodedRedirectedUrl && (
          <div className="panel">
            <div className="panel-header-row">
              <h2>Redirected character URL</h2>
              <div className="link-actions">
                <a href={redirectedUrl} target="_blank" rel="noreferrer" className="secondary-btn">
                  Go to link
                </a>
                <button onClick={copyToClipboard} className="secondary-btn">Copy to clipboard</button>
              </div>
            </div>
            <textarea readOnly value={decodedRedirectedUrl} />
            {copyStatus && <div className="copy-status">{copyStatus}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
