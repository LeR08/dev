import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'

const SYSTEM_PROMPT = `Tu es un conseiller factuel pour SubTrack, une application de suivi d'abonnements récurrents.
On te fournit la liste des abonnements actifs d'un utilisateur (nom, prix, devise, fréquence, catégorie) — jamais de données bancaires brutes.
Base-toi uniquement sur ces données, sans supposer d'informations non fournies. Donne des conseils factuels et actionnables :
- doublons potentiels (ex : deux services de streaming, deux outils similaires)
- abonnements de la même catégorie qui pourraient être consolidés
- le coût annuel total remis en perspective
Réponds en français, sous forme de liste à puces courte (5 points maximum). Ce sont des suggestions à vérifier par l'utilisateur : ne recommande jamais une action comme déjà faite, et ne prétends jamais avoir modifié quoi que ce soit.`

export class AiNotConfiguredError extends Error {
  constructor() {
    super("Le conseiller IA n'est pas configuré sur ce serveur")
    this.code = 'AI_NOT_CONFIGURED'
  }
}

let client = null
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export async function getAdvice(subscriptions) {
  const anthropic = getClient()
  if (!anthropic) throw new AiNotConfiguredError()

  const summary = subscriptions.map((s) => ({
    name: s.name,
    price: s.price,
    currency: s.currency,
    frequency: s.frequency,
    category: s.category,
  }))

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Voici mes abonnements actifs (JSON) : ${JSON.stringify(summary)}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  return textBlock?.text?.trim() ?? ''
}
