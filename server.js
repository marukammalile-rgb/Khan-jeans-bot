const express = require("express");
const app = express();

app.use(express.json());

function getReply(message) {
  const msg = (message || "").toLowerCase();

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("mambo")) {
    return `Karibu Khan Jeans 👖

Tunauza men's jeans size 28-58.

Andika:
1 - Bei
2 - Sizes
3 - Wholesale
4 - Delivery
5 - Order`;
  }

  if (msg === "1" || msg.includes("bei") || msg.includes("price")) {
    return `BEI ZA KHAN JEANS

Size 28-38
Retail: 20,000 - 25,000 TZS
Wholesale: 18,000 TZS

Size 40-48
Retail: 25,000 - 30,000 TZS

Size 50-56
Retail: 35,000 - 45,000 TZS

Wholesale (40-56): 20,000 TZS`;
  }

  if (msg === "2" || msg.includes("size")) {
    return "Tunapatikana size 28 hadi 58.";
  }

  if (msg === "3" || msg.includes("wholesale")) {
    return `WHOLESALE

Size 28-38: 18,000 TZS
Size 40-56: 20,000 TZS`;
  }

  if (msg === "4" || msg.includes("delivery")) {
    return "Tunafanya delivery Dar es Salaam kupitia Bolt Package na Tanzania nzima kupitia mabasi/courier.";
  }

  if (msg === "5" || msg.includes("order")) {
    return `Tafadhali tuma:

Jina:
Size:
Quantity:
Location:

Tutakujibu haraka kwa uthibitisho wa order.`;
  }

  return "Karibu Khan Jeans. Andika 1 (Bei), 2 (Sizes), 3 (Wholesale), 4 (Delivery), au 5 (Order).";
}

app.post("/webhook", (req, res) => {
  const message = req.body.message || "";
  res.json({ reply: getReply(message) });
});

app.get("/", (req, res) => {
  res.send("Khan Jeans Bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
