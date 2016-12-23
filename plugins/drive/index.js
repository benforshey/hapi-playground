'use strict'

const google = require('googleapis')
const key = require('../../secret.json')
const JWT = new google.auth.JWT(key.client_email, null, key.private_key, 'https://www.googleapis.com/auth/drive.readonly', null)
const drive = google.drive('v3')
const uuid = require('uuid/v4')

// The overall purpose of this plugin is to use Google Drive's API to
// watch a file for changes. I have to tell the API which file to watch,
// how long to watch it, give it some basic security, and tell it what
// endpoint (webhook) to notify when the file changes.

exports.register = (server, options, next) => {
  server.event('watch file')

  server.on('watch file', () => {
    console.log(`'watch file' called on ${Date.now()}`)
    let retryCount = {
      JWT: 0,
      watch: 0
    }

    JWT.authorize((err, tokens) => {
      if (err) {
        retryCount.JWT ++
        console.error(err)
        server.methods.sendEmail(err)
        setTimeout(() => {  // Wait a bit then try again.
          if (retryCount.JWT <= 10) {  // Don't try more than 10 times.
            return server.emit('watch file')
          } else {
            throw new Error('The server has tried 10 times to renew the JWT authorization with no success.')
          }
        }, (1000 * 60 * 10))
      } else {
        retryCount.JWT = 0  // Reset the retry count upon a single success.
        return drive.files.watch({
          auth: JWT,
          fileId: '{your-file-id}',
          resource: {
            address: '{your-webhook-URL}',
            expiration: `${Date.now() + (1000 * 60 * 60 * 24)}`,  // 24 hours ahead (max allowed length)
            id: uuid(),  // UUID V4
            token: `${encodeURI('{your-header-token}')}`,  // though not needed in this case, URI Encoded for principle
            type: 'web_hook'
          }
        }, (err, resp) => {
          if (err) {
            retryCount.watch ++
            console.error(err)
            server.methods.sendEmail(err)
            setTimeout(() => {  // Wait a bit then try again.
              if (retryCount.watch <= 10) {
                return server.emit('watch file')  // Recursive call to this plugin.
              } else {
                throw new Error('The server has tried 10 times to renew the watch request with no success.')
              }
            }, (1000 * 60 * 10))
          } else {
            retryCount.watch = 0  // Reset the retry count upon a single success.
            setTimeout(() => {  // Renew the watch request, recursively.
              return server.emit('watch file')  // Recursive call to this plugin.
            }, (1000 * 60 * 60 * 18))  // every 18 hours (3/4 expiration time set in 'watch file' event)
          }
        })
      }
    })
  })

  server.emit('watch file')  // Initial call to watch the Drive file for changes.

  server.route({
    method: 'POST',
    path: '/webhook/drive-webhook/',
    handler: (request, reply) => {
      if (request.headers['x-goog-channel-token'] === '{your-header-token}') {  // sets a basic form of authentication over header
        console.log(`*DRIVE-WEBHOOK API ENDPOINT HIT on ${Date.now()}*`)
        server.emit('build JSON')  // This server event triggers the Hugo build process once complete.
        return reply(200)
      } else {
        return reply(401)
      }
    }
  })

  return next()
}

exports.register.attributes = {
  pkg: require('./package')
}
