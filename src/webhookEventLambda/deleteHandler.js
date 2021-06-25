const fetch = require('node-fetch')
const cfnResponse = require('./cfn-response')
const { GITHUB_API_BASE, HEADERS, decodePhysicalId } = require('./shared')

exports.onDelete = async (event, context) => {
  const { id: webhookId, repo: oldRepo } = decodePhysicalId(event.PhysicalResourceId)

  if (webhookId && oldRepo) {
    const deleteUrl = `${GITHUB_API_BASE}/repos/${oldRepo}/hooks/${webhookId}`
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: HEADERS,
    }).then(response => {
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete webhook.')
      }
    })
  } else {
    console.warn('Webhook ID not found. Unable to delete webhook.')
  }

  return cfnResponse.send(event, context, 'SUCCESS')
}
