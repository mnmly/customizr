fs            = require 'fs'
{print}       = require 'sys'
{spawn, exec} = require 'child_process'


task 'beautify', 'Unminify the minified code', ->
  beaufier = exec './node_modules/js-beautify-node/beautify-node.js -i 2 jquery.customizr.min.js > jquery.customizr.unminified.js', (err, stdout, sterr)->
    console.log err
