exports.handler = async (event) => {
  const SOURCES = {
    tech:    ["https://www.theverge.com/rss/index.xml", "https://techcrunch.com/feed/"],
    foot:    ["https://rmcsport.bfmtv.com/rss/football/", "https://www.lequipe.fr/rss/actu_rss_Football.xml"],
    geo:     ["https://www.lemonde.fr/rss/une.xml", "https://www.france24.com/fr/rss"],
    finance: ["https://www.lemonde.fr/economie/rss_full.xml", "https://feeds.lesechos.fr/rss_les_echos_finance.xml"],
    sport:   ["https://www.lequipe.fr/rss/actu_rss.xml", "https://www.eurosport.fr/rss.xml"]
  };

  const cat = event.queryStringParameters?.cat || "tech";
  const urls = SOURCES[cat] || SOURCES.tech;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  try {
    const results = await Promise.allSettled(
      urls.map(url =>
        fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) })
          .then(r => r.text())
          .then(xml => parseRSS(xml, url))
      )
    );

    const articles = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .filter((a, i, arr) => arr.findIndex(b => b.title === a.title) === i)
      .slice(0, 20);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, articles }) };

  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};

function parseRSS(xml, sourceUrl) {
  const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)];
  const domain = new URL(sourceUrl).hostname.replace("www.", "").replace("feeds.", "").split(".")[0];
  const sourceName = {
    "theverge": "The Verge", "techcrunch": "TechCrunch",
    "rmcsport": "RMC Sport", "lequipe": "L'Équipe",
    "lemonde": "Le Monde", "france24": "France 24",
    "lesechos": "Les Échos", "eurosport": "Eurosport"
  }[domain] || domain;

  return items.slice(0, 10).map(m => {
    const block = m[1];
    const title   = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim() || "";
    const link    = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1]?.trim() || "#";
    const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || "";
    return { title, link, pubDate, source: sourceName };
  }).filter(a => a.title && a.link !== "#");
}
