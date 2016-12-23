'use strict'
const env = require('dotenv')  // Great tool for setting environmental variables.
const hapi = require('hapi')

env.config()  // configure the environmental varibles

const server = new hapi.Server()
server.connection({
  port: 3000
})

server.register([
  { register: require('./plugins/drive') },
  { register: require('./plugins/health-check') },
  { register: require('./plugins/hugo') },
  { register: require('./plugins/postmark') },
  { register: require('./plugins/sheets') },
  { register: require('./plugins/twilio') }
], (err) => {
  if (err) {
    throw err
  }

  server.start((err) => {
    if (err) {
      throw err
    }
  })
})
