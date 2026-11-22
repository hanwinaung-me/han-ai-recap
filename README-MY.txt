HAN AI RECAP STUDIO — BETA STARTER
=================================

ဒီ package က HAN ရဲ့ ပထမဆုံး deploy လုပ်နိုင်တဲ့ Beta ဖြစ်ပါတယ်။
ယခု version မှာ အလုပ်လုပ်ပေးနိုင်တာ:
- ဖုန်း Chrome မှ MP4/MOV/WEBM video ရွေးခြင်း
- Gemini Files API သို့ 4MB chunk များဖြင့် resumable upload
- Gemini file state ကို စစ်ဆေးခြင်း
- Gemini ကို အသုံးပြုပြီး မြန်မာ Recap Script ဖန်တီးခြင်း
- Script ကို ပြင်ခြင်း၊ ကူးခြင်း၊ TXT ဒေါင်းလုဒ်လုပ်ခြင်း
- 429/5xx အတွက် 10s/20s retry

မပြီးသေးသောအရာများ:
- အပိုင်းများစွာကို ဇာတ်လမ်းအစဉ်အတိုင်း အလိုအလျောက်ပေါင်းစပ်ခြင်း
- မြန်မာ TTS voice generation
- Word-level subtitle timing
- Auto scene cut / music mixing
- MP4 final rendering / export
- Multi-user persistent queue, account login, per-user storage
ဒါကြောင့် ယခု package ကို အပြီးသတ် MP4 editor လို့ မယူဆပါနှင့်။ Beta script generator ဖြစ်ပါတယ်။

လိုအပ်ချက်:
- Cloudflare account
- Google AI Studio API Key
- GitHub account (Git integration လုပ်မယ်ဆိုရင်)
- Node.js + Wrangler (ကွန်ပျူတာကနေ deploy လုပ်ရန်)
ဖုန်းတစ်လုံးတည်းဖြင့် setup လုပ်နိုင်သော်လည်း code upload/edit လုပ်ရတာ ပိုခက်နိုင်သည်။
Gemini API free tier က quota ရှိပြီး unlimited မဟုတ်ပါ။

DEPLOY (အလွယ်ဆုံး — GitHub + Cloudflare Workers)
-------------------------------------------------
1) ZIP ကို ဖြည်ပါ။
2) GitHub မှာ New repository ဖန်တီးပါ။ ဥပမာ han-ai-recap
3) ဒီ folder ထဲက ဖိုင်အားလုံးကို repository ထဲ upload လုပ်ပါ။
4) Cloudflare Dashboard > Workers & Pages > Create > Import a repository ကိုရွေးပါ။
5) Repository ကို ချိတ်ပါ။ Build command မလိုပါ (Wrangler config ပါပြီးသား)။
6) Deploy လုပ်ပြီး Worker URL ရလာပါမယ်။
7) Cloudflare > Worker > Settings > Variables and Secrets > Add secret
   Name: GEMINI_API_KEY
   Value: Google AI Studio မှရတဲ့ API Key
   Save ပြီး redeploy လုပ်ပါ။
8) (ရွေးချယ်နိုင်) Variable GEMINI_MODEL ကို gemini-3.8-flash ထားပါ။
   မိမိ API project မှာ ရနိုင်တဲ့ model ကိုသာ သုံးပါ။
9) Worker URL ကို Chrome မှာဖွင့်ပါ။ HAN dashboard ပေါ်လာပါမယ်။

API KEY:
https://aistudio.google.com/api-keys
Key ကို chat ထဲ၊ GitHub code ထဲ၊ website frontend ထဲ မထည့်ပါနှင့်။

အရေးကြီးတဲ့ ဗီဒီယိုအရွယ်အစား/ကြာချိန်
------------------------------------
- Cloudflare Free Worker request body limit က request တစ်ခုလျှင် 100MB ဖြစ်တယ်။
  ဒီ app က 4MB chunk ခွဲပို့တာကြောင့် Worker request တစ်ခုချင်းစီကို လျှော့ထားတယ်။
- Gemini Files API upload ကို resumable လုပ်ထားတယ်။
- Gemini model တစ်ခုချင်းစီရဲ့ video duration/token/size limits က မတူနိုင်တယ်။
- ၂ နာရီစာကို တစ်ခါတည်း analysis လုပ်ဖို့ မကြိုးစားပါနှင့်။ ၂၀–၃၀ မိနစ်စီ video editor ဖြင့် ခွဲပြီး တစ်ပိုင်းချင်းစီ တင်ပါ။
- ယခု beta က video segment တစ်ခုချင်းစီအတွက် script ထုတ်ပေးတယ်။ အပိုင်းအားလုံးကို အလိုအလျောက်ပေါင်းပြီး ဇာတ်လမ်းတစ်ခုတည်းဖြစ်အောင်လုပ်ပေးခြင်း မပါသေးပါ။

COPYRIGHT / YOUTUBE
-------------------
AI ဖန်တီးထားတဲ့ ဇာတ်လမ်းဖြစ်တာနဲ့ public domain / copyright-free လို့ မဆိုလိုပါ။
အသုံးပြုခွင့်ရှိတဲ့ content ကိုသာ အသုံးပြုပါ။ ကိုယ်ပိုင် commentary, analysis, criticism,
storytelling တို့ကို တကယ်ထည့်ပါ။ Copyright claim မရှိမယ်၊ Monetization ရမယ်လို့
ဒီ tool က အာမမခံပါ။ YouTube reused-content policy ကို စစ်ဆေးပါ။

RETRY / QUEUE
-------------
- ဒီ Beta မှာ Gemini 429/500/502/503/504 နှင့် network errors အချို့ကို
  10s ပြီး 20s နားပြီး အများဆုံး 3 ကြိမ်အထိ ပြန်စမ်းတယ်။
- Browser က upload chunk ကိုလည်း 10s/20s retry လုပ်တယ်။
- အများသုံးသူ queue မပါသေးပါ။ အများအပြား တစ်ပြိုင်နက်သုံးမယ်ဆိုရင် Durable Objects/Queues,
  user authentication, usage limits, database တို့ကို ထပ်ထည့်ရမယ်။
- Retry လုပ်တာက Google quota limit ကို မကျော်လွှားနိုင်ပါ။

TROUBLESHOOTING
---------------
- 403: API Key, project, model permission စစ်ပါ။
- 404: model name / file URI စစ်ပါ။
- 429: Free quota ပြည့်နိုင်တယ်။ နောက်မှပြန်စမ်းပါ။
- 413: Upload/segment size limit ကို စစ်ပါ။
- FAILED: Gemini video processing မအောင်မြင်။ အခြား encoding/segment ဖြင့်စမ်းပါ။
- API key မတွေ့: Cloudflare Secret name ကို GEMINI_API_KEY အတိအကျထားပါ။
