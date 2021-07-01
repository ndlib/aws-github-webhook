const cfnResponse = require('./cfn-response')
const createHandler = require('./createHandler')
const updateHandler = require('./updateHandler')
const deleteHandler = require('./deleteHandler')

const timeoutHandler = (event, context) => {
  // Apparently this prevents cloudformation from hanging longer than necessary if the lambda times out?
  return setTimeout(async () => {
    console.error('Execution is about to time out. Sending failure message.')
    await cfnResponse.send(event, context, 'FAILED')

    throw new Error('Execution timed out')
  }, context.getRemainingTimeInMillis() - 3000)
}

exports.handler = async (event, context, callback) => {
  let eventHandler
  console.log('Received Event:', JSON.stringify(event, null, 2))
  switch (event.RequestType) {
    case 'Create':
      eventHandler = createHandler.onCreate
      break
    case 'Update':
      eventHandler = updateHandler.onUpdate
      break
    case 'Delete':
      eventHandler = deleteHandler.onDelete
      break
    default:
      throw new Error('Invalid RequestType received.')
  }

  try {
    const timeout = timeoutHandler(event, context)
    const result = await eventHandler(event, context)
    // If we finished in time, clear the timer so it doesn't log an error message after completion\
    clearTimeout(timeout)
    return callback(null, result)
  } catch (err) {
    console.error(err)
    return callback(err)
  }
}
