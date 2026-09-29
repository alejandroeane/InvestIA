export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método no permitido" });
  }

  let body;
  try {
    body = request.body;
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    return response.status(400).json({ error: "JSON no válido" });
  }

  const question = body?.question;
  const language = body?.language;

  if (typeof question !== "string" || !question.trim() || question.length > 500) {
    return response.status(400).json({
      error: "La pregunta debe tener entre 1 y 500 caracteres"
    });
  }

  if (language !== "es" && language !== "en") {
    return response.status(400).json({ error: "Idioma no válido" });
  }

  if (!process.env.GROQ_API_KEY) {
    return response.status(503).json({
      error: "Falta configurar GROQ_API_KEY en Vercel"
    });
  }

  const systemMessage = language === "es"
    ? "Eres InvestIA en una prueba técnica. Responde en español, de forma breve. Todavía NO tienes acceso a informes, noticias ni datos actuales. No inventes resultados financieros, precios o noticias. Si te preguntan por una empresa, explica que la búsqueda de fuentes aún no está implementada. No des recomendaciones de inversión."
    : "You are InvestIA in a technical test. Respond briefly in English. You do NOT yet have access to reports, news, or current data. Do not invent financial results, prices, or news. If asked about a company, explain that source retrieval has not been implemented yet. Do not give investment recommendations.";

  try {
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: question.trim() }
          ],
          reasoning_effort: "low",
          include_reasoning: false,
          max_completion_tokens: 350
        })
      }
    );

    if (!groqResponse.ok) {
      console.error("Groq error:", groqResponse.status);
      return response.status(502).json({
        error: language === "es"
          ? "No se pudo obtener respuesta de Groq"
          : "Could not get a response from Groq"
      });
    }

    const result = await groqResponse.json();
    const answer = result.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return response.status(502).json({
        error: language === "es"
          ? "Groq devolvió una respuesta vacía"
          : "Groq returned an empty response"
      });
    }

    return response.status(200).json({ answer });
  } catch (error) {
    console.error("Groq request failed:", error);
    return response.status(502).json({
      error: language === "es"
        ? "Error al contactar con Groq"
        : "Error contacting Groq"
    });
  }
}