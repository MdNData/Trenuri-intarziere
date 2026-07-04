import * as cheerio from "cheerio";

async function testInfoferScrape(trainNumber: string, date: string) {
  const pageUrl = `https://bilete.infofer.ro/ro-RO/Trains?TrainRunningNumber=${trainNumber}&Date=${date}`;
  console.log(`GET ${pageUrl}`);

  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
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

  console.log("Form Data extracted from Infofer:", formData);

  if (!formData["TrainRunningNumber"]) {
    console.log("❌ TrainRunningNumber input NOT found on Infofer!");
    return;
  }

  const postUrl = "https://bilete.infofer.ro/ro-RO/Trains/TrainsResult";
  console.log(`POST ${postUrl}`);

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

  console.log(`POST response status: ${resultRes.status}`);
  const resultHtml = await resultRes.text();
  const $ = cheerio.load(resultHtml);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  console.log("Result Body length:", resultHtml.length);
  console.log("Result Snippet:", bodyText.slice(0, 500));
  
  // Find rows
  const rows = $(".row");
  console.log("Stops Row count:", rows.length);
  rows.slice(0, 10).each((_, r) => {
    console.log("Row:", $(r).text().replace(/\s+/g, " ").trim());
  });
}

testInfoferScrape("16534", "03.07.2026");
