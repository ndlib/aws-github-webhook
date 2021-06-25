const fetch = require('node-fetch')
const cfnResponse = require('./cfn-response')
const { GITHUB_API_BASE, HEADERS, createPayload, encodePhysicalId } = require('./shared')

exports.onCreate = async (event, context) => {
  const properties = event.ResourceProperties || {}
  const repo = properties.Repo
  if (!repo) {
    throw new Error('Must provide a "Repo" value in properties.')
  }

  const url = `${GITHUB_API_BASE}/repos/${repo}/hooks`
  const payload = createPayload(properties)

  return await fetch(url, {
    method: 'POST',
    body: payload,
    headers: HEADERS,
  })
    .then(response => response.json())
    .then(data => {
      const webhookId = data.id
      if (!webhookId) {
        throw new Error('Failed to create webhook.')
      }

      const responseData = { WebhookId: webhookId.toString() }
      return cfnResponse.send(event, context, 'SUCCESS', responseData, encodePhysicalId(webhookId, repo))
    })
}
