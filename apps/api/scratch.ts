async function reScrapeAll() {
  const dates = ["02.07.2026", "03.07.2026"];
  const trains = ["12992", "12990"];

  for (const date of dates) {
    for (const trainNo of trains) {
      console.log(`\n=== Re-scraping train ${trainNo} for ${date} ===`);
      try {
        const res = await fetch("http://localhost:3002/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trainNumber: trainNo, date }),
        });
        const data = await res.json();
        if (data.success) {
          console.log(`✅ Cleaned up ${trainNo} on ${date}`);
        } else {
          console.log(`❌ Error for ${trainNo} on ${date}: ${data.error}`);
        }
      } catch (e: any) {
        console.error(`❌ Fetch error: ${e.message}`);
      }
    }
  }
}

reScrapeAll();
