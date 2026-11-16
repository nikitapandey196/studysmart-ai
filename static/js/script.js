// StudySmart AI - front-end logic
const $ = (id) => document.getElementById(id);

const material = $("material");
const generateBtn = $("generateBtn");
const message = $("message");
const MAX_CHARS = 30000;
let lastResult = { label: "", text: "" };

const SAMPLE = `Photosynthesis is the process by which green plants, algae and some bacteria convert light energy into chemical energy stored in glucose. It takes place mainly in the chloroplasts of leaf cells, which contain a green pigment called chlorophyll. Chlorophyll absorbs sunlight, mostly in the red and blue wavelengths, and reflects green light, which is why leaves look green.

The process has two stages. In the light-dependent reactions, which occur in the thylakoid membranes, light energy splits water molecules into oxygen, protons and electrons. Oxygen is released as a by-product, and the energy is stored in ATP and NADPH. In the Calvin cycle, which occurs in the stroma, the plant uses ATP and NADPH to convert carbon dioxide into glucose.

The overall equation is: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2. Factors that affect the rate of photosynthesis include light intensity, carbon dioxide concentration and temperature. Photosynthesis is essential for life on Earth because it produces the oxygen we breathe and forms the base of most food chains.`;

// ---------- helpers ----------
// fetch wrapper: if the login session has expired, go back to the login page
async function api(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("login required");
  }
  return res;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

// Small, safe Markdown renderer (text is escaped first)
function renderMarkdown(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  let html = "";
  let list = null; // "ul" | "ol"

  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;

    if (!line.trim()) { closeList(); continue; }

    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      closeList();
      const level = Math.min(m[1].length + 1, 4); // # -> h2
      html += `<h${level}>${inline(m[2])}</h${level}>`;
    } else if (/^\s*([-*•])\s+/.test(line)) {
      if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; }
      html += `<li>${inline(line.replace(/^\s*([-*•])\s+/, ""))}</li>`;
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; }
      html += `<li>${inline(m[2])}</li>`;
    } else if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      closeList(); html += "<hr>";
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function showMessage(text, ok = false) {
  message.textContent = text;
  message.className = "message" + (ok ? " ok" : "");
  message.hidden = !text;
}

function updateCounter() {
  $("counter").textContent = `${material.value.length.toLocaleString()} / ${MAX_CHARS.toLocaleString()} characters`;
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.textContent = on ? "Generating..." : "Generate";
  $("loading").hidden = !on;
  if (on) {
    $("empty").hidden = true;
    $("output").hidden = true;
    $("meta").hidden = true;
    $("termsBox").hidden = true;
    $("resultActions").hidden = true;
  }
}

function showResult(data) {
  lastResult = { label: data.label, text: data.result };
  $("empty").hidden = true;
  $("meta").hidden = false;
  $("meta").textContent =
    `${data.label} \u00b7 your text: ${data.stats.words} words, about ${data.stats.reading_minutes} min read`;
  $("output").hidden = false;
  $("output").innerHTML = renderMarkdown(data.result);
  $("resultActions").hidden = false;

  const terms = $("terms");
  terms.innerHTML = "";
  (data.local_keywords || []).forEach((k) => {
    const li = document.createElement("li");
    li.textContent = k;
    terms.appendChild(li);
  });
  $("termsBox").hidden = terms.children.length === 0;
}

// ---------- generate ----------
async function generate() {
  const text = material.value.trim();
  showMessage("");

  if (!text) { showMessage("Add some study material first."); material.focus(); return; }

  const mode = selectedMode();
  setLoading(true);

  try {
    const res = await api(`/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      $("empty").hidden = !!lastResult.text;
      showMessage(data.error || "Something went wrong.");
      return;
    }
    showResult(data);
    loadHistory();
  } catch (err) {
    setLoading(false);
    $("empty").hidden = !!lastResult.text;
    showMessage("Could not reach the server. Make sure the Flask app is still running.");
  }
}

// ---------- PDF upload ----------
async function uploadPdf(file) {
  if (!file) return;
  const status = $("pdfStatus");
  status.textContent = "Reading PDF...";
  showMessage("");

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await api("/upload-pdf", { method: "POST", body: form });
    const data = await res.json();

    if (!data.success) {
      status.textContent = "Text-based PDFs up to 10 MB";
      showMessage(data.error);
      return;
    }
    material.value = data.text;
    updateCounter();
    status.textContent = `Loaded ${file.name} (${data.pages} pages)`;
    if (data.truncated) {
      showMessage(`Only the first ${MAX_CHARS.toLocaleString()} characters were loaded.`, true);
    }
  } catch (err) {
    status.textContent = "Text-based PDFs up to 10 MB";
    showMessage("Could not upload the PDF. Is the server running?");
  } finally {
    $("pdfInput").value = "";
  }
}

// ---------- history ----------
function formatTime(s) {
  const d = new Date(s.replace(" ", "T") + "Z");
  return isNaN(d) ? s : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const LABELS = {
  simplify: "Simplified notes", summary: "Summary", concepts: "Key concepts",
  keywords: "Keywords", questions: "Practice questions"
};

async function loadHistory() {
  try {
    const res = await api("/history");
    const data = await res.json();
    const list = $("historyList");
    list.innerHTML = "";

    data.items.forEach((item) => {
      const li = document.createElement("li");

      const main = document.createElement("div");
      main.className = "h-main";
      const title = document.createElement("div");
      title.className = "h-title";
      title.textContent = `${LABELS[item.mode] || item.mode} \u00b7 ${formatTime(item.created_at)}`;
      const prev = document.createElement("div");
      prev.className = "h-preview";
      prev.textContent = item.preview;
      main.append(title, prev);

      const actions = document.createElement("div");
      actions.className = "h-actions";
      const open = document.createElement("button");
      open.className = "link"; open.textContent = "Open";
      open.onclick = () => openHistory(item.id);
      const del = document.createElement("button");
      del.className = "link"; del.textContent = "Delete";
      del.onclick = async () => { await api(`/history/${item.id}`, { method: "DELETE" }); loadHistory(); };
      actions.append(open, del);

      li.append(main, actions);
      list.appendChild(li);
    });

    $("historyEmpty").hidden = data.items.length > 0;
    $("clearHistory").hidden = data.items.length === 0;
  } catch (err) { /* history is optional; ignore network errors */ }
}

async function openHistory(id) {
  const res = await api(`/history/${id}`);
  const data = await res.json();
  if (!data.success) { showMessage(data.error); return; }
  const item = data.item;
  material.value = item.input_text;
  updateCounter();
  document.querySelector(`input[name="mode"][value="${item.mode}"]`).checked = true;
  showResult({ label: item.label, result: item.result, stats: item.stats, local_keywords: item.local_keywords });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- result actions ----------
function fileName() {
  return `studysmart-${lastResult.label.toLowerCase().replace(/\s+/g, "-") || "notes"}.txt`;
}

$("copyBtn").onclick = async () => {
  try {
    await navigator.clipboard.writeText(lastResult.text);
    showMessage("Copied to clipboard.", true);
  } catch { showMessage("Copy failed. Select the text and copy it manually."); }
};

$("downloadBtn").onclick = () => {
  const blob = new Blob([lastResult.text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  a.click();
  URL.revokeObjectURL(a.href);
};

$("printBtn").onclick = () => window.print();

// ---------- wiring ----------
material.addEventListener("input", updateCounter);
generateBtn.addEventListener("click", generate);
material.addEventListener("keydown", (e) => { if (e.ctrlKey && e.key === "Enter") generate(); });
$("sampleBtn").onclick = () => { material.value = SAMPLE; updateCounter(); };
$("clearBtn").onclick = () => { material.value = ""; updateCounter(); showMessage(""); };
$("pdfInput").addEventListener("change", (e) => uploadPdf(e.target.files[0]));
$("clearHistory").onclick = async () => {
  if (confirm("Delete all saved history?")) { await api("/history", { method: "DELETE" }); loadHistory(); }
};

updateCounter();
loadHistory();
