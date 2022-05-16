exports.GITHUB_API_BASE = 'https://api.github.com'
exports.HEADERS = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
}

exports.createPayload = (properties) => {
  let events = properties.Events
  if (!events) {
    throw new Error('Must provide an "Events" value in properties.')
  }
  if (!Array.isArray(events)) {
    events = [events]
  }

  const endpoint = properties.Endpoint
  if (!endpoint) {
    throw new Error('Must provide an "Endpoint" value in properties.')
  }

  return JSON.stringify({
    active: true,
    events: events,
    config: {
      url: endpoint,
      content_type: properties.ContentType || 'application/json',
      secret: process.env.WEBHOOK_SECRET,
    },
  })
}

exports.encodePhysicalId = (webhookId, repo) => {
  return `GitHubWebhook:${webhookId}:${repo}`
}

exports.decodePhysicalId = (physicalId) => {
  const elements = physicalId.split(':', 3)
  return {
    id: elements.length > 1 ? elements[1] : null,
    repo: elements.length > 2 ? elements[2] : null,
  }
}
