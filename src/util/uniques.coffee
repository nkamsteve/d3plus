objectValidate = require "../object/validate.coffee"

# Returns list of unique values
uniques = (data, value, fetch, vars, depth) ->

  return [] if data is undefined
  depth = vars.id.value if vars and depth is undefined
  data  = [data] unless data instanceof Array

  if value is undefined
    return data.reduce (p, c) ->
      p.push c if p.indexOf(c) < 0
      p
    , []

  data = [ data ] unless data instanceof Array
  vals = []
  lookups = []

  for d in data

    if objectValidate d

      if fetch
        val = uniques fetch(vars, d, value, depth)
        val = val[0] if val.length is 1
      else if typeof value is "function"
        val = value d
      else
        val = d[value]

      if val isnt undefined and val isnt null

        if ["number", "string"].indexOf(typeof val) >= 0
          lookup = val
        else
          lookup = JSON.stringify(val)

        if lookup isnt undefined and lookups.indexOf(lookup) < 0
          vals.push val
          lookups.push lookup

  vals.sort (a, b) -> a - b

module.exports = uniques
