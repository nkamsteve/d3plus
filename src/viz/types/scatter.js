//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Scatterplot
//------------------------------------------------------------------------------
var chart = require("./chart.js")
var scatter = function(vars) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This visualization is an extention of the Chart visualization.
  //----------------------------------------------------------------------------
  return chart(vars)

}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Visualization Settings and Helper Functions
//------------------------------------------------------------------------------
scatter.fill         = true
scatter.requirements = [ "data" , "x" , "y" ]
scatter.scale        = chart.scale
scatter.shapes       = [ "circle" , "square" , "donut" ]
scatter.tooltip      = "static"

module.exports = scatter
