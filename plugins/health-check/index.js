'use strict'

// This simple plugin is something that I include in all of my server-side
// applications. Even though I use PM2 to restart my apps (should they
// critically fail), I want to know right away if they go down. This
// simple response to a request from something like https://updown.io
// allows me to monitor my applications.

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/health-check',
    handler: (request, reply) => {
      reply(200)
    }
  })

  return next()
}

exports.register.attributes = {
  pkg: require('./package')
}
