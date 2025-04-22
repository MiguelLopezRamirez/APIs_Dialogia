const axios = require('axios');

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  async moderateContent(content) {
    try {
      const prompt = `Evalúa el siguiente contenido para un debate público y determina si debe ser:
1. ACEPTADO (contenido apropiado)
2. CENSURADO (contenido cuestionable pero no grave)
3. ELIMINADO (contenido ofensivo, peligroso o ilegal)

Reglas:
- Eliminar contenido con odio, discriminación, amenazas o información peligrosa
- Censurar lenguaje vulgar, insultos leves o contenido poco constructivo
- Aceptar opiniones polémicas pero respetuosas

Contenido a evaluar: "${content}"

Proporciona tu respuesta en formato JSON con esta estructura:
{
  "decision": "ACEPTADO|CENSURADO|ELIMINADO",
  "reason": "Razón detallada de la decisión",
  "flaggedCategories": ["categorías relevantes"]
}`;

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        }
      );

      // Parsear la respuesta de Gemini
      const responseText = response.data.candidates[0].content.parts[0].text;
      let moderationResult;
      
      try {
        // Intentar extraer el JSON de la respuesta
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        moderationResult = JSON.parse(responseText.substring(jsonStart, jsonEnd));
      } catch (e) {
        // Si falla el parseo, usar valores por defecto
        
        moderationResult = {
          decision: 'ACEPTADO',
          reason: 'Error al procesar moderación, revisión manual requerida',
          flaggedCategories: []
        };
      }

      return moderationResult;
    } catch (error) {
      
      // En caso de error, permitir el contenido pero marcarlo para revisión
      return {
        decision: 'ACEPTADO',
        reason: 'Error en servicio de moderación, revisión manual requerida',
        flaggedCategories: []
      };
    }
  }
}

module.exports = new GeminiService();