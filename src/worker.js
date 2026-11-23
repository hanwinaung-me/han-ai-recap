
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function geminiError(response) {
  const body = await response.text();
  return json({ error: body || "Gemini API error" }, response.status);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const key = env.GEMINI_API_KEY;

    if (path === "/api/health") {
      return json({ app: "HAN AI RECAP", status: "online" });
    }

    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (!key) {
      return json({ error: "GEMINI_API_KEY မရှိပါ။" }, 500);
    }

    try {
      if (path === "/api/upload/start" && request.method === "POST") {
        const data = await request.json();
        const size = Number(data.size);
        const mimeType = data.mimeType;

        if (!size || size < 1 || size > 2 * 1024 * 1024 * 1024) {
          return json({ error: "ဗီဒီယိုဖိုင်အရွယ်အစား မမှန်ပါ။" }, 400);
        }

        if (!["video/mp4", "video/quicktime", "video/webm"].includes(mimeType)) {
          return json({ error: "Video format မထောက်ပံ့ပါ။" }, 400);
        }

        const response = await fetch(
          `${GEMINI_BASE}/upload/v1beta/files?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "X-Goog-Upload-Protocol": "resumable",
              "X-Goog-Upload-Command": "start",
              "X-Goog-Upload-Header-Content-Length": String(size),
              "X-Goog-Upload-Header-Content-Type": mimeType,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              file: {
                display_name: String(data.displayName || "HAN video").slice(0, 200)
              }
            })
          }
        );

        if (!response.ok) return geminiError(response);

        const uploadUrl = response.headers.get("x-goog-upload-url");
        if (!uploadUrl) {
          return json({ error: "Gemini upload URL မရရှိပါ။" }, 502);
        }

        return json({ uploadUrl });
      }

      if (path === "/api/upload/chunk" && request.method === "POST") {
        const uploadUrl = request.headers.get("X-Upload-Url");
        const offset = request.headers.get("X-Upload-Offset");
        const isFinal = request.headers.get("X-Upload-Final") === "true";
        const mimeType = request.headers.get("X-Upload-Mime");

        let target;
        try {
          target = new URL(uploadUrl);
        } catch {
          return json({ error: "Upload URL မမှန်ပါ။" }, 400);
        }

        if (
          target.protocol !== "https:" ||
          target.hostname !== "generativelanguage.googleapis.com" ||
          !target.pathname.startsWith("/upload/v1beta/files")
        ) {
          return json({ error: "Upload URL ကို ခွင့်မပြုပါ။" }, 400);
        }

        if (!/^\d+$/.test(offset || "") ||
            !["video/mp4", "video/quicktime", "video/webm"].includes(mimeType)) {
          return json({ error: "Upload header မမှန်ပါ။" }, 400);
        }

        const response = await fetch(target.toString(), {
          method: "POST",
          headers: {
            "X-Goog-Upload-Command": isFinal ? "upload, finalize" : "upload",
            "X-Goog-Upload-Offset": offset,
            "Content-Type": mimeType
          },
          body: request.body
        });

        if (!response.ok) return geminiError(response);

        return new Response(response.body, {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (path === "/api/file/status" && request.method === "POST") {
        const data = await request.json();
        const name = String(data.name || "");

        if (!/^files\/[A-Za-z0-9_-]+$/.test(name)) {
          return json({ error: "Gemini file name မမှန်ပါ။" }, 400);
        }

        const response = await fetch(
          `${GEMINI_BASE}/v1beta/${name}?key=${encodeURIComponent(key)}`
        );

        if (!response.ok) return geminiError(response);

        const file = await response.json();

        return json({
          state: file.state,
          uri: file.uri,
          mimeType: file.mimeType,
          file
        });
      }

      if (path === "/api/analyze" && request.method === "POST") {
        const data = await request.json();

        if (!data.fileUri || !data.mimeType) {
          return json({ error: "Video file information မပြည့်စုံပါ။" }, 400);
        }

        const minutes = Math.min(
          15,
          Math.max(1, Number(data.targetMinutes) || 8)
        );

        const prompt = `
သင်သည် မြန်မာဘာသာဖြင့် ဇာတ်လမ်း Recap ရေးသားသူဖြစ်သည်။

ဇာတ်လမ်းအမည်: ${String(data.storyTitle || "မသိရသေးပါ").slice(0, 200)}
လိုချင်သော Recap ကြာချိန်: ${minutes} မိနစ်
ပြောဟန်: ${String(data.voiceStyle || "စိတ်ဝင်စားဖွယ် မြန်မာဇာတ်လမ်းပြောဟန်")}

ဗီဒီယိုကို သေချာလေ့လာပြီး မြန်မာဘာသာဖြင့် မူရင်းစကားအသုံးအနှုန်းဖြင့်
ဇာတ်လမ်းအကျဉ်းချုပ် Script ရေးပါ။

အဓိကဇာတ်ကောင်၊ ဖြစ်ရပ်အစဉ်၊ အရေးကြီးသောအလှည့်အပြောင်းနှင့်
အဆုံးသတ်ကို နားလည်လွယ်အောင် ရေးပါ။
မသေချာသော အချက်အလက်များကို မတီထွင်ပါနှင့်။
ဇာတ်လမ်းထဲက စကားပြောခန်းများကို အရှည်ကြီး တိုက်ရိုက်မကူးပါနှင့်။
Script သာ ပြန်ပေးပါ။
`;

        const response = await fetch(
          `${GEMINI_BASE}/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    file_data: {
                      mime_type: data.mimeType,
                      file_uri: data.fileUri
                    }
                  },
                  { text: prompt }
                ]
              }]
            })
          }
        );

        if (!response.ok) return geminiError(response);

        return new Response(response.body, {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return json({ error: "API route not found" }, 404);

    } catch (error) {
      return json({ error: error.message || "Server error" }, 500);
    }
  }
};
