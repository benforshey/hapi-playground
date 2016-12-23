'use strict'
const postmark = require('postmark')
const util = require('util')

// This plugin was build to use Postmark (https://postmarkapp.com/) to
// send errors to my email address on behalf of my application. I've
// also used Postmark to send form data to my client's email addresses.

exports.register = (server, options, next) => {
  const sendMail = (message = 'No Content.') => {
    const client = new postmark.Client(process.env.POSTMARK_API_KEY)  // Good to put this really sensitive data as an environmental variable so it never gets uploaded to GitHub.
    const formattedMessage = {
      'From': '{your-from-address}',
      'To': '{your-to-address}',
      'Subject': '{a-good-subject}',
      'HtmlBody': `<p>${util.format(message)}</p>`,  // util.format for JSON based messages, since I'm using this to send error messages.
      'TrackOpens': true
    }

    return client.sendEmail(formattedMessage, (err, resp) => {
      if (err) {
        return console.error(`Unable to send email through Postmark: ${util.format(err)}`)
      } else {
        return console.log(`Email sent through Postmark: ${util.format(resp)}`)
      }
    })
  }
  // A server method can be called by any plugin on the server, similarly
  // to an event. Since I want my application to be able to email me when errors
  // happen, I registered this plugin as a server method.
  server.method({
    name: 'sendEmail',
    method: sendMail,
    options: {}
  })

  return next()
}

exports.register.attributes = {
  pkg: require('./package')
}
