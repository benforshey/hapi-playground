'use strict'

const shell = require('shelljs')
const debounce = require('lodash.debounce')
const isEmpty = require('lodash.isempty')

// This plugin allows me to run shell comamnds in response to an event. Since I
// export these functions to the rest of my server as events (you can define
// your own events in hapi.js), I can use these shell commands anywhere in my
// application, but have a centralized place to store and maintain them.

exports.register = (server, options, next) => {
  const hugoBuild = (callback) => {
    let err = {}

    shell.cd('{your-working-directory}')
    if (shell.error()) {
      err.cd = 'cd fail'
    }

    shell.rm('-fR', '{some-directory-to-delete}')
    if (shell.error()) {
      err.rm = 'rm fail'
    }

    shell.exec('{some-command-to-exec}')
    if (shell.error()) {
      err.hugo = 'exec fail'
    }

    shell.rm('-fR', '{some-directory-to-delete}')
    if (shell.error()) {
      err.rm = 'rm src directory fail'
    }

    if (isEmpty(err)) {  // Don't send an empty object as the error.
      err = null
    }

    return callback(err)
  }

  server.event('hugo build')
  server.on('hugo build', () => {
    server.methods.hugo.build((err) => {
      if (err) {
        console.log('*ERROR IN BUILD*')
        console.log(err)
        return server.methods.sendEmail(err)
      } else {
        console.log(`*SUCCESS IN BUILD on * ${Date.now()}`)
      }
    })
  })

  server.method({
    name: 'hugo.build',
    method: debounce(hugoBuild, 1000, {  // Debounced to no more than once a minute on a rebuild, to meter server load. Prefer (1000 * 60 * 5), but for development faster times help.
      leading: true,
      trailing: false
    }),
    options: {}
  })

  return next()
}

exports.register.attributes = {
  pkg: require('./package')
}
