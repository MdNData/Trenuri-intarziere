async function trigger() {
  const res = await fetch("http://localhost:3002/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainNumber: "16534", date: "03.07.2026" }),
  });
  console.log(`STATUS: ${res.status}`);
  const data = await res.json();
  console.log("RESPONSE:", JSON.stringify(data, null, 2));
}
trigger();
