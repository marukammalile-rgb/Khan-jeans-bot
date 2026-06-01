const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ─── YOUR CREDENTIALS (set these in Render Environment Variables) ──────────────
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;       // Meta access token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;     // Meta phone number ID
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;           // Any word you choose e.g. "khanjeans2024"
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // Your Claude API key

// ─── KHAN JEANS SYSTEM PROMPT ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the official AI Sales Assistant for KHAN JEANS — a men's fashion store in Tanzania.

Your job is to:
- Welcome customers warmly
- Answer questions about products, sizes, prices, payment, and delivery
- Help customers place orders step by step
- Recommend the right products
- Increase sales while staying polite and professional

== LANGUAGE RULES ==
- If the customer writes in Swahili → reply fully in Swahili
- If the customer writes in English → reply fully in English
- If they mix both → match their mix naturally
- Keep replies short, friendly, and professional

== PRODUCTS & PRICES ==

MEN'S JEANS (Suruali za Wanaume)
Available Sizes: 28 to 58

Retail Prices:
- Size 28–38: TZS 20,000 – 25,000
- Size 40–48: TZS 25,000 – 30,000
- Size 50–56: TZS 35,000 – 45,000

Wholesale Prices:
- Size 28–38: TZS 18,000 each
- Size 40–56: TZS 20,000 each

T-SHIRTS: TZS 30,000 – 40,000
SHOES (Viatu): Starting from TZS 65,000

== DELIVERY ==
Dar es Salaam: Via Bolt Package (fee depends on location)
Tanzania Nationwide: Available (cost depends on package & destination)

== PAYMENT ==
Mix by Yas — Lipa Namba: 22427119 — Business: KHAN JEANS

== ORDER PROCESS ==
Collect step by step:
1. Product
2. Size
3. Quantity
4. Color
5. Delivery location
6. Name and phone number

After collecting all, summarize and send payment instructions:
"Asante! Fanya malipo Mix by Yas — Lipa Namba: 22427119 (KHAN JEANS). Tuma picha ya risiti hapa. Maswali: 0621176561"

Always keep replies concise — this is WhatsApp, not email. Max 3-4 short paragraphs.`;

// ─── CONVERSATION MEMORY (in-memory, resets on server restart) ────────────────
// For production, replace with a database like Redis or MongoDB
const conversations = {};

function getHistory(phone) {
  if (!conversations[phone]) conversations[phone] = [];
  return conversations[phone];
}

function addToHistory(phone, role, content) {
  if (!conversations[phone]) conversations[phone] = [];
  conversations[phone].push({ role, content });
  // Keep last 20 messages to avoid token limits
  if (conversations[phone].length > 20) {
    conversations[phone] = conversations[phone].slice(-20);
  }
}

// ─── SEND WHATSAPP MESSAGE ─────────────────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.response?.data || err.message);
  }
}

// ─── ASK CLAUDE AI ─────────────────────────────────────────────────────────────
async function askClaude(phone, userMessage) {
  addToHistory(phone, "user", userMessage);
  const history = getHistory(phone);

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.content[0].text;
    addToHistory(phone, "assistant", reply);
    return reply;
  } catch (err) {
    console.error("❌ Claude API error:", err.response?.data || err.message);
    return "Samahani, kuna tatizo kidogo. Tafadhali jaribu tena au piga simu: 0621176561 🙏";
  }
}

// ─── WEBHOOK VERIFICATION (Meta requires this) ────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// ─── RECEIVE MESSAGES ─────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const from = message.from; // Customer's phone number
    const msgType = message.type;

    // Only handle text messages for now
    if (msgType !== "text") {
      await sendWhatsAppMessage(
        from,
        "Samahani, mimi nashughulikia maandishi tu kwa sasa. Tafadhali andika ujumbe wako. 😊\n\n_Sorry, I only handle text messages. Please type your message._"
      );
      return;
    }

    const userText = message.text.body;
    console.log(`📩 Message from ${from}: ${userText}`);

    // Get AI reply
    const aiReply = await askClaude(from, userText);
    await sendWhatsAppMessage(from, aiReply);

  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("🟢 Khan Jeans WhatsApp AI Server is running!");
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Khan Jeans server running on port ${PORT}`);
});
