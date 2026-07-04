import * as cheerio from "cheerio";

async function testSearchKeywords(trainNumber: string, date: string) {
  const pageUrl = `https://bilete.infofer.ro/ro-RO/Trains?TrainRunningNumber=${trainNumber}&Date=${date}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const cookies = pageRes.headers.getSetCookie?.() || [];
  const cookieString = cookies.map((c) => c.split(";")[0]).join("; ");
  const html = await pageRes.text();
  const $page = cheerio.load(html);

  const formData: Record<string, string> = {};
  $page("#form-search input[type='hidden']").each((_, el) => {
    formData[$page(el).attr("name") || ""] = $page(el).attr("value") || "";
  });

  const postUrl = "https://bilete.infofer.ro/ro-RO/Trains/TrainsResult";
  const resultRes = await fetch(postUrl, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieString,
      "X-Requested-With": "XMLHttpRequest",
      "Referer": pageUrl,
    },
    body: new URLSearchParams(formData).toString(),
  });

  const resultHtml = await resultRes.text();
  
  // Let's print out all texts of all spans, divs, a, p
  const $ = cheerio.load(resultHtml);
  const words = ["CFR", "Calatori", "Interregional", "Viaterra", "Via Terra", "Transferoviar", "Regio", "Softrans", "Astra", "Carpatic"];
  
  console.log("Checking resultHtml texts...");
  $("*").each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    for (const w of words) {
      if (text.toLowerCase().includes(w.toLowerCase())) {
        console.log(`Matched Word: "${w}" in element <${el.name}>: "${text.slice(0, 150)}"`);
      }
    }
  });
}

testSearchKeywords("16534", "03.07.2026");
