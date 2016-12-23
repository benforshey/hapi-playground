'use strict'

const fs = require('fs')
const google = require('googleapis')
const key = require('../../secret.json')  // Obviously not included in this repo.
const JWT = new google.auth.JWT(key.client_email, null, key.private_key, 'https://www.googleapis.com/auth/drive.readonly', null)
const sheets = google.sheets('v4')
const debounce = require('lodash.debounce')
const isEmpty = require('lodash.isempty')

// This plugin transforms data from a spreadsheet into JSON for consumption by
// a static site generator, Hugo. Sorry for the stupid 'redacted' everywhere,
// but a quick find and replace was the best way to make this file generic
// enough to share.

exports.register = (server, options, next) => {
  const buildJSON = (callback) => {
    let errObject = {}

    sheets.spreadsheets.values.batchGet({
      auth: JWT,
      ranges: '{your-spreadsheet-cell/row/sheet-ranges}',
      spreadsheetId: '{your-spreadsheet-id}'
    }, (err, resp) => {
      if (err) {
        errObject = err
        return server.methods.sendEmail(err)
      } else {
        const rawRedactedData = resp.valueRanges[0].values  // Directly from spreadsheet.
        const redactedHeaders = rawRedactedData.shift()   // The headers are the first index, so use them.
        const redactedBody = rawRedactedData  // The rawRedactedData has already been altered through .shift(), so headers are already removed.

        const createArrayOfObjects = (keyArray, valueArray) => {  // Body of redacted information from spreadsheet, turned into array of objects.
          const arrayOfObjects = valueArray.map((outerValue) => {
            const obj = {}
            outerValue.map((innerValue, innerIndex) => {
              obj[keyArray[innerIndex]] = innerValue
            })
            return obj
          })
          return arrayOfObjects
        }

        const groupUniqueTypes = (data, type) => { // Map over array of data, return all data of type (defined in argument) into an array (iterated through with spread operator), into new Set (which preserves only unique values).
          const sortedUniqueData = [...new Set(data.map(value => value[type]))]
          return sortedUniqueData
        }

        const groupObjectsByTypeUnderParent = (parent, data, key) => {
          const arrayOfObjects = parent.map((outerValue) => {  // 'outerValue' is the redactedType.
            const obj = {}
            const arr = []
            data.map((innerValue) => { // 'innerValue' is the redactedData object (each listing).
              if (outerValue === innerValue[key]) {
                return arr.push(innerValue)
              }
            })
            obj[outerValue] = arr
            return obj
          })
          return arrayOfObjects
        }

        const redactedData = createArrayOfObjects(redactedHeaders, redactedBody)
        const redactedTypes = groupUniqueTypes(redactedData, 'Type')
        const redactedByTypes = groupObjectsByTypeUnderParent(redactedTypes, redactedData, 'Type')
        const masterProductList = JSON.stringify(redactedByTypes, null, 2)

        fs.writeFile('{your-file-location-with-name}', {masterProductList}, (err) => {
          if (err) {
            errObject = err
            console.log(err)
            return server.methods.sendEmail(err)
          } else {
            return server.emit('hugo build')
          }
        })
      }
    })

    if (isEmpty(errObject)) {  // Don't send an empty object as the error.
      errObject = null
    }

    return callback(errObject)
  }
  server.event('build JSON')
  server.on('build JSON', () => {
    server.methods.sheets.buildJSON((err) => {
      if (err) {
        console.log(err)
        return server.methods.sendEmail(err)
      }
    })
  })

  server.method({
    name: 'sheets.buildJSON',
    method: debounce(buildJSON, 1000, {  // Debounced to prevent mid-edit rebuilds. Prefer (1000 * 60 * 5), but for development faster times help.
      leading: false,
      trailing: true
    }),
    options: {}
  })

  return next()
}

exports.register.attributes = {
  pkg: require('./package')
}
