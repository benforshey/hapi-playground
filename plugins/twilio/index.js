const boom = require('boom')
const twilio = require('twilio')
const users = require('../../users')  // User data and helper functions, obviously not included in this repo.

exports.register = (server, options, next) => {
  server.route({
    config: {
      cors: true
    },
    method: 'POST',
    path: '/sms',
    handler: function (request, reply) {
      let userPosition = users.getUserPositionByURL(request)

      if (typeof userPosition !== 'undefined') {  // will not throw a refernce error because userPosition has been declared but not initialized
        const client = new twilio.RestClient(users.userList[userPosition].TwilioSID, users.userList[userPosition].TwilioAuth)  // make a new client with the correct API key
        client.messages.create(users.userList[userPosition].generateSMS(request), (err, success) => {  // generate email from template in user object and send email
          if (err) {
            return reply(boom.badRequest(err))  // return postmark error
          } else {
            return reply(success)
          }
        })
      } else {
        return reply(boom.badRequest(`${request.headers.origin} is not an authorized origin.`))
      }
    }
  })

  next()
}

exports.register.attributes = {
  pkg: require('./package')
}
