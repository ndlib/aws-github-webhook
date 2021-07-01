const fetch = require('node-fetch')

exports.SUCCESS = 'SUCCESS'
exports.FAILED = 'FAILED'

exports.send = async (event, context, responseStatus, responseData, physicalResourceId, noEcho) => {
  const body = {
    Status: responseStatus,
    Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: noEcho || false,
    Data: responseData,
  }
  const bodyString = JSON.stringify(body)

  console.log('Response body:\n', bodyString)

  const options = {
    body: bodyString,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bodyString.length,
    },
  }
  return fetch(event.ResponseURL, options)
    .then(response => {
      console.log('Status code: ' + response.status)
      console.log('Status message: ' + response.statusText)

      if (!response.ok) {
        throw new Error(`${response.statusCode} ${response.statusText}`)
      }

      return response.text()
    })
    .then(data => {
      console.log('Cfn Response Body:', data)

      if (body.Status === exports.FAILED) {
        throw new Error(body.Reason)
      }

      return body
    })
    .catch((err) => {
      err.message = `CRITICAL: Error sending response due to: [${JSON.stringify(err?.message, null, 2)}]`
      throw err
    })
}
