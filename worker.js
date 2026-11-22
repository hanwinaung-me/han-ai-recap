const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Upload-Url,X-Upload-Offset,X-Upload-Final,X-Upload-Mime",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geminiFetch(url, init, env) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      const body = await res.text();
      last = { status: res.status, body };
      if (![429, 500, 502, 503, 504].includes(res.status) || attempt === 2) {
        return new Response(body, { status: res.status, headers: { "Content-Type": "application/json", ...CORS } });
      }
    } catch (e) {
      last = { status: 503, body: String(e) };
      if (attempt === 2) return json({ error: "Network error", detail: last.body }, 503);
    }
    await sleep(attempt === 0 ? 10000 : 20000);
  }
  return json({ error: "Gemini temporarily unavailable", detail: last }, 503);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    if (!env.GEMINI_API_KEY) return json({ error: "Server is missing GEMINI_API_KEY secret." }, 500);

    if (url.pathname === "/api/upload/start" && request.method === "POST") {
      const { size, mimeType, displayName } = await request.json();
      if (!size || size <= 0) return json({ error: "Invalid file size." }, 400);
      const mime = mimeType || "video/mp4";
      const start = await geminiFetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(size),
            "X-Goog-Upload-Header-Content-Type": mime,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: { display_name: displayName || "HAN-upload" } })
        }, env
      );
      if (!start.ok) return start;
      const uploadUrl = start.headers.get("x-goog-upload-url");
      if (!uploadUrl) return json({ error: "Gemini did not return an upload session URL." }, 502);
      return json({ uploadUrl });
    }

    if (url.pathname === "/api/upload/chunk" && request.method === "POST") {
      const uploadUrl = request.headers.get("X-Upload-Url");
      const offset = request.headers.get("X-Upload-Offset");
      const final = request.headers.get("X-Upload-Final") === "true";
      const mime = request.headers.get("X-Upload-Mime") || "video/mp4";
      if (!uploadUrl || !offset) return json({ error: "Missing upload session details." }, 400);
      // Only forward to Google's upload host to prevent this endpoint becoming an open proxy.
      let target;
      try { target = new URL(uploadUrl); } catch { return json({ error: "Invalid upload URL." }, 400); }
      if (target.hostname !== "generativelanguage.googleapis.com") return json({ error: "Untrusted upload host." }, 400);
      const headers = {
        "Content-Type": mime,
        "X-Goog-Upload-Offset": offset,
        "X-Goog-Upload-Command": final ? "upload, finalize" : "upload",
      };
      const result = await geminiFetch(uploadUrl, { method: "POST", headers, body: request.body }, env);
      return new Response(result.body, { status: result.status, headers: { ...CORS, "Content-Type": result.headers.get("Content-Type") || "application/json" } });
    }

    if (url.pathname === "/api/file/status" && request.method === "POST") {
      const { name } = await request.json();
      if (!/^files\/[a-zA-Z0-9-]+$/.test(name || "")) return json({ error: "Invalid Gemini file name." }, 400);
      const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {}, env);
      return new Response(res.body, { status: res.status, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      const { fileUri, mimeType, storyTitle, targetMinutes, voiceStyle } = await request.json();
      if (!fileUri || !String(fileUri).startsWith("https://")) return json({ error: "Missing Gemini file URI." }, 400);
      const prompt = `You are the story editor for HAN, a Myanmar-language recap channel.
Analyze this AI-created Chinese-style story video and create an ORIGINAL Burmese-language recap script.
Do not reproduce dialogue verbatim, do not imitate a specific creator, and do not claim the source is copyright-free.
Explain the plot accurately in your own words, keep character names consistent, preserve cause-and-effect, avoid inventing scenes.
Make the opening hook engaging without misleading viewers. Include natural transitions and a short ending.
Target narration length: about ${targetMinutes || 8} minutes.
Voice presentation: ${voiceStyle || "warm, clear Burmese narrator"}.
Story title if supplied: ${storyTitle || "Untitled"}.
Return plain Burmese text with these headings:
ခေါင်းစဉ်
စိတ်ဝင်စားဖွယ် အဖွင့်
ဇာတ်လမ်းအကျဉ်း
အဓိကဇာတ်ကြောင်း
အဆုံးသတ်နှင့် ကိုယ်ပိုင်သုံးသပ်ချက်
Do not include timestamps unless they are clearly known from the video.`;
      const res = await geminiFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || "gemini-3.8-flash"}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { file_data: { mime_type: mimeType || "video/mp4", file_uri: fileUri } },
              { text: prompt }
            ] }],
            generationConfig: { temperature: 0.65, maxOutputTokens: 8192 }
          })
        }, env
      );
      return new Response(res.body, { status: res.status, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    return json({ error: "Not found" }, 404);
  }
};
