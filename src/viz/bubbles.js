vizwhiz.viz.bubbles = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var width = 300,
      height = 300,
      value_var = "value",
      id_var = "id",
      text_var = "name",
      grouping = "name",
      tooltip_info = [];

  //===================================================================


  function chart(selection) {
    selection.each(function(data, i) {

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Private Variables
      //-------------------------------------------------------------------
      
      var this_selection = this,
          timing = vizwhiz.timing,
          stroke_width = 1,
          groups = {},
          value_extent = d3.extent(d3.values(data),function(d){ return d[value_var]; }),
            value_map = d3.scale.linear().domain(value_extent).range([1,4]);

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Calculate positioning for each bubble
      //-------------------------------------------------------------------
        
      data.forEach(function(value,index){
        if (!groups[value[grouping]]) { 
          groups[value[grouping]] = {
                                      "name": value[grouping],
                                      "value": 0,
                                      "x": 0,
                                      "y": 0,
                                      "width": 0,
                                      "height": 0,
                                      "available": 0,
                                      "total": 0
                                   }
        }
        groups[value[grouping]].value += value[value_var] ? value_map(value[value_var]) : value_map(value_extent[0])
        groups[value[grouping]].available += value.available ? value.available : value.active ? 1 : 0
        groups[value[grouping]].total += value.total ? value.total : 1
      })
      
      if (Object.keys(groups).length == 1) {

        for (var g in groups) {
          groups[g].x = (width)/2
          groups[g].y = (height)/2
          groups[g].width = width
          groups[g].height = height
        }
        
      } else if (Object.keys(groups).length == 2) {
        
        var total = 0
        for (var g in groups) total += groups[g].value
        for (var g in groups) {
          if (g == "false") var offset = width*(groups["true"].value/total)
          else var offset = 0
          groups[g].width = width*(groups[g].value/total)
          groups[g].height = height
          groups[g].x = (groups[g].width/2)+offset
          groups[g].y = height/2
        }
        
      } else if (grouping == "id" || grouping == "name") {
        
        if(data.length == 1) {
          var columns = 1,
              rows = 1
        } else {
          var rows = Math.ceil(Math.sqrt(data.length/(width/height))),
              columns = Math.ceil(Math.sqrt(data.length*(width/height)))
        }
        
        while ((rows-1)*columns >= data.length) rows--
        
        var r = 0, c = 0
        for (var g in groups) {
          groups[g].x = ((width/columns)*c)+((width/columns)/2)
          groups[g].y = ((height/rows)*r)+((height/rows)/2)
          groups[g].width = (width/columns)
          groups[g].height = (height/rows)

          if (c < columns-1) c++
          else {
            c = 0
            r++
          }
          
        }
        
      } else {

        var groups_tm = [],
            positions = {}
        
        for (var i in groups) {
          groups_tm.push({'key': i, 'values': Math.sqrt(groups[i].value)})
        }
        
        var tm = d3.layout.treemap()
          .round(false)
          .size([width,height])
          .value(function(d) { return d.values; })
          .sort(function(a,b) {
            return a.values - b.values
          })
          .nodes({"name": "root", "children": groups_tm})

        tm.forEach(function(value,index){
          if (value.name != 'root') {
            groups[value.key].width = value.dx
            groups[value.key].height = value.dy
            groups[value.key].x = value.x+value.dx/2
            groups[value.key].y = value.y+value.dy/2
          }
        })
        
      }

      var constraints = [d3.min(data,function(d){
                            return groups[d[grouping]].width/Math.ceil(Math.sqrt(groups[d[grouping]].value))
                          })/2,
                         d3.min(data,function(d){
                           return groups[d[grouping]].height/Math.ceil(Math.sqrt(groups[d[grouping]].value))
                         })/2],
          max_size = d3.min(constraints)*0.9
          
      if (grouping != "id" && grouping != "name") max_size = max_size*1.75
      var node_size = d3.scale.linear().domain(value_extent).range([max_size/4,max_size])
      
      data.forEach(function(d){
        if (value_var != 'none') var size = d[value_var] ? node_size(d[value_var]) : node_size(value_extent[0])
        else var size = max_size
        d.radius = size
        d.cx = groups[d[grouping]].x
        d.cy = groups[d[grouping]].y
      })
        
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Set up initial SVG and groups
      //-------------------------------------------------------------------
      
      // Select the svg element, if it exists.
      var svg = d3.select(this_selection).selectAll("svg").data([data]);
      
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height);
        
      svg_enter.append('g')
        .attr('class','bubbles');
        
      svg_enter.append('g')
        .attr('class','labels');
        
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New nodes and links enter, initialize them here
      //-------------------------------------------------------------------
      
      var arc = d3.svg.arc()
        .innerRadius(0)
        .startAngle(0)

      var bubble = d3.select("g.bubbles").selectAll("g.bubble")
        .data(data, function(d) { return d[id_var] })
        
      var bubble_enter = bubble.enter().append("g")
        .attr("class", "bubble")
        .attr("transform", function(d){ return "translate("+d.cx+","+d.cy+")"; })
        .on(vizwhiz.evt.over, function(d){
          
          var tooltip_data = {}
          tooltip_info.forEach(function(t){
            if (d[t]) tooltip_data[t] = d[t]
          })
          
          vizwhiz.tooltip.create({
            "parent": svg,
            "id": d[id_var],
            "data": tooltip_data,
            "title": d[text_var],
            "x": d.x,
            "y": d.y,
            "offset": d.radius,
            "arrow": true
          })
          
        })
        .on(vizwhiz.evt.out, function(d){
          vizwhiz.tooltip.remove(d[id_var])
        });
        
      bubble_enter.append("circle")
        .attr("fill", function(d){ return d.color; })
        .attr("r",0)
        .attr("stroke-width",2)
        .attr("stroke", function(d){ return d.color; });
        
      bubble_enter.append("path")
        .attr("fill", function(d){ return d.color; })
        .attr("d", function(d){
          if(d.total){
            var angle = (((d.available / d.total)*360) * (Math.PI/180));
          } else if (d.active) {
            var angle = 360; 
          } else var angle = 0;
          return arc.endAngle(angle).outerRadius(0)(d);
        });
      
      var label = d3.select("g.labels").selectAll("text")
        .data(d3.values(groups), function(d) { return d.name+d.x+d.y })
        
      label.enter().append("text")
        .attr("opacity",0)
        .attr("text-anchor","middle")
        .attr("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
        .attr('x',function(d) { return d.x; })
        .attr('y',function(d) {
          if (Object.keys(groups).length == 2) var y_offset = height
          else var y_offset = d3.min([d.width,d.height]);
          return d.y+(y_offset/2)-30;
        })
        .each(function(d){
          if (grouping == 'active') {
            var t = d.name == true ? 'Available' : 'Not Available'
          } else {
            var t = d.name
          }
          vizwhiz.utils.wordwrap({
            "text": t,
            "parent": this,
            "width": d.width,
            "height": 20
          })
          
          if (d.total == 1) {
            if (d.available == 0) var t = "Not Available"
            else var t = "Available"
          } else var t = d.available + " out of " + d.total
          
            d3.select(this).append("tspan")
              .attr("x",d.x)
              .attr("dy","14px")
              .style("font-weight","normal")
              .text(t)
        })
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for things that are already in existance
      //-------------------------------------------------------------------
        
      bubble.selectAll("circle").transition().duration(timing)
        .attr("r", function(d){ return d.radius; })
        .style('fill-opacity', 0.25 );
        
      bubble.selectAll("path").transition().duration(timing)
        .attr("d", function(d){
          if(d.total){
            var angle = (((d.available / d.total)*360) * (Math.PI/180));
          } else if (d.active) {
            var angle = 360; 
          } else var angle = 0;
          return arc.endAngle(angle).outerRadius(d.radius)(d);
        });
        
      label.transition().duration(timing/2)
        .attr("opacity",1)
        .attr('x',function(d) { return d.x; })
        .attr('y',function(d) {
          if (Object.keys(groups).length == 2) var y_offset = height
          else var y_offset = d3.min([d.width,d.height]);
          return d.y+(y_offset/2)-30;
        })
        
      svg.transition().duration(timing)
        .attr("width", width)
        .attr("height", height);
          
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exit, for nodes and links that are being removed
      //-------------------------------------------------------------------

      bubble.exit().transition().duration(timing)
        .attr('opacity',0)
        .remove()

      label.exit().transition().duration(timing/2)
        .attr('opacity',0)
        .remove()

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Force layout, to control hit detection
      //-------------------------------------------------------------------
      var bool = false
      d3.layout.force()
        .friction(0.2)
        .charge(0)
        .gravity(0)
        .size([width,height])
        .nodes(data)
        .on("tick",function(e) {
          
          bubble
            .each(function(d) {
              d.y += (d.cy - d.y) * e.alpha;
              d.x += (d.cx - d.x) * e.alpha;
              if (grouping != "id" && grouping != "name") {
                for (var group in groups) {
                  if (group == "true") var g = true
                  else if (group == "false") var g = false
                  else var g = group
                  
                  var nodegroup = data.filter(function(d){ return d[grouping] == g; }),
                      q = d3.geom.quadtree(nodegroup),
                      i = 0,
                      n = nodegroup.length;
                  
                  while (++i < n) {
                    q.visit(collide(nodegroup[i]))
                  }
                }
              }
            })
            .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; });
            
        }).start()
        
      // Resolve collisions between nodes.
      function collide(node) {
        var r = node.radius + node_size.domain()[1] + (stroke_width*2),
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== node)) {
            var x = node.x - quad.point.x,
                y = node.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = node.radius + quad.point.radius + (stroke_width*2);
            if (l < r) {
              l = (l - r) / l * .5;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2
              || x2 < nx1
              || y1 > ny2
              || y2 < ny1;
        };
      }

      //===================================================================
      
    });
    
    return chart;
    
  }


  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  chart.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return chart;
  };

  chart.grouping = function(x) {
    if (!arguments.length) return grouping;
    grouping = x;
    return chart;
  };
  
  chart.value_var = function(x) {
    if (!arguments.length) return value_var;
    value_var = x;
    return chart;
  };
  
  chart.id_var = function(x) {
    if (!arguments.length) return id_var;
    id_var = x;
    return chart;
  };
  
  chart.text_var = function(x) {
    if (!arguments.length) return text_var;
    text_var = x;
    return chart;
  };
  
  chart.tooltip = function(x) {
    if (!arguments.length) return tooltip_info;
    tooltip_info = x;
    return chart;
  };

  //===================================================================


  return chart;
};