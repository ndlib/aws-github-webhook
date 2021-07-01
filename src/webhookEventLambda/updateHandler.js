const fetch = require('node-fetch')
const cfnResponse = require('./cfn-response')
const { GITHUB_API_BASE, HEADERS, createPayload, encodePhysicalId, decodePhysicalId } = require('./shared')

exports.onUpdate = async (event, context) => {
  const properties = event.ResourceProperties || {}

  const repo = properties.Repo
  if (!repo) {
    throw new Error('Must provide a "Repo" value in properties.')
  }

  const decoded = decodePhysicalId(event.PhysicalResourceId)
  let webhookId = decoded.id
  const oldRepo = decoded.repo
  const oldWebhookId = webhookId

  const payload = createPayload(properties)

  // If the repo has changed, we need to delete the old webhook and create a new one,
  // plus update the PhysicalResourceId
  if (repo !== oldRepo) {
    // Create new one first, then delete once we know that succeeded
    const createUrl = `${GITHUB_API_BASE}/repos/${repo}/hooks`
    await fetch(createUrl, {
      method: 'POST',
      body: payload,
      headers: HEADERS,
    })
      .then(response => response.json())
      .then(data => {
        webhookId = data.id
        if (!webhookId) {
          throw new Error('Failed to create webhook.')
        }
      })

    if (oldWebhookId && oldRepo) {
      const deleteUrl = `${GITHUB_API_BASE}/repos/${oldRepo}/hooks/${oldWebhookId}`
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: HEADERS,
      }).then(response => {
        if (!response.ok && response.status !== 404) {
          throw new Error('Failed to delete old webhook.')
        }
      })
    }
  } else {
    const updateUrl = `${GITHUB_API_BASE}/repos/${oldRepo}/hooks/${webhookId}`
    await fetch(updateUrl, {
      method: 'PATCH',
      body: payload,
      headers: HEADERS,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to update webhook.')
      }
    })
  }

  const responseData = { WebhookId: webhookId.toString() }
  return cfnResponse.send(event, context, 'SUCCESS', responseData, encodePhysicalId(webhookId, repo))
}
