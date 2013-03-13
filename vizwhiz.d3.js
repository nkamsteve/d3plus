(function(){
var vizwhiz = window.vizwhiz || {};

vizwhiz.version = '0.0.1';
vizwhiz.dev = true //set false when in production

window.vizwhiz = vizwhiz;

vizwhiz.timing = 600; // milliseconds for animations

vizwhiz.tooltip = {}; // For the tooltip system
vizwhiz.utils = {}; // Utility subsystem
vizwhiz.viz = {}; //stores all the possible visualizations
vizwhiz.evt = {}; // stores all mouse events that could occur

// Modernizr touch events
if (Modernizr.touch) {
  vizwhiz.evt.click = 'touchend'
  vizwhiz.evt.down = 'touchstart'
  vizwhiz.evt.up = 'touchend'
  vizwhiz.evt.over = 'touchstart'
  vizwhiz.evt.out = 'touchend'
  vizwhiz.evt.move = 'touchmove'
} else {
  vizwhiz.evt.click = 'click'
  vizwhiz.evt.down = 'mousedown'
  vizwhiz.evt.up = 'mouseup'
  vizwhiz.evt.over = 'mouseover'
  vizwhiz.evt.out = 'mouseout'
  vizwhiz.evt.move = 'mousemove'
}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Number formatter
//-------------------------------------------------------------------

vizwhiz.utils.format_num = function(val, percent, sig_figs, abbrv) {
  
  // test if number is REALLY small
  if(Math.abs(val - 1e-16) < 1e-10){
    val = 0;
  }
  
  if(percent){
    val = d3.format("."+sig_figs+"p")(val)
  }
  else if(abbrv){
    var symbol = d3.formatPrefix(val).symbol
    symbol = symbol.replace("G", "B") // d3 uses G for giga

    // Format number to precision level using proper scale
    val = d3.formatPrefix(val).scale(val)
    val = parseFloat(d3.format("."+sig_figs+"g")(val))
    val = val + " " + symbol;
  }
  else {
    val = d3.format(",."+sig_figs+"d")(val)
  }
  
  return val;
};

//===================================================================

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Random color generator (if no color is given)
//-------------------------------------------------------------------

vizwhiz.utils.color_scale = d3.scale.category20();
vizwhiz.utils.rand_color = function() {
  var rand_int = Math.floor(Math.random()*20)
  return vizwhiz.utils.color_scale(rand_int);
}

//===================================================================

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Merge two objects to create a new one with the properties of both
//-------------------------------------------------------------------

vizwhiz.utils.merge = function(obj1, obj2) {
  var obj3 = {};
  for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
  for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
  return obj3;
}

//===================================================================

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// recursive function to rename "values" to "children" and "key" to "id"
// src: https://groups.google.com/group/d3-js/tree/browse_frm/month/2011-11/a5dc689238c3a685
//-------------------------------------------------------------------

vizwhiz.utils.rename_key_value = function(obj) { 
  if (obj.values && obj.values.length) { 
    return { 
      'name': obj.key, 
      'id': obj.key, 
      'children': obj.values.map(function(obj) { 
        return vizwhiz.utils.rename_key_value(obj);
      }) 
    }; 
  } 
  else if(obj.values) { 
    return obj.values
  }
  else {
    return obj; 
  }
}

//===================================================================

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Merge two objects to create a new one with the properties of both
//-------------------------------------------------------------------

vizwhiz.utils.nest = function(flat_data, nesting, flatten, extra) {

  var flattened = [];
  var nested_data = d3.nest();
  
  nesting.forEach(function(nest_key, i){
    
    nested_data.key(function(d){
      return d[nest_key];
    })
    
    if(i == nesting.length-1){
      nested_data.rollup(function(leaves){
        if(leaves.length == 1){
          flattened.push(leaves[0]);
          return leaves[0]
        }
        // to_return = leaves[0]
        to_return = {
          "value": d3.sum(leaves, function(d){ return d.value; }),
          "name": leaves[0][nest_key],
          "num_children": leaves.length,
          "num_children_active": d3.sum(leaves, function(d){ return d.active; })
        }
        
        if(extra){
          extra.forEach(function(e){
            if(e.agg == "sum"){
              to_return[e.key] = d3.sum(leaves, function(d){ return d[e.key]; })
            }
            else if(e.agg == "avg"){
              to_return[e.key] = d3.mean(leaves, function(d){ return d[e.key]; })
            }
            else {
              to_return[e.key] = leaves[0][e.key];
            }
          })
        }
        
        if(flatten){
          nesting.forEach(function(nk){
            to_return[nk] = leaves[0][nk]
          })
          flattened.push(to_return);
        }
        
        return to_return
      })
    }
    
  })
    
  nested_data = nested_data
    .entries(flat_data)
    .map(vizwhiz.utils.rename_key_value);

  if(flatten){
    return flattened;
  }

  return {"name":"root", "children": nested_data};

}

//===================================================================

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// for SVGs word wrapping is not built in, so here we must creat this
// function ourselves
//-------------------------------------------------------------------

vizwhiz.utils.wordwrap = function(params) {
  
  var parent = params.parent,
      padding = params.padding ? params.padding : 10,
      width = params.width ? params.width-(padding*2) : 20000,
      height = params.height ? params.height : 20000,
      resize = params.resize,
      font_max = params.font_max ? params.font_max : 40,
      font_min = params.font_min ? params.font_min : 8;
  if (typeof params.text == "string") wrap(params.text.split(/[\s-]/))
  else wrap(params.text.shift().split(/[\s-]/))
  
  function wrap(words) {
    
    if (resize) {
    
      // Start by trying the largest font size
      var size = font_max
      d3.select(parent).attr('font-size',size)
    
      // Add each word to it's own line (to test for longest word)
      d3.select(parent).selectAll('tspan').remove()
      for(var i=0; i<words.length; i++) {
        if (words.length == 1) var t = words[i]
        else var t = words[i]+"..."
        d3.select(parent).append('tspan').attr('x',0).text(t)
      }
    
      // If the longest word is too wide, make the text proportionately smaller
      if (parent.getBBox().width > width) size = size*(width/parent.getBBox().width)
  
      // If the new size is too small, return NOTHING
      if (size < font_min) {
        d3.select(parent).selectAll('tspan').remove();
        if (typeof params.text == "string" || params.text.length == 0) return;
        else wrap(params.text.shift().split(/[\s-]/))
        return;
      }
    
      // Use new text size
      d3.select(parent).attr('font-size',size);
    
      // Flow text into box
      flow();
    
      // If text doesn't fit height-wise, shrink it!
      if (parent.childNodes.length*parent.getBBox().height > height) {
        var temp_size = size*(height/(parent.childNodes.length*parent.getBBox().height))
        if (temp_size < font_min) size = font_min
        else size = temp_size
        d3.select(parent).attr('font-size',size)
      } else finish();
    
    }
  
    flow();
    truncate();
    finish();
  
    function flow() {
    
      d3.select(parent).selectAll('tspan').remove()
    
      var tspan = d3.select(parent).append('tspan')
        .attr('x',parent.getAttribute('x'))
        .text(words[0])

      for (var i=1; i < words.length; i++) {
        
        tspan.text(tspan.text()+" "+words[i])
      
        if (tspan.node().getComputedTextLength() > width) {
            
          tspan.text(tspan.text().substr(0,tspan.text().lastIndexOf(" ")))
    
          tspan = d3.select(parent).append('tspan')
            .attr('x',parent.getAttribute('x'))
            .text(words[i])
            
        }
      }
  
    }
  
    function truncate() {
      var cut = false
      while (parent.childNodes.length*parent.getBBox().height > height && parent.lastChild && !cut) {
        parent.removeChild(parent.lastChild)
        if (parent.childNodes.length*parent.getBBox().height < height && parent.lastChild) cut = true
      }
      if (cut) {
        tspan = parent.lastChild
        words = d3.select(tspan).text().split(/[\s-]/)
      
        var last_char = words[words.length-1].charAt(words[words.length-1].length-1)
        if (last_char == ',' || last_char == ';' || last_char == ':') words[words.length-1] = words[words.length-1].substr(0,words[words.length-1].length-1)
      
        d3.select(tspan).text(words.join(' ')+'...')
      
        if (tspan.getComputedTextLength() > width) {
          if (words.length > 1) words.pop(words.length-1)
          last_char = words[words.length-1].charAt(words[words.length-1].length-1)
          if (last_char == ',' || last_char == ';' || last_char == ':') words[words.length-1].substr(0,words[words.length-1].length-2)
          d3.select(tspan).text(words.join(' ')+'...')
        }
      }
    }
  }
  
  function finish() {
    d3.select(parent).selectAll('tspan').attr("dy", d3.select(parent).style('font-size'));
    return;
  }
  
}

//===================================================================


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Drop shadow function, adds the proper definition with th parameters
// used to the page
//-------------------------------------------------------------------

vizwhiz.utils.drop_shadow = function(defs) {
  
  // add filter to svg defs
  var drop_shadow_filter = defs.append('filter')
    .attr('id', 'dropShadow')
    .attr('filterUnits', "userSpaceOnUse")
    .attr('width', '100%')
    .attr('height', '100%');
  
  // shadow blue
  drop_shadow_filter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 2);
  
  // shadow offset
  drop_shadow_filter.append('feOffset')
    .attr('dx', 1)
    .attr('dy', 1)
    .attr('result', 'offsetblur');
  
  var feMerge = drop_shadow_filter.append('feMerge');  
  feMerge.append('feMergeNode');
  
  // put original on top of shadow
  feMerge.append('feMergeNode')
    .attr('in', "SourceGraphic");

}

//===================================================================
vizwhiz.viz.network = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var width = 300,
      height = 300,
      value_var = "value",
      id_var = "id",
      text_var = "name",
      clicked = false,
      spotlight = true,
      highlight = null,
      labels = true,
      zoom_behavior = d3.behavior.zoom().scaleExtent([1, 16]),
      nodes = [],
      x_range,
      y_range,
      aspect,
      links = [],
      connections = {},
      scale = {},
      tooltip_info = [];

  //===================================================================


  function chart(selection) {
    selection.each(function(data, i) {

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Private Variables
      //-------------------------------------------------------------------

      var this_selection = this,
          timing = vizwhiz.timing,
          dragging = false,
          highlight_color = "#cc0000",
          select_color = "#ee0000",
          secondary_color = "#ffdddd",
          offset_top = 0,
          offset_left = 0,
          info_width = 300;

      //===================================================================
      
      // Select the svg element, if it exists.
      var svg = d3.select(this_selection).selectAll("svg").data([data]);
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height);
        
      // Define Scale
      if (aspect > width/height) {
        var viz_height = width/aspect, viz_width = width
        offset_top = ((height-viz_height)/2)
      } else {
        var viz_width = height*aspect, viz_height = height
        offset_left = ((width-viz_width)/2)
      }
          
      var columns = Math.ceil(Math.sqrt(Object.keys(nodes).length*(viz_width/viz_height))),
          max_size = viz_width/(columns*3),
          min_size = max_size/5 < 2 ? 2 : max_size/5
          
      // x scale
      scale.x = d3.scale.linear()
        .domain(x_range)
        .range([offset_left+(max_size*2), width-(max_size*2)-offset_left])
      // y scale
      scale.y = d3.scale.linear()
        .domain(y_range)
        .range([offset_top+(max_size*2), height-(max_size*2)-offset_top])
      // size scale
      var val_range = d3.extent(d3.values(data), function(d){
        return d[value_var] > 0 ? d[value_var] : null
      });
      scale.size = d3.scale.log()
        .domain(val_range)
        .range([min_size, max_size])
        
      // Create viz group on svg_enter
      var viz_enter = svg_enter.append("g")
        .call(zoom_behavior.on("zoom",function(){ zoom(); }))
        .on(vizwhiz.evt.down,function(d){dragging = true})
        .on(vizwhiz.evt.up,function(d){dragging = false})
        .append('g')
          .attr('class','viz')
        
      viz_enter.append('rect')
        .attr('class','overlay')
        .attr("width", viz_width)
        .attr("height", viz_height)
        .attr("fill","transparent")
        .on(vizwhiz.evt.over,function(d){
          if (!clicked && highlight) {
            highlight = null;
            update();
          }
        })
        .on(vizwhiz.evt.click,function(d){
          highlight = null;
          zoom("reset");
          update();
        });
        
      viz_enter.append('g')
        .attr('class','links')
        
      viz_enter.append('g')
        .attr('class','nodes')
        
      viz_enter.append('g')
        .attr('class','highlight')
        
      // Create Zoom Controls div on svg_enter
      d3.select(this_selection).select("div#zoom_controls").remove()
      var zoom_div = d3.select(this_selection).append("div")
        .attr("id","zoom_controls")
        
      zoom_div.append("div")
        .attr("id","zoom_in")
        .attr("unselectable","on")
        .on(vizwhiz.evt.click,function(){ zoom("in") })
        .text("+")
        
      zoom_div.append("div")
        .attr("id","zoom_out")
        .attr("unselectable","on")
        .on(vizwhiz.evt.click,function(){ zoom("out") })
        .text("-")
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New nodes and links enter, initialize them here
      //-------------------------------------------------------------------
      
      var node = d3.select("g.nodes").selectAll("circle.node")
        .data(nodes, function(d) { return d[id_var]; })
      
      node.enter().append("circle")
        .attr("class","node")
        .call(node_size)
        .attr("fill","white")
        .attr("stroke","white")
        .on(vizwhiz.evt.over, function(d){
          if (!clicked) {
            highlight = d[id_var];
            update();
          } else {
            d3.select(this).attr("stroke",highlight_color)
          }
        })
        .on(vizwhiz.evt.out, function(d){
          if (clicked) {
            d3.select(this).attr("stroke","#dedede")
          }
        })
        .on(vizwhiz.evt.click, function(d){
          highlight = d[id_var];
          zoom(highlight);
          update();
        });
      
      var link = d3.select("g.links").selectAll("line.link")
        .data(links, function(d) { return d.source[id_var] + "-" + d.target[id_var]; })
        
      link.enter().append("line")
        .attr("class","link")
        .attr("stroke", "white")
        .attr("stroke-width", "1px")
        .call(link_position)
        .on(vizwhiz.evt.click,function(d){
          highlight = null;
          zoom("reset");
          update();
        });
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for nodes and links that are already in existance
      //-------------------------------------------------------------------

      node.transition().duration(timing)
        .call(node_size)
        .call(node_color);
        
      link.transition().duration(timing)
        .attr("stroke", "#dedede")
        .call(link_position);
        
      d3.select('.overlay').transition().duration(timing)
        .attr("width", viz_width)
        .attr("height", viz_height);
        
      svg.transition().duration(timing)
        .attr("width", width)
        .attr("height", height)
          
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exit, for nodes and links that are being removed
      //-------------------------------------------------------------------

      node.exit().remove()
      link.exit().remove()

      //===================================================================
      
      update();
      if (highlight && clicked) zoom(highlight);
          
      function link_position(l) {
        l
          .attr("x1", function(d) { return scale.x(d.source.x); })
          .attr("y1", function(d) { return scale.y(d.source.y); })
          .attr("x2", function(d) { return scale.x(d.target.x); })
          .attr("y2", function(d) { return scale.y(d.target.y); });
      }
      
      function bg_size(b) {
        b
          .attr("cx", function(d) { return scale.x(d.x); })
          .attr("cy", function(d) { return scale.y(d.y); })
          .attr("r", function(d) { 
            var value = data[d[id_var]][value_var],
                buffer = data[d[id_var]].active ? 3 : 2
            value = value > 0 ? scale.size(value) : scale.size(val_range[0])
            return value+buffer
          })
          .attr("stroke-width",0)
      }
      
      function node_size(n) {
        n
          .attr("cx", function(d) { return scale.x(d.x); })
          .attr("cy", function(d) { return scale.y(d.y); })
          .attr("r", function(d) { 
            var value = data[d[id_var]][value_var]
            return value > 0 ? scale.size(value) : scale.size(val_range[0])
          })
          .attr("stroke-width", function(d){
            if(data[d[id_var]].active) return 2;
            else return 1;
          })
      }
      
      function node_color(n) {
        n
          .attr("fill", function(d){
            if (clicked && d3.select(this.parentNode).attr("class") == "nodes") return "#efefef";
            var color = data[d[id_var]].color ? data[d[id_var]].color : vizwhiz.utils.rand_color()
            if (data[d[id_var]].active) {
              this.parentNode.appendChild(this)
              return color;
            } else if (spotlight && !highlight) return "#eeeeee";
            else {
              color = d3.hsl(color)
              color.l = 0.98
              return color.toString()
            }
          })
          .attr("stroke", function(d){
            if (clicked && d3.select(this.parentNode).attr("class") == "nodes") return "#dedede";
            var color = data[d[id_var]].color ? data[d[id_var]].color : vizwhiz.utils.rand_color()
            if (data[d[id_var]].active) return d3.rgb(color).darker().darker().toString();
            else if (spotlight && !highlight) return "#dedede";
            else return d3.rgb(color).darker().toString()
          })
      }
      
      function update() {
        
        d3.select("g.highlight").selectAll("*").remove()
        vizwhiz.tooltip.remove();
        
        if (highlight) {
            
          var center = connections[highlight].center,
              primaries = connections[highlight].primary,
              secondaries = connections[highlight].secondary
              
          if (clicked) {
          
            node.call(node_color);
            
            // Draw Secondary Connection Lines and BGs
            d3.select("g.highlight").selectAll("line.sec_links")
              .data(secondaries.links).enter()
              .append("line")
                .attr("class","sec_links")
                .attr("stroke-width", "1px")
                .attr("stroke", secondary_color)
                .call(link_position)
                .on(vizwhiz.evt.click, function(d){
                  zoom("reset");
                  update();
                });
            d3.select("g.highlight").selectAll("circle.sec_bgs")
              .data(secondaries.nodes).enter()
              .append("circle")
                .attr("class","sec_bgs")
                .attr("fill", secondary_color)
                .call(bg_size);
          
            // Draw Secondary Nodes
            d3.select("g.highlight").selectAll("circle.sec_nodes")
              .data(secondaries.nodes).enter()
              .append("circle")
                .attr("class","sec_nodes")
                .call(node_size)
                .attr("fill","#efefef")
                .attr("stroke","#dedede")
                .on(vizwhiz.evt.over, function(d){
                  if (!clicked) {
                    highlight = d[id_var];
                    update();
                  } else {
                    d3.select(this).attr("stroke",highlight_color)
                  }
                })
                .on(vizwhiz.evt.out, function(d){
                  if (clicked) {
                    d3.select(this).attr("stroke","#dedede")
                  }
                })
                .on(vizwhiz.evt.click, function(d){
                  highlight = d[id_var];
                  zoom(highlight);
                  update();
                });
          }
          
          // Draw Primary Connection Lines and BGs
          d3.select("g.highlight").selectAll("line.prim_links")
            .data(primaries.links).enter()
            .append("line")
              .attr("class","prim_links")
              .attr("stroke", highlight_color)
              .attr("stroke-width", "2px")
              .call(link_position)
              .on(vizwhiz.evt.click, function(d){
                highlight = null;
                zoom("reset");
                update();
              });
          d3.select("g.highlight").selectAll("circle.prim_bgs")
            .data(primaries.nodes).enter()
            .append("circle")
              .attr("class","prim_bgs")
              .call(bg_size)
              .attr("fill",highlight_color);
          
          // Draw Primary Nodes
          d3.select("g.highlight").selectAll("circle.prim_nodes")
            .data(primaries.nodes).enter()
            .append("circle")
              .attr("class","prim_nodes")
              .call(node_size)
              .call(node_color)
              .on(vizwhiz.evt.over, function(d){
                d3.select(this).style("cursor","pointer")
                if (!clicked) {
                  highlight = d[id_var];
                  update();
                }
              })
              .on(vizwhiz.evt.click, function(d){
                highlight = d[id_var];
                zoom(highlight);
                update();
              })
              .each(function(d){
                var value = data[d[id_var]][value_var]
                var size = value > 0 ? scale.size(value) : scale.size(val_range[0])
                if (size > 6 && labels && clicked) create_label(d);
              });
          
          // Draw Main Center Node and BG
          d3.select("g.highlight").selectAll("circle.center_bg")
            .data([center]).enter()
            .append("circle")
              .attr("class","center_bg")
              .call(bg_size)
              .attr("fill",select_color);
          d3.select("g.highlight").selectAll("circle.center")
            .data([center]).enter()
            .append("circle")
              .attr("class","center")
              .call(node_size)
              .call(node_color)
              .on(vizwhiz.evt.over, function(d){
                d3.select(this).style("cursor","pointer")
              })
              .on(vizwhiz.evt.click, function(d){
                if (!clicked) {
                  zoom(highlight);
                  clicked = true;
                  update();
                } else {
                  highlight = null;
                  zoom("reset");
                  update();
                }
              })
              .each(function(d){ if (labels && clicked) create_label(d); });
            
              
          // Draw Info Panel
          if (scale.x(connections[highlight].extent.x[1]) > (width-info_width-10)) var x_pos = 37+(info_width/2)
          else var x_pos = width
          
          var tooltip_data = {},
              tooltip_appends = [],
              sub_title = null
          
          if (!clicked) {
            sub_title = "Click Node for More Info"
          } else {
            tooltip_info.forEach(function(t){
              if (data[highlight][t]) tooltip_data[t] = data[highlight][t]
            })
            tooltip_appends.push({
              "append": "text",
              "attr": {
                "dy": "18px",
                "fill": "#333333",
                "text-anchor": "start",
                "font-size": "12px",
                "font-family": "Helvetica"
              },
              "style": {
                "font-weight": "bold"
              },
              "text": "Primary Connections"
            })
            
            var prims = []
            primaries.nodes.forEach(function(c){
              prims.push(c[id_var])
            })
            
            prims.forEach(function(c){
              var obj = {
                "append": "g",
                "children": [
                  {
                    "append": "circle",
                    "attr": {
                      "r": "5",
                      "cx": "5",
                      "cy": "8"
                    },
                    "style": {
                      "font-weight": "normal"
                    },
                    "text": data[c][text_var],
                    "events": {}
                  },
                  {
                    "append": "text",
                    "attr": {
                      "fill": "#333333",
                      "text-anchor": "start",
                      "font-size": "12px",
                      "font-family": "Helvetica",
                      "y": "0",
                      "x": "13"
                    },
                    "style": {
                      "font-weight": "normal"
                    },
                    "text": data[c][text_var],
                    "events": {}
                  }
                ]
              }
              obj.children[0].attr["fill"] = function(){
                  var color = data[c].color ? data[c].color : vizwhiz.utils.rand_color()
                  if (data[c].active) {
                    return color;
                  } else {
                    color = d3.hsl(color)
                    color.l = 0.98
                    return color.toString()
                  }
                }
              obj.children[0].attr["stroke"] = function(){
                  var color = data[c].color ? data[c].color : vizwhiz.utils.rand_color()
                  if (data[c].active) return d3.rgb(color).darker().darker().toString();
                  else return d3.rgb(color).darker().toString()
                }
              obj.children[0].attr["stroke-width"] = function(){
                  if(data[c].active) return 2;
                  else return 1;
                }
              obj.children[1].events[vizwhiz.evt.over] = function(){
                  d3.select(this).attr('fill',highlight_color).style('cursor','pointer')
                }
              obj.children[1].events[vizwhiz.evt.out] = function(){
                  d3.select(this).attr("fill","#333333")
                }
              obj.children[1].events[vizwhiz.evt.click] = function(){
                  highlight = c;
                  zoom(highlight);
                  update();
                }
              tooltip_appends.push(obj)
            })
          }
          
          vizwhiz.tooltip.create({
            "parent": svg,
            "data": tooltip_data,
            "title": data[highlight][text_var],
            "description": sub_title,
            "x": x_pos,
            "y": 0,
            "width": info_width,
            "arrow": false,
            "appends": tooltip_appends
          })
          
        } else if (clicked) {
          clicked = false;
          node.call(node_color)
        }
        
      }
      
      function create_label(d) {
        var bg = d3.select("g.highlight").append("rect")
          .datum(d)
          .attr("y", function(e) { return scale.y(e.y)-5; })
          .attr("height", "10px")
          .attr("rx",3)
          .attr("ry",3)
          .attr("stroke-width", function(d){
            if(data[d[id_var]].active) return 2;
            else return 1;
          })
          .call(node_color)
          .on(vizwhiz.evt.over, function(d){
            d3.select(this).style("cursor","pointer")
          })
          .on(vizwhiz.evt.click, function(d){
            if (d[id_var] == highlight) {
              highlight = null;
              zoom("reset");
              update();
            } else {
              highlight = d[id_var];
              zoom(highlight);
              update();
            }
          })
        var text = d3.select("g.highlight").append("text")
          .datum(d)
          .attr("x", function(e) { return scale.x(e.x); })
          .attr("fill", function(e) { 
            return d3.hsl(bg.attr("fill")).l >= 0.5 ? "#333" : "#fff";
          })
          .attr("font-size","3px")
          .attr("text-anchor","middle")
          .attr("font-family","Helvetica")
          .style("font-weight","bold")
          .each(function(e){
            vizwhiz.utils.wordwrap({
              "text": data[e[id_var]][text_var],
              "parent": this,
              "width": 60,
              "height": 10
            });
          })
          .on(vizwhiz.evt.over, function(d){
            d3.select(this).style("cursor","pointer")
          })
          .on(vizwhiz.evt.click, function(d){
            if (d[id_var] == highlight) {
              highlight = null;
              zoom("reset");
              update();
            } else {
              highlight = d[id_var];
              zoom(highlight);
              update();
            }
          })
                    
        text
          .attr("y", function(e) { return scale.y(e.y)-(text.node().getBBox().height/2); })
                  
        var w = text.node().getBBox().width+5
        var value = data[d[id_var]][value_var]
        var size = value > 0 ? scale.size(value) : scale.size(val_range[0])
        if (w < size*2) {
          bg.remove();
        } else {
          bg.attr("width",w).attr("x", function(e) { return scale.x(e.x)-(w/2); });
        }
      }
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Function that handles the zooming and panning of the visualization
      //-------------------------------------------------------------------
      
      function zoom(direction) {
        
        var zoom_extent = zoom_behavior.scaleExtent()
        // If d3 zoom event is detected, use it!
        if(!direction) {
          evt_scale = d3.event.scale
          translate = d3.event.translate
        } else {
          if (direction == "in") {
            if (zoom_behavior.scale() > zoom_extent[1]/2) multiplier = zoom_extent[1]/zoom_behavior.scale()
            else multiplier = 2
          } else if (direction == "out") {
            if (zoom_behavior.scale() < zoom_extent[0]*2) multiplier = zoom_extent[0]/zoom_behavior.scale()
            else multiplier = 0.5
          } else if (connections[direction]) {
            var x_bounds = [scale.x(connections[direction].extent.x[0]),scale.x(connections[direction].extent.x[1])],
                y_bounds = [scale.y(connections[direction].extent.y[0]),scale.y(connections[direction].extent.y[1])]
                
            if (x_bounds[1] > (width-info_width-5)) var offset_left = info_width+32
            else var offset_left = 0
                
            var w_zoom = (width-info_width-10)/(x_bounds[1]-x_bounds[0]),
                h_zoom = height/(y_bounds[1]-y_bounds[0])
            
            if (w_zoom < h_zoom) {
              x_bounds = [x_bounds[0]-(max_size*2),x_bounds[1]+(max_size*2)]
              evt_scale = (width-info_width-10)/(x_bounds[1]-x_bounds[0])
              if (evt_scale > zoom_extent[1]) evt_scale = zoom_extent[1]
              offset_x = -(x_bounds[0]*evt_scale)
              offset_y = -(y_bounds[0]*evt_scale)+((height-((y_bounds[1]-y_bounds[0])*evt_scale))/2)
            } else {
              y_bounds = [y_bounds[0]-(max_size*2),y_bounds[1]+(max_size*2)]
              evt_scale = height/(y_bounds[1]-y_bounds[0])
              if (evt_scale > zoom_extent[1]) evt_scale = zoom_extent[1]
              offset_x = -(x_bounds[0]*evt_scale)+(((width-info_width-10)-((x_bounds[1]-x_bounds[0])*evt_scale))/2)
              offset_y = -(y_bounds[0]*evt_scale)
            }

            translate = [offset_x+offset_left,offset_y]
          } else if (direction == "reset") {
            translate = [0,0]
            evt_scale = 1
          }
          
          if (direction == "in" || direction == "out") {
            var trans = d3.select("g.viz")[0][0].getAttribute('transform')
            if (trans) {
              trans = trans.split('(')
              var coords = trans[1].split(')')
              coords = coords[0].replace(' ',',')
              coords = coords.substring(0,trans[1].length-6).split(',')
              offset_x = parseFloat(coords[0])
              offset_y = coords.length == 2 ? parseFloat(coords[1]) : parseFloat(coords[0])
              zoom_var = parseFloat(trans[2].substring(0,trans[2].length-1))
            } else {
              offset_x = 0
              offset_y = 0
              zoom_var = 1
            }
            if ((multiplier > 0.5 && multiplier <= 1) && direction == "out") {
              offset_x = 0
              offset_y = 0
            } else {
              offset_x = (width/2)-(((width/2)-offset_x)*multiplier)
              offset_y = (height/2)-(((height/2)-offset_y)*multiplier)
            }
          
            translate = [offset_x,offset_y]
            evt_scale = zoom_var*multiplier
          }
        
        }
        
        zoom_behavior.translate(translate).scale(evt_scale)
        
        // Auto center visualization
        if (translate[0] > 0) translate[0] = 0
        else if (translate[0] < -((width*evt_scale)-width)) {
          translate[0] = -((width*evt_scale)-width)
        }
        if (translate[1] > 0) translate[1] = 0
        else if (translate[1] < -((height*evt_scale)-height)) translate[1] = -((height*evt_scale)-height)
        if (!direction) {
          if (d3.event.sourceEvent.type == "mousewheel" || d3.event.sourceEvent.type == "mousemove") {
            var viz_timing = d3.select(".viz")
          } else {
            var viz_timing = d3.select(".viz").transition().duration(timing)
          }
        } else {
          var viz_timing = d3.select(".viz").transition().duration(timing)
        }
        viz_timing.attr("transform","translate(" + translate + ")" + "scale(" + evt_scale + ")")
        
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

  chart.nodes = function(x) {
    if (!arguments.length) return nodes;
    nodes = x;
    x_range = d3.extent(d3.values(nodes), function(d){return d.x});
    y_range = d3.extent(d3.values(nodes), function(d){return d.y});
    aspect = (x_range[1]-x_range[0])/(y_range[1]-y_range[0]);
    return chart;
  };

  chart.links = function(x) {
    if (!arguments.length) return links;
    links = x;
    links.forEach(function(d) {
      if (!connections[d.source[id_var]]) {
        connections[d.source[id_var]] = {}
        connections[d.source[id_var]].center = d.source
        connections[d.source[id_var]].primary = {"nodes": [], "links": []}
      }
      connections[d.source[id_var]].primary.nodes.push(d.target)
      connections[d.source[id_var]].primary.links.push({"source": d.source, "target": d.target})
      if (!connections[d.target[id_var]]) {
        connections[d.target[id_var]] = {}
        connections[d.target[id_var]].center = d.target
        connections[d.target[id_var]].primary = {"nodes": [], "links": []}
      }
      connections[d.target[id_var]].primary.nodes.push(d.source)
      connections[d.target[id_var]].primary.links.push({"source": d.target, "target": d.source})
    })
    for (var c in connections) {
      connections[c].secondary = {"nodes": [], "links": []}
      connections[c].primary.nodes.forEach(function(p){
        connections[p[id_var]].primary.nodes.forEach(function(s){
          if (s[id_var] != c) {
            if (connections[c].primary.nodes.indexOf(s) < 0 && connections[c].secondary.nodes.indexOf(s) < 0) {
              connections[c].secondary.nodes.push(s)
            }
            var dupe = false
            connections[c].secondary.links.forEach(function(l){
              if (l.source == s && l.target == p) dupe = true
            })
            if (!dupe) {
              connections[c].secondary.links.push({"source": p, "target": s})
            }
          }
        })
      })
      // var node_check = connections[c].primary.nodes.concat(connections[c].secondary.nodes).concat([connections[c].center])
      var node_check = connections[c].primary.nodes.concat([connections[c].center])
      connections[c].extent = {}
      connections[c].extent.x = d3.extent(d3.values(node_check),function(v){return v.x;}),
      connections[c].extent.y = d3.extent(d3.values(node_check),function(v){return v.y;})
    }
    return chart;
  };

  chart.spotlight = function(x) {
    if (!arguments.length) return spotlight;
    spotlight = x;
    return chart;
  };

  chart.labels = function(x) {
    if (!arguments.length) return labels;
    labels = x;
    return chart;
  };

  chart.highlight = function(x) {
    if (!arguments.length) return highlight;
    highlight = x;
    if (highlight) clicked = true;
    else clicked = false;
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
vizwhiz.viz.stacked = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var margin = {top: 10, right: 40, bottom: 80, left: 90},
    width = window.innerWidth,
    height = window.innerHeight,
    size = {
      "width": width-margin.left-margin.right,
      "height": height-margin.top-margin.bottom,
      "x": margin.left,
      "y": margin.top
    },
    value_var = null,
    id_var = null,
    text_var = null,
    xaxis_var = null,
    nesting = [],
    filter = [],
    solo = [],
    layout = "value",
    sort = "total",
    sort_order = "asc",
    tooltip_info = [],
    title = null,
    dispatch = d3.dispatch('elementMouseover', 'elementMouseout');

  //===================================================================


  function chart(selection) {
    selection.each(function(data) {
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // INIT vars & data munging
      //-------------------------------------------------------------------

      // first clone input so we know we are working with fresh data
      var cloned_data = JSON.parse(JSON.stringify(data));
      
      // filter raw data
      cloned_data = cloned_data.filter(function(d){
        // if any of this item's parents are in the filter list, remove it
        for(var i = 0; i < nesting.length; i++){
          if(filter.indexOf(d[nesting[i]]) > -1){
            return false;
          }
        }
        
        if(!solo.length){
          return true
        }

        // if any of this item's parents are in the filter list, remove it
        for(var i = 0; i < nesting.length; i++){
          if(solo.indexOf(d[nesting[i]]) > -1){
            return true;
          }
        }
        
        return false;
      })
      
      // get unique values for xaxis
      xaxis_vals = cloned_data
        .reduce(function(a, b){ return a.concat(b[xaxis_var]) }, [])
        .filter(function(value, index, self) { 
          return self.indexOf(value) === index;
        })
      
      // get max total for sums of each xaxis
      var xaxis_sums = d3.nest()
        .key(function(d){return d[xaxis_var] })
        .rollup(function(leaves){
          return d3.sum(leaves, function(d){return d[value_var];})
        })
        .entries(cloned_data)
      
      var data_max = layout == "share" ? 1 : d3.max(xaxis_sums, function(d){ return d.values; });
      
      // nest data properly according to nesting array
      nested_data = nest_data(xaxis_vals, cloned_data, xaxis_sums);
      
      // increase top margin if it's not large enough
      margin.top = title && margin.top < 40 ? 40 : margin.top;
      // update size
      size.width = width-margin.left-margin.right;
      size.height = height-margin.top-margin.bottom;
      size.x = margin.left;
      size.y = margin.top;
      
      // scales for both X and Y values
      var x_scale = d3.scale.linear()
        .domain([xaxis_vals[0], xaxis_vals[xaxis_vals.length-1]]).range([0, size.width]);
      // **WARNING reverse scale from 0 - max converts from height to 0 (inverse)
      var y_scale = d3.scale.linear()
        .domain([0, data_max]).range([size.height, 0]);
      
      // Helper function unsed to convert stack values to X, Y coords 
      var area = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x_scale(parseInt(d.key)); })
        .y0(function(d) { return y_scale(d.y0); })
        .y1(function(d) { return y_scale(d.y0 + d.y); });
      
      // Select the svg element, if it exists.
      var svg = d3.select(this).selectAll("svg").data([data]);
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height)
      
      // container for the visualization
      var viz_enter = svg_enter.append("g")
        .attr("class", "viz")
        .attr("width", size.width)
        .attr("height", size.height)

      // add grey background for viz
      viz_enter.append("rect")
        .style('stroke','#000')
        .style('stroke-width',1)
        .style('fill','#efefef')
        .attr("class","background")
        .attr('x',0)
        .attr('y',0)
        .on(vizwhiz.evt.move, function(d){
          vizwhiz.tooltip.remove();
        })
      
      // update (in case width and height are changed)
      d3.select(".viz")
        .attr("transform", "translate(" + size.x + "," + size.y + ")")
        .select("rect")
          .attr('width', size.width)
          .attr('height', size.height)
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // TITLE
      //-------------------------------------------------------------------
      
      svg_enter.append("text")
        .attr('class', 'title')
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("font-family", "Helvetica")
        .attr("fill", "#4c4c4c");
        
      d3.select(".title")
        .attr('width', size.width)
        .attr('x', (size.width/2) + margin.left) 
        .attr('y', margin.top/2)
        .text(title);
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // X AXIS
      //-------------------------------------------------------------------
      
      // enter axis ticks
      var xaxis_enter = viz_enter.append("g")
        .attr("class", "xaxis")
      
      // update axis ticks
      d3.select(".xaxis")
        .attr("transform", "translate(0," + size.height + ")")
        .call(x_axis.scale(x_scale))
      
      // enter label
      xaxis_enter.append('text')
        .attr('class', 'axis_title_x')
        .attr('y', 60)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("font-family", "Helvetica")
        .attr("fill", "#4c4c4c")
        .text(xaxis_var)
      
      // update label
      d3.select(".axis_title_x")
        .attr('width', size.width)
        .attr('x', size.width/2)
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Y AXIS
      //-------------------------------------------------------------------
      
      // enter
      var yaxis_enter = viz_enter.append("g")
        .attr("class", "yaxis")
      
      // update
      d3.select(".yaxis").call(y_axis.scale(y_scale))
      
      // also update background tick lines
      d3.selectAll(".y_bg_line")
        .attr("x2", size.width)
      
      // label
      yaxis_enter.append('text')
        .attr('class', 'axis_title_y')
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("font-family", "Helvetica")
        .attr("fill", "#4c4c4c")
        .text(value_var)
      
      // update label
      d3.select(".axis_title_y")
        .attr('width', size.width)
        .attr("transform", "translate(" + (-size.x+25) + "," + (size.y+size.height/2) + ") rotate(-90)")
      
      //===================================================================
      
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // LAYERS
      //-------------------------------------------------------------------
      
      // Get layers from d3.stack function (gives x, y, y0 values)
      var offset = layout == "value" ? "zero" : "expand";
      var layers = stack.offset(offset)(nested_data)
      
      // container for layers
      viz_enter.append("g").attr("class", "layers")
      
      // give data with key function to variables to draw
      var paths = d3.select("g.layers").selectAll(".layer")
        .data(layers, function(d){ return d.key; })
      
      // ENTER
      // enter new paths, could be next level deep or up a level
      paths.enter().append("path")
        .attr("opacity", 0)
        .attr("class", "layer")
        .attr("fill-opacity", 0.8)
        .attr("stroke-width",1)
        .attr("stroke", "#ffffff")
        .attr("fill", function(d){
          return d.color
        })
        .attr("d", function(d) {
          return area(d.values);
        })
      
      // UPDATE
      paths.transition().duration(vizwhiz.timing)
        .attr("opacity", 1)
        .attr("fill", function(d){
          return d.color
        })
        .attr("d", function(d) {
          return area(d.values);
        });
      // mouseover
      paths
        .on(vizwhiz.evt.move, path_tooltip)
        
      function path_tooltip(d){
        d3.selectAll("line.rule").remove();
        var mouse_x = d3.mouse(this)[0];
        var rev_x_scale = d3.scale.linear()
          .domain(x_scale.range()).range(x_scale.domain());
        var this_x = Math.round(rev_x_scale(mouse_x));
        var this_x_index = xaxis_vals.indexOf(this_x)
        var this_value = d.values[this_x_index]
        // add dashed line at closest X position to mouse location
        d3.select("g.viz").append("line")
          .datum(d)
          .attr("class", "rule")
          .attr({"x1": x_scale(this_x), "x2": x_scale(this_x)})
          .attr({"y1": y_scale(this_value.y0), "y2": y_scale(this_value.y + this_value.y0)})
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 0.75)
          .attr("stroke-dasharray", "5,3")
          .on(vizwhiz.evt.move, null)
        
        // tooltip
        var tooltip_data = {}
        tooltip_data["Value ("+this_x+")"] = this_value.values;
        tooltip_info.forEach(function(t){
          if (d[t]) tooltip_data[t] = d[t]
        })

        vizwhiz.tooltip.remove();
        vizwhiz.tooltip.create({
          "parent": svg,
          "id": d.id,
          "data": tooltip_data,
          "title": d[nesting[nesting.length-1]],
          "x": x_scale(this_x)+margin.left,
          "y": y_scale(this_value.y0 + this_value.y)+(size.height-y_scale(this_value.y))/2+margin.top,
          "offset": ((size.height-y_scale(this_value.y))/2)+2,
          "arrow": true
        })
      }
      
      // EXIT
      paths.exit()
        .transition().duration(vizwhiz.timing)
        .attr("opacity", 0)
        .remove()
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // TEXT LAYERS
      //-------------------------------------------------------------------
      
      var defs = svg_enter.append('svg:defs')
      vizwhiz.utils.drop_shadow(defs)
      
      // filter layers to only the ones with a height larger than 6% of viz
      var text_layers = [];
      var text_height_scale = d3.scale.linear().range([0, 1]).domain([0, data_max]);
      layers.forEach(function(layer){
        
        // find out which is the largest
        var available_areas = layer.values.filter(function(d,i,a){
          var min_height = 30;
          if (i == 0) {
            return (size.height-y_scale(d.y)) >= min_height 
                && (size.height-y_scale(a[i+1].y)) >= min_height
                && (size.height-y_scale(a[i+2].y)) >= min_height
                && y_scale(d.y)-(size.height-y_scale(d.y0)) < y_scale(a[i+1].y0)
                && y_scale(a[i+1].y)-(size.height-y_scale(a[i+1].y0)) < y_scale(a[i+2].y0)
                && y_scale(d.y0) > y_scale(a[i+1].y)-(size.height-y_scale(a[i+1].y0))
                && y_scale(a[i+1].y0) > y_scale(a[i+2].y)-(size.height-y_scale(a[i+2].y0));
          }
          else if (i == a.length-1) {
            return (size.height-y_scale(d.y)) >= min_height 
                && (size.height-y_scale(a[i-1].y)) >= min_height
                && (size.height-y_scale(a[i-2].y)) >= min_height
                && y_scale(d.y)-(size.height-y_scale(d.y0)) < y_scale(a[i-1].y0)
                && y_scale(a[i-1].y)-(size.height-y_scale(a[i-1].y0)) < y_scale(a[i-2].y0)
                && y_scale(d.y0) > y_scale(a[i-1].y)-(size.height-y_scale(a[i-1].y0))
                && y_scale(a[i-1].y0) > y_scale(a[i-2].y)-(size.height-y_scale(a[i-2].y0));
          }
          else {
            return (size.height-y_scale(d.y)) >= min_height 
                && (size.height-y_scale(a[i-1].y)) >= min_height
                && (size.height-y_scale(a[i+1].y)) >= min_height
                && y_scale(d.y)-(size.height-y_scale(d.y0)) < y_scale(a[i+1].y0)
                && y_scale(d.y)-(size.height-y_scale(d.y0)) < y_scale(a[i-1].y0)
                && y_scale(d.y0) > y_scale(a[i+1].y)-(size.height-y_scale(a[i+1].y0))
                && y_scale(d.y0) > y_scale(a[i-1].y)-(size.height-y_scale(a[i-1].y0));
          }
        });
        var best_area = d3.max(layer.values,function(d,i){
          if (available_areas.indexOf(d) >= 0) {
            if (i == 0) {
              return (size.height-y_scale(d.y))
                   + (size.height-y_scale(layer.values[i+1].y))
                   + (size.height-y_scale(layer.values[i+2].y));
            }
            else if (i == layer.values.length-1) {
              return (size.height-y_scale(d.y))
                   + (size.height-y_scale(layer.values[i-1].y))
                   + (size.height-y_scale(layer.values[i-2].y));
            }
            else {
              return (size.height-y_scale(d.y))
                   + (size.height-y_scale(layer.values[i-1].y))
                   + (size.height-y_scale(layer.values[i+1].y));
            }
          } else return null;
        });
        var best_area = layer.values.filter(function(d,i,a){
          if (i == 0) {
            return (size.height-y_scale(d.y))
                 + (size.height-y_scale(layer.values[i+1].y))
                 + (size.height-y_scale(layer.values[i+2].y)) == best_area;
          }
          else if (i == layer.values.length-1) {
            return (size.height-y_scale(d.y))
                 + (size.height-y_scale(layer.values[i-1].y))
                 + (size.height-y_scale(layer.values[i-2].y)) == best_area;
          }
          else {
            return (size.height-y_scale(d.y))
                 + (size.height-y_scale(layer.values[i-1].y))
                 + (size.height-y_scale(layer.values[i+1].y)) == best_area;
          }
        })[0]
        if (best_area) {
          layer.tallest = best_area
          text_layers.push(layer)
        }
        
      })
      // container for text layers
      viz_enter.append("g").attr("class", "text_layers")
      
      // give data with key function to variables to draw
      var texts = d3.select("g.text_layers").selectAll(".label")
        .data(text_layers, function(d){ return d.key+d.tallest.key; })
        
      // ENTER
      texts.enter().append("text")
        .attr('filter', 'url(#dropShadow)')
        .attr("class", "label")
        .style("font-weight","bold")
        .attr("font-size","14px")
        .attr("font-family","Helvetica")
        .attr("dy", 6)
        .attr("opacity",0)
        .attr("text-anchor", function(d){
          // if first, left-align text
          if(d.tallest.key == x_scale.domain()[0]) return "start";
          // if last, right-align text
          if(d.tallest.key == x_scale.domain()[1]) return "end";
          // otherwise go with middle
          return "middle"
        })
        .attr("fill", function(d){
          return "white"
        })
        .attr("x", function(d){
          var pad = 0;
          // if first, push it off 10 pixels from left side
          if(d.tallest.key == x_scale.domain()[0]) pad += 10;
          // if last, push it off 10 pixels from right side
          if(d.tallest.key == x_scale.domain()[1]) pad -= 10;
          return x_scale(d.tallest.key) + pad;
        })
        .attr("y", function(d){
          var height = size.height - y_scale(d.tallest.y);
          return y_scale(d.tallest.y0 + d.tallest.y) + (height/2);
        })
        .text(function(d) {
          return d[nesting[nesting.length-1]]
        })
        .each(function(d){
          // set usable width to 2x the width of each x-axis tick
          var tick_width = (size.width / xaxis_vals.length) * 2;
          // if the text box's width is larger than the tick width wrap text
          if(this.getBBox().width > tick_width){
            // first remove the current text
            d3.select(this).text("")
            // figure out the usable height for this location along x-axis
            var height = size.height-y_scale(d.tallest.y)
            // wrap text WITHOUT resizing
            // vizwhiz.utils.wordwrap(d[nesting[nesting.length-1]], this, tick_width, height, false)
            
            vizwhiz.utils.wordwrap({
              "text": d[nesting[nesting.length-1]],
              "parent": this,
              "width": tick_width,
              "height": height,
              "resize": false
            })
            
            // reset Y to compensate for new multi-line height
            var offset = (height - this.getBBox().height) / 2;
            // top of the element's y attr
            var y_top = y_scale(d.tallest.y0 + d.tallest.y);
            d3.select(this).attr("y", y_top + offset)
          }
        })
      
      // UPDATE
      texts.transition().duration(vizwhiz.timing)
        .attr("opacity",1)
      
      // EXIT
      texts.exit().transition().duration(vizwhiz.timing)
        .attr("opacity",0)
        .remove()
      
      //===================================================================
      
      
      // Draw foreground bounding box
      viz_enter.append('rect')
        .style('stroke','#000')
        .style('stroke-width',1*2)
        .style('fill','none')
        .attr('class', "border")
        .attr('x',0)
        .attr('y',0)
      
      // update (in case width and height are changed)
      d3.select(".border")
        .attr('width', size.width)
        .attr('height', size.height)
      
      // Always bring to front
      d3.select("rect.border").node().parentNode.appendChild(d3.select("rect.border").node())
      
    });

    return chart;
  }
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Nest data function (needed for getting flat data ready for stacks)
  //-------------------------------------------------------------------
  
  function nest_data(xaxis_vals, data, xaxis_sums){
    var nest_key = nesting[nesting.length-1];
    var info_lookup = {};
    
    var nested = d3.nest()
      .key(function(d){ return d[nest_key]; })
      .rollup(function(leaves){
        info_lookup[leaves[0][nest_key]] = JSON.parse(JSON.stringify(leaves[0]))
        delete info_lookup[leaves[0][nest_key]][xaxis_var]
        delete info_lookup[leaves[0][nest_key]][value_var]
        
        var values = d3.nest()
          .key(function(d){ return d[xaxis_var]; })
          .rollup(function(l) {
            return d3.sum(l, function(d){ return d[value_var]});
          })
          .entries(leaves)
        
        // Make sure all xaxis_vars at least have 0 values
        xaxis_vars_available = values
          .reduce(function(a, b){ return a.concat(b.key)}, [])
          .filter(function(y, i, arr) { return arr.indexOf(y) == i })
        
        xaxis_vals.forEach(function(y){
          if(xaxis_vars_available.indexOf(""+y) < 0){
            values.push({"key": ""+y, "values": 0})
          }
        })

        return values.sort(function(a,b){return a.key-b.key;});
      })
      .entries(data)
    
    nested.forEach(function(d, i){
      d["total"] = d3.sum(d.values, function(dd){ return dd.values; })
      nested[i] = vizwhiz.utils.merge(d, info_lookup[d.key]);
    })
    // return nested
    
    return nested.sort(function(a,b){
      // console.log(a)
      if(a[sort]<b[sort]) return sort_order == "desc" ? -1 : 1;
      if(a[sort]>b[sort]) return sort_order == "desc" ? 1 : -1;
      return 0;
    });
    
  }

  //===================================================================

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Helper function used to create stack polygon
  //-------------------------------------------------------------------
  
  var stack = d3.layout.stack()
    .offset("zero")
    .values(function(d) { return d.values; })
    .x(function(d) { return parseInt(d.key); })
    .y(function(d) { return d.values; });
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // X & Y Axis formatting help
  //-------------------------------------------------------------------
  
  var x_axis = d3.svg.axis()
    .tickSize(0)
    .tickPadding(15)
    .orient('bottom')
    .tickFormat(function(d, i) {
      d3.select(this)
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
      // vertical lines up and down
      d3.select(this.parentNode).append("line")
        .attr("class","tick_line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0-1)
        .attr("y2", -size.height+1)
        .attr("stroke", "#ccc")
        .attr("stroke-width",1/2)
      d3.select(this.parentNode).append("line")
        .attr("class","tick_line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 1)
        .attr("y2", 10)
        .attr("stroke", "#000")
        .attr("stroke-width",1)
      return d
    });
  
  var y_axis = d3.svg.axis()
    .tickSize(0)
    .tickPadding(15)
    .orient('left')
    .tickFormat(function(d, i) {
      d3.select(this)
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
      // horizontal lines across
      d3.select(this.parentNode).append("line")
        .attr("class","y_bg_line")
        .attr("x1", 0+1)
        .attr("x2", 0+size.width-1)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#ccc")
        .attr("stroke-width",1/2)
      d3.select(this.parentNode).append("line")
        .attr("class","tick_line")
        .attr("x1", -10)
        .attr("x2", 0-1)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#000")
        .attr("stroke-width",1)
      if(layout == "share"){
        return d3.format("p")(d);
      }
      return vizwhiz.utils.format_num(d, false, 3, true)
    });

  //===================================================================

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  chart.dispatch = dispatch;

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
  
  chart.value_var = function(x) {
    if (!arguments.length) return value_var;
    value_var = x;
    return chart;
  };
  
  chart.xaxis_var = function(x) {
    if (!arguments.length) return xaxis_var;
    xaxis_var = x;
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
  
  chart.nesting = function(x) {
    if (!arguments.length) return nesting;
    nesting = x;
    return chart;
  };
  
  chart.filter = function(x) {
    if (!arguments.length) return filter;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      filter = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
      }
      // if element is in the solo array remove it and add to this one
      else if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
        filter.push(x)
      }
      // element not in current filter so add it
      else {
        filter.push(x)
      }
    }
    return chart;
  };
  
  chart.solo = function(x) {
    if (!arguments.length) return solo;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      solo = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
      }
      // if element is in the filter array remove it and add to this one
      else if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
        solo.push(x)
      }
      // element not in current filter so add it
      else {
        solo.push(x)
      }
    }
    return chart;
  };
  
  chart.layout = function(x) {
    if (!arguments.length) return layout;
    layout = x;
    return chart;
  };
  
  chart.title = function(x) {
    if (!arguments.length) return title;
    title = x;
    return chart;
  };
  
  chart.sort = function(x) {
    if (!arguments.length) return sort;
    sort = x;
    return chart;
  };
  
  chart.sort_order = function(x) {
    if (!arguments.length) return sort_order;
    sort_order = x;
    return chart;
  };
  
  chart.tooltip_info = function(x) {
    if (!arguments.length) return tooltip_info;
    tooltip_info = x;
    return chart;
  };

  chart.margin = function(x) {
    if (!arguments.length) return margin;
    margin.top    = typeof x.top    != 'undefined' ? x.top    : margin.top;
    margin.right  = typeof x.right  != 'undefined' ? x.right  : margin.right;
    margin.bottom = typeof x.bottom != 'undefined' ? x.bottom : margin.bottom;
    margin.left   = typeof x.left   != 'undefined' ? x.left   : margin.left;
    size.width    = width-margin.left-margin.right;
    size.height   = height-margin.top-margin.bottom;
    size.x        = margin.left;
    size.y        = margin.top;
    return chart;
  };

  //===================================================================

  return chart;
};
vizwhiz.viz.tree_map = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = window.innerWidth,
    height = window.innerHeight,
    value_var = "value",
    id_var = "id",
    text_var = "name",
    nesting = null,
    filter = [],
    solo = [],
    tooltip_info = [],
    dispatch = d3.dispatch('elementMouseover', 'elementMouseout');
  
  //===================================================================

  function chart(selection) {
    selection.each(function(data) {
      
      var cloned_data = JSON.parse(JSON.stringify(data));
      
      var nested_data = vizwhiz.utils.nest(cloned_data, nesting, false, [{"key":"color"}])
      nested_data.children = nested_data.children.filter(filter_data)
      
      // Select the svg element, if it exists.
      var svg = d3.select(this).selectAll("svg").data([nested_data]);
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height)
      
      // Ok, to get started, lets run our heirarchically nested
      // data object through the d3 treemap function to get a
      // flat array of data with X, Y, width and height vars
      var tmap_data = d3.layout.treemap()
        .round(false)
        .size([width, height])
        .children(function(d) { return d.children; })
        .sort(function(a, b) { return a.value - b.value; })
        .value(function(d) { return value_var ? d[value_var] : d.value; })
        .nodes(nested_data)
        .filter(function(d) {
          return !d.children;
        })
      
      // We'll figure out how many levels of nesting there are to determine
      // the options for which depths to show
      // var max_depth = d3.max(tmap_data, function(d){ return d.depth; });
      
      // filter the tree map nodes to only the depth requested
      // tmap_data = tmap_data.filter(function(d) { return d.depth === (depth || max_depth); });
      
      // If it's the first time the app is being built, add group for nodes
      svg_enter.append("clipPath")
        .attr("id","clipping")
        .append("rect")
          .attr("width",width)
          .attr("height",height)
          
      d3.select("#clipping rect").transition(vizwhiz.timing)
        .attr("width",width)
        .attr("height",height)
        
      svg_enter.append("g")
        .attr("class", "viz")
        // .attr("transform", function(d){ return "translate("+(stroke_width/2)+", "+height+")"; })
        .attr("clip-path","url(#clipping)")
      
      var cell = d3.select("g.viz").selectAll("g")
        .data(tmap_data, function(d){ return d[text_var]; })
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for cells that are already in existance
      //-------------------------------------------------------------------

      // need to perform updates in "each" clause so that new data is 
      // propogated down to rects and text elements
      cell.transition().duration(vizwhiz.timing)
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("opacity", 1)
        .each(function(g_data) {

          // update rectangles
          d3.select(this).selectAll("rect").transition().duration(vizwhiz.timing)
            .attr('width', function() {
              return g_data.dx+'px'
            })
            .attr('height', function() { 
              return g_data.dy+'px'
            })

          // text (name)
          d3.select(this).selectAll("text.name")
            .attr("opacity", function(){
              return 0;
            })
            .transition().duration(vizwhiz.timing)
            .each("end", function(q, i){
              // need to recalculate word wrapping because dimensions have changed
              if(g_data[text_var]){
                var text = g_data[id_var] ? [g_data[text_var],g_data[id_var]] : g_data[text_var]
                vizwhiz.utils.wordwrap({
                  "text": text,
                  "parent": this,
                  "width": g_data.dx,
                  "height": g_data.dy,
                  "resize": true
                })
              }
              d3.select(this).transition().duration(vizwhiz.timing/2).attr("opacity", 1)
            })

          // text (share)
          d3.select(this).selectAll("text.share").transition().duration(vizwhiz.timing)
            .text(function(){
              var root = g_data;
              while(root.parent){ root = root.parent; } // find top most parent ndoe
              return vizwhiz.utils.format_num(g_data.value/root.value, true, 2);
            })
            .attr('font-size',function(){
              var size = (g_data.dx)/7
              if(g_data.dx < g_data.dy) var size = g_data.dx/7
              else var size = g_data.dy/7
              return size
            })
            .attr('x', function(){
              return g_data.dx/2
            })
            .attr('y',function(){
              return g_data.dy-(parseInt(d3.select(this).attr('font-size'),10)*0.10)
            })

        })

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New cells enter, initialize them here
      //-------------------------------------------------------------------
      
      // cell aka container
      var cell_enter = cell.enter().append("g")
        .attr("opacity", 1)
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")"; 
        })
      
      // rectangle
      cell_enter.append("rect")
        .attr("stroke","#ffffff")
        .attr('width', function(d) {
          return d.dx+'px'
        })
        .attr('height', function(d) { 
          return d.dy+'px'
        })
        .attr("fill", function(d){
          // in case this depth doesn't have a color but a child of
          // this element DOES... use that color
          while(!d.color && d.children){
            d = d.children[0]
          }
          // if a color cannot be found (at this depth of deeper) use random
          return d.color ? d.color : vizwhiz.utils.rand_color();
        })
        .on(vizwhiz.evt.move, mouseover)
        .on(vizwhiz.evt.out, function(d){
          vizwhiz.tooltip.remove();
        })
      
      // text (name)
      cell_enter.append("text")
        .attr("opacity", 1)
        .attr("text-anchor","start")
        .style("font-weight","bold")
        .attr("font-family","Helvetica")
        .attr('class','name')
        .attr('x','0.2em')
        .attr('y','0em')
        .attr('dy','1em')
        .attr("fill", function(d){
          if(d.text_color) return d.text_color
          return d3.hsl(d.color).l >= 0.5 ? "#333" : "#fff";
        })
        .on(vizwhiz.evt.move, mouseover)
        .on(vizwhiz.evt.out, function(d){
          vizwhiz.tooltip.remove();
        })
        .each(function(d){
          if(d[text_var]){
            var text = d[id_var] ? [d[text_var],d[id_var]] : d[text_var]
            vizwhiz.utils.wordwrap({
              "text": text,
              "parent": this,
              "width": d.dx,
              "height": d.dy,
              "resize": true
            })
          }
        })
      
      // text (share)
      cell_enter.append("text")
        .attr('class','share')
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-family","Helvetica")
        .attr("fill", function(d){
          if(d.text_color) return d.text_color
          return d3.hsl(d.color).l >= 0.5 ? "#333" : "#fff";
        })
        .text(function(d) {
          var root = d;
          while(root.parent){ root = root.parent; } // find top most parent ndoe
          return vizwhiz.utils.format_num(d.value/root.value, true, 2);
        })
        .attr('font-size',function(d){
          var size = (d.dx)/7
          if(d.dx < d.dy) var size = d.dx/7
          else var size = d.dy/7
          return size
        })
        .attr('x', function(d){
          return d.dx/2
        })
        .attr('y',function(d){
          return d.dy-(parseInt(d3.select(this).attr('font-size'),10)*0.10)
        })
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exis, get rid of old cells
      //-------------------------------------------------------------------
      
      cell.exit().transition().duration(vizwhiz.timing)
        .attr("opacity", 0)
        .remove()

      //===================================================================
      
    });

    return chart;
  }
  
  function mouseover(d){
    // tooltip
    var svg = d3.select("svg");
    var tooltip_data = {}
    tooltip_info.forEach(function(t){
      if (d[t]) tooltip_data[t] = d[t]
    })
    vizwhiz.tooltip.create({
      "parent": svg,
      "id": d.id,
      "data": tooltip_data,
      "title": d[text_var],
      "x": d3.mouse(svg.node())[0],
      "y": d3.mouse(svg.node())[1],
      "offset": 10,
      "arrow": true
    })
  }
  
  function filter_data(d){
    
    // if this items name is in the filter list, remove it
    if(filter.indexOf(d.name) > -1){
      return false
    }
    
    if(!solo.length){
      return true
    }
    
    if(solo.indexOf(d.name) > -1){
      return true;
    }
    
    return false;
  }


  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  chart.dispatch = dispatch;

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
  
  chart.nesting = function(x) {
    if (!arguments.length) return nesting;
    nesting = x;
    return chart;
  };
  
  chart.tooltip_info = function(x) {
    if (!arguments.length) return tooltip_info;
    tooltip_info = x;
    return chart;
  };
  
  chart.filter = function(x) {
    if (!arguments.length) return filter;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      filter = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
      }
      // if element is in the solo array remove it and add to this one
      else if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
        filter.push(x)
      }
      // element not in current filter so add it
      else {
        filter.push(x)
      }
    }
    return chart;
  };
  
  chart.solo = function(x) {
    if (!arguments.length) return solo;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      solo = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
      }
      // if element is in the filter array remove it and add to this one
      else if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
        solo.push(x)
      }
      // element not in current filter so add it
      else {
        solo.push(x)
      }
    }
    return chart;
  };

  chart.margin = function(x) {
    if (!arguments.length) return margin;
    margin.top    = typeof x.top    != 'undefined' ? x.top    : margin.top;
    margin.right  = typeof x.right  != 'undefined' ? x.right  : margin.right;
    margin.bottom = typeof x.bottom != 'undefined' ? x.bottom : margin.bottom;
    margin.left   = typeof x.left   != 'undefined' ? x.left   : margin.left;
    return chart;
  };

  //===================================================================


  return chart;
};vizwhiz.viz.geo_map = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var width = 300,
      height = 300,
      value_var = "value",
      id_var = "id",
      text_var = "name",
      clicked = false,
      highlight = null,
      timing = 500,
      coords = null,
      shape = null,
      terrain = true,
      background = null,
      default_opacity = 0.25,
      select_opacity = 0.75,
      land_style = {"fill": "#F1EEE8"},
      water_color = "#B5D0D0",
      stroke_width = 1,
      tooltip_info = [],
      color_gradient = ["#00008f", "#003fff", "#00efff", "#ffdf00", "#ff3000", "#7f0000"],
      zoom_behavior = d3.behavior.zoom(),
      projection = d3.geo.mercator(),
      value_color = d3.scale.log(),
      initial_width,
      initial_height,
      first = true;

  //===================================================================


  function chart(selection) {
    selection.each(function(data, i) {

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Private Variables
      //-------------------------------------------------------------------
      
      if (first) {
        projection
          .scale(width)
          .translate([width/2,height/2]);
          
        initial_width = width
        initial_height = height
          
        zoom_behavior
          .scale(projection.scale())
          .translate(projection.translate())
          .on("zoom",function(d){ zoom(d); })
          .scaleExtent([width, 1 << 23]);
      }
      
      var this_selection = this,
          dragging = false,
          info_width = 300,
          scale_height = 10,
          scale_padding = 20,
          path = d3.geo.path().projection(projection),
          tile = d3.geo.tile().size([width, height]),
          old_scale = projection.scale(),
          old_translate = projection.translate();
          
      
      if (data) {
        data_extent = d3.extent(d3.values(data),function(d){
          return d[value_var] && d[value_var] != 0 ? d[value_var] : null
        })
        var data_range = [],
            step = 0.0
        while(step <= 1) {
          data_range.push((data_extent[0]*Math.pow((data_extent[1]/data_extent[0]),step)))
          step += 0.2
        }
        value_color
          .domain(data_range)
          .interpolate(d3.interpolateRgb)
          .range(color_gradient)
      }

      //===================================================================
      
      // Select the svg element, if it exists.
      var svg = d3.select(this_selection).selectAll("svg").data([data]);
      
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height)
        .style("z-index", 10)
        .style("position","absolute");
        
      var defs = svg_enter.append("defs")
        
      if (background) {
            
        svg_enter.append("rect")
          .attr("width",width)
          .attr("height",height)
          .attr("fill",water_color);
          
        svg_enter.append("g")
          .attr("id","land")
          .attr("class","viz")
              
        var land = d3.select("g#land").selectAll("path")
          .data(topojson.object(background, background.objects.land).geometries)
        
        land.enter().append("path")
          .attr("d",path)
          .attr(land_style)
            
      }

      svg_enter.append('g')
        .attr('class','tiles');
        
      if (terrain) update_tiles(0);
      else d3.selectAll("g.tiles *").remove()
        
      // Create viz group on svg_enter
      var viz_enter = svg_enter.append('g')
        .call(zoom_behavior)
        .on(vizwhiz.evt.down,function(d){dragging = true})
        .on(vizwhiz.evt.up,function(d){dragging = false})
        .append('g')
          .attr('class','viz');
        
      viz_enter.append("rect")
        .attr("class","overlay")
        .attr("width",width)
        .attr("height",height)
        .attr("fill","transparent")
        .on(vizwhiz.evt.click, function(d) {
          if (highlight) {
            var temp = highlight;
            highlight = null;
            d3.select("#path"+temp).call(color_paths);
            clicked = false;
            zoom(shape);
            info();
          }
        });
        
      viz_enter.append('g')
        .attr('class','paths');
        
      // add scale
        
      var gradient = defs
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");
           
      data_range.forEach(function(v,i){
        gradient.append("stop")
          .attr("offset",Math.round((i/(data_range.length-1))*100)+"%")
          .attr("stop-color", value_color(v))
          .attr("stop-opacity", 1)
      })
        
      var scale = svg_enter.append('g')
        .attr('class','scale')
        .attr("transform","translate("+(width-info_width-5)+","+5+")");
        
      scale.append("rect")
        .attr("width", info_width+"px")
        .attr("height", (scale_height*5)+"px")
        .attr("fill","#ffffff")
        .attr("rx",3)
        .attr("ry",3)
        .attr("stroke","#cccccc")
        .attr("stroke-width",2)
            
      scale.append("text")
        .attr("id","scale_title")
        .attr("x",(info_width/2)+"px")
        .attr("y","0px")
        .attr("dy","1.25em")
        .attr("text-anchor","middle")
        .attr("fill","#333")
        .style("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
           
      data_range.forEach(function(v,i){
        if (i == data_range.length-1) {
          var x = scale_padding+Math.round((i/(data_range.length-1))*(info_width-(scale_padding*2)))-2
        } else if (i != 0) {
          var x = scale_padding+Math.round((i/(data_range.length-1))*(info_width-(scale_padding*2)))-1
        } else {
          var x = scale_padding+Math.round((i/(data_range.length-1))*(info_width-(scale_padding*2)))
        }
        scale.append("rect")
          .attr("x", x+"px")
          .attr("y", (scale_height*2)+"px")
          .attr("width", 2)
          .attr("height", (scale_height*1.5)+"px")
          .style("fill", "#333")
        
      scale.append("rect")
        .attr("x",scale_padding+"px")
        .attr("y",(scale_height*2)+"px")
        .attr("width", (info_width-(scale_padding*2))+"px")
        .attr("height", scale_height+"px")
        .style("fill", "url(#gradient)")
            
        scale.append("text")
          .attr("id","scale_"+i)
          .attr("x",x+"px")
          .attr("y", ((scale_height*3)+5)+"px")
          .attr("dy","1em")
          .attr("text-anchor","middle")
          .attr("fill","#333")
          .style("font-weight","bold")
          .attr("font-size","10px")
          .attr("font-family","Helvetica")
      })
      
      data_range.forEach(function(v,i){
        d3.select("text#scale_"+i).text(vizwhiz.utils.format_num(v,false,2,true))
      })
      d3.select("text#scale_title").text(value_var)
        
      // Create Zoom Controls div on svg_enter
      d3.select(this_selection).select("div#zoom_controls").remove()
      var zoom_div = d3.select(this_selection).append("div")
        .attr("id","zoom_controls")
        
      zoom_div.append("div")
        .attr("id","zoom_in")
        .attr("unselectable","on")
        .on(vizwhiz.evt.click,function(){ zoom("in") })
        .text("+")
        
      zoom_div.append("div")
        .attr("id","zoom_out")
        .attr("unselectable","on")
        .on(vizwhiz.evt.click,function(){ zoom("out") })
        .text("-")
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New nodes and links enter, initialize them here
      //-------------------------------------------------------------------

      var coord = d3.select("g.paths").selectAll("path")
        .data(coords)
        
      coord.enter().append("path")
        .attr("id",function(d) { return "path"+d.id } )
        .attr("d",path)
        .attr("vector-effect","non-scaling-stroke")
        .attr("opacity",0)
        .on(vizwhiz.evt.over, function(d){
          if (!clicked) {
            highlight = d[id_var];
            d3.select(this).attr("opacity",select_opacity);
            info();
          }
          if (highlight != d[id_var]) d3.select(this).attr("opacity",select_opacity);
        })
        .on(vizwhiz.evt.out, function(d){
          if (!clicked) {
            highlight = null;
            d3.select(this).attr("opacity",default_opacity);
            info();
          }
          if (highlight != d[id_var]) d3.select(this).attr("opacity",default_opacity);
        })
        .on(vizwhiz.evt.click, function(d) {
          if (clicked && highlight == d[id_var]) {
            var temp = highlight;
            highlight = null;
            d3.select("#path"+temp).call(color_paths);
            clicked = false;
            zoom(shape);
            info();
          } else {
            if (highlight) {
              var temp = highlight;
              highlight = null;
              d3.select("#path"+temp).call(color_paths);
            }
            highlight = d[id_var];
            d3.select(this).call(color_paths);
            clicked = true;
            zoom(d3.select("path#path"+highlight).datum());
            info();
          }
        });
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for things that are already in existance
      //-------------------------------------------------------------------
      
      coord.transition().duration(timing)
        .attr("opacity",default_opacity)
        .call(color_paths);
        
      // land.attr("d",path);
        
      svg.transition().duration(timing)
        .attr("width", width)
        .attr("height", height)
        .each("end",function(){
          info()
        });
        
      d3.select("g.scale").transition().duration(timing)
        .attr("transform","translate("+(width-info_width-5)+","+5+")");
        
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exit, for nodes and links that are being removed
      //-------------------------------------------------------------------

      // node.exit().remove()

      //===================================================================
      
      if (first) {
        zoom(shape,0);
        first = false;
      } else if (clicked) {
        zoom(d3.select("path#path"+highlight).datum());
      }
      
      function color_paths(p) {
        p
          .attr("fill",function(d){ 
            if (d[id_var] == highlight) return "none";
            else if (!data) return "#888888";
            else return data[d[id_var]] ? value_color(data[d[id_var]][value_var]) : "#eeeeee"
          })
          .attr("stroke-width",function(d) {
            if (d[id_var] == highlight) return 10;
            else return stroke_width;
          })
          .attr("stroke",function(d) {
            if (d[id_var] == highlight) return data[d[id_var]] ? value_color(data[d[id_var]][value_var]) : "#eeeeee";
            else return "white";
          })
          .attr("opacity",function(d){
            if (d[id_var] == highlight) return select_opacity;
            else return default_opacity;
          })
          .attr("clip-path",function(d){ 
            if (d[id_var] == highlight) return "url(#stroke_clip)";
            else return "none"
          })
          .each(function(d){
            if (d[id_var] == highlight) {
              defs.selectAll("#stroke_clip").remove();
              d3.select("defs").append("clipPath")
                .attr("id","stroke_clip")
                .append("use")
                  .attr("xlink:href",function(dd) { return "#path"+highlight } )
            }
          });
      }
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Zoom Function
      //-------------------------------------------------------------------
      
      function zoom(param,custom_timing) {
        
        var translate = zoom_behavior.translate(),
            zoom_extent = zoom_behavior.scaleExtent()
            
        var scale = zoom_behavior.scale()
        
        if (param == "in") var scale = scale*2
        else if (param == "out") var scale = scale*0.5
        
        var svg_scale = scale/initial_width,
            svg_translate = [translate[0]-(scale/2),translate[1]-(((scale/initial_width)*initial_height)/2)]
            
        old_scale = projection.scale()
        old_translate = projection.translate()
            
        if (param.coordinates) {
          
          if (clicked && highlight) { 
            var left = 20, w_avail = width-info_width-left
          } else {
            var left = 0, w_avail = width
          }
          
          var b = path.bounds(param),
              w = (b[1][0] - b[0][0])*1.1,
              h = (b[1][1] - b[0][1])*1.1,
              s_width = (w_avail*(scale/initial_width))/w,
              s_height = (height*(scale/initial_width))/h
              
          if (s_width < s_height) {
            var s = s_width*initial_width,
                offset_left = ((w_avail-(((w/1.1)/svg_scale)*s/initial_width))/2)+left,
                offset_top = (height-((h/svg_scale)*s/initial_width))/2
          } else {
            var s = s_height*initial_width,
                offset_left = ((w_avail-((w/svg_scale)*s/initial_width))/2)+left,
                offset_top = (height-(((h/1.1)/svg_scale)*s/initial_width))/2
          }
          
          var t_x = ((-(b[0][0]-svg_translate[0])/svg_scale)*s/initial_width)+offset_left,
              t_y = ((-(b[0][1]-svg_translate[1])/svg_scale)*s/initial_width)+offset_top
              
          var t = [t_x+(s/2),t_y+(((s/initial_width)*initial_height)/2)]
          
          translate = t
          scale = s
          
        } else if (param == "in" || param == "out") {
          
          var b = projection.translate()
          
          if (param == "in") translate = [b[0]+(b[0]-(width/2)),b[1]+(b[1]-(height/2))]
          else if (param == "out") translate = [b[0]+(((width/2)-b[0])/2),b[1]+(((height/2)-b[1])/2)]
        }
        
        // Scale Boundries
        if (scale < zoom_extent[0]) scale = zoom_extent[0]
        else if (scale > zoom_extent[1]) scale = zoom_extent[1]
        // X Boundries
        if (translate[0] > scale/2) translate[0] = scale/2
        else if (translate[0] < width-scale/2) translate[0] = width-scale/2
        // Y Boundries
        if (translate[1] > scale/2) translate[1] = scale/2
        else if (translate[1] < height-scale/2) translate[1] = height-scale/2

        projection.scale(scale).translate(translate);
        zoom_behavior.scale(scale).translate(translate);
        svg_scale = scale/initial_width;
        svg_translate = [translate[0]-(scale/2),translate[1]-(((scale/initial_width)*initial_height)/2)];
        
        if (typeof custom_timing != "number") {
          if (d3.event) {
            if (d3.event.scale) {
              if (d3.event.sourceEvent.type == "mousewheel" || d3.event.sourceEvent.type == "mousemove") {
                var zoom_timing = 0
              } else {
                var zoom_timing = timing
              }
            } else {
              var zoom_timing = timing
            }
          } else {
            var zoom_timing = timing*4
          }
        } else var zoom_timing = custom_timing

        if (terrain) update_tiles(zoom_timing);
        
        if (zoom_timing > 0) var viz_transition = d3.selectAll(".viz").transition().duration(zoom_timing)
        else var viz_transition = d3.selectAll(".viz")
        
        viz_transition.attr("transform","translate(" + svg_translate + ")" + "scale(" + svg_scale + ")")
            
      }

      //===================================================================

      function info() {
        
        vizwhiz.tooltip.remove();
        
        if (highlight && data[highlight]) {
            
          var tooltip_data = {}, sub_title = null
          
          if (!clicked) {
            sub_title = "Click for More Info"
          } else {
            tooltip_info.forEach(function(t){
              if (data[highlight][t]) tooltip_data[t] = data[highlight][t]
            })
          }
          
          vizwhiz.tooltip.create({
            "parent": svg,
            "data": tooltip_data,
            "title": data[highlight][text_var],
            "description": sub_title,
            "x": width,
            "y": 0,
            "offset": (scale_height*5)+10,
            "width": info_width,
            "arrow": false
          })
          
        }
        
      }

      function tileUrl(d) {
        // Standard OSM
        // return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
        // Custom CloudMade
        return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.cloudmade.com/c3cf91e1455249adaef26d096785dc90/88261/256/" + d[2] + "/" + d[0] + "/" + d[1] + ".png";
      }
      
      function update_tiles(image_timing) {

        var t = projection.translate(),
            s = projection.scale();
            
        var tiles = tile.scale(s).translate(t)(),
            old_tiles = tile.scale(old_scale).translate(old_translate)()
        
        var image = d3.select("g.tiles").selectAll("image.tile")
          .data(tiles, function(d) { return d; });
          
        image.enter().append('image')
          .attr('class', 'tile')
          .attr('xlink:href', tileUrl)
          .attr("opacity",0)
          .attr("width", Math.ceil(tiles.scale/(s/old_scale)))
          .attr("height", Math.ceil(tiles.scale/(s/old_scale)))
          .attr("x", function(d) { 
            var test = -(t[0]-(s/(old_scale/old_translate[0])));
            return Math.ceil(((d[0] + tiles.translate[0]) * tiles.scale)+test)/(s/old_scale); 
          })
          .attr("y", function(d) { 
            var test = -(t[1]-(s/(old_scale/old_translate[1])));
            return Math.ceil(((d[1] + tiles.translate[1]) * tiles.scale)+test)/(s/old_scale); 
          });

        if (image_timing > 0) var image_transition = image.transition().duration(image_timing)
        else var image_transition = image

        image_transition
          .attr("opacity",1)
          .attr("width", Math.ceil(tiles.scale))
          .attr("height", Math.ceil(tiles.scale))
          .attr("x", function(d) { return Math.ceil((d[0] + tiles.translate[0]) * tiles.scale); })
          .attr("y", function(d) { return Math.ceil((d[1] + tiles.translate[1]) * tiles.scale); });
        image.exit().remove();
          
          
      }
      
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

  chart.coords = function(x) {
    if (!arguments.length) return coords;
    coords = topojson.object(x, x.objects.munic).geometries;
    shape = {"coordinates": [[]], "type": "Polygon"}
    coords.forEach(function(v,i){
      v.coordinates[0].forEach(function(a){
        shape.coordinates[0].push(a)
      })
    })
    return chart;
  };

  chart.background = function(x,style) {
    if (!arguments.length) return background;
    background = x;
    if (style) {
      land_style = style.land;
      water_color = style.water;
    }
    return chart;
  };
  
  chart.tiles = function(x) {
    if (!arguments.length) return terrain;
    terrain = x;
    return chart;
  };

  chart.highlight = function(x) {
    if (!arguments.length) return highlight;
    highlight = x;
    if (highlight) clicked = true;
    else clicked = false;
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

vizwhiz.viz.pie_scatter = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var margin = {top: 20, right: 40, bottom: 80, left: 120},
    width = window.innerWidth,
    height = window.innerHeight,
    size = {
      "width": width-margin.left-margin.right,
      "height": height-margin.top-margin.bottom,
      "x": margin.left,
      "y": margin.top
    },
    value_var = null,
    id_var = null,
    text_var = null,
    xaxis_var = null,
    yaxis_var = null,
    nesting = [],
    filter = [],
    solo = [],
    tooltip_info = [];
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Private variables initialized (for use in mouseover functions)
  //-------------------------------------------------------------------
  
  var x_scale = d3.scale.linear(),
    y_scale = d3.scale.linear(),
    size_scale = d3.scale.linear(),
    stroke = 2;

  //===================================================================

  function chart(selection) {
    selection.each(function(data) {
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // INIT vars & data munging
      //-------------------------------------------------------------------
      
      // first clone input so we know we are working with fresh data
      var cloned_data = JSON.parse(JSON.stringify(data));
      // nest the flat data by nesting array
      // console.log(value_var)
      // value_var = "val_kg"
      var nested_data = vizwhiz.utils.nest(cloned_data, nesting, true,
          [{"key":value_var, "agg":"sum"}, {"key":"complexity", "agg":"avg"}, {"key":"distance", "agg":"avg"}, {"key":"color"}])

      // update size
      size.width = width-margin.left-margin.right;
      size.height = height-margin.top-margin.bottom;
      size.x = margin.left;
      size.y = margin.top;
      
      // Select the svg element, if it exists.
      var svg = d3.select(this).selectAll("svg").data([data]);
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height)
      
      // container for the visualization
      var viz_enter = svg_enter.append("g").attr("class", "viz")

      // add grey background for viz
      viz_enter.append("rect")
        .style('stroke','#000')
        .style('stroke-width',1)
        .style('fill','#efefef')
        .attr("class","background")
        .attr('x',0)
        .attr('y',0)
      // update (in case width and height are changed)
      d3.select(".viz")
        .attr("transform", "translate(" + size.x + "," + size.y + ")")
        .select("rect")
          .attr('width', size.width)
          .attr('height', size.height)
      
      size_scale
        .domain(d3.extent(nested_data, function(d){ return d[value_var]; }))
        .range([10, d3.min([width,height])/10])
        .nice()

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // X AXIS
      //-------------------------------------------------------------------
      
      // create scale for buffer of largest item
      
      x_scale
        .domain(d3.extent(nested_data, function(d){ return d[xaxis_var]; }))
        .range([0, size.width])
        .nice()
      
      // get buffer room (take into account largest size var)
      var inverse_x_scale = d3.scale.linear().domain(x_scale.range()).range(x_scale.domain())
      var largest_size = size_scale.range()[1]
      // convert largest size to x scale domain
      largest_size = inverse_x_scale(largest_size)
      // get radius of largest in pixels by subtracting this value from the x scale minimum
      var x_buffer = largest_size - x_scale.domain()[0];
      // update x scale with new buffer offsets
      x_scale.domain([x_scale.domain()[0]-x_buffer, x_scale.domain()[1]+x_buffer])
      
      // enter
      var xaxis_enter = viz_enter.append("g")
        .attr("class", "xaxis")
      
      // update
      d3.select(".xaxis")
        .attr("transform", "translate(0," + size.height + ")")
        .call(x_axis.scale(x_scale))
      
      // also update background tick lines
      d3.selectAll(".x_bg_line")
        .attr("y2", -size.height-stroke)
      
      // label
      xaxis_enter.append('text')
        .attr('y', 60)
        .attr('class', 'axis_title_x')
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("font-family", "Helvetica")
        .attr("fill", "#4c4c4c")
        .text(xaxis_var)
      
      // update label
      d3.select(".axis_title_x")
        .attr('width', size.width)
        .attr('x', size.width/2)
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Y AXIS
      //-------------------------------------------------------------------
      
      y_scale
        .domain(d3.extent(nested_data, function(d){ return d[yaxis_var]; }).reverse())
        .range([0, size.height])
        .nice()
      
      // get buffer room (take into account largest size var)
      var inverse_y_scale = d3.scale.linear().domain(y_scale.range()).range(y_scale.domain())
      largest_size = size_scale.range()[1]
      // convert largest size to x scale domain
      largest_size = inverse_y_scale(largest_size)
      // get radius of largest in pixels by subtracting this value from the x scale minimum
      var y_buffer = largest_size - y_scale.domain()[0];
      // update x scale with new buffer offsets
      y_scale.domain([y_scale.domain()[0]-y_buffer, y_scale.domain()[1]+y_buffer])
      
      // enter
      var yaxis_enter = viz_enter.append("g")
        .attr("class", "yaxis")
      
      // update
      d3.select(".yaxis").call(y_axis.scale(y_scale))
      
      // also update background tick lines
      d3.selectAll(".y_bg_line")
        .attr("x2", 0+size.width-stroke)
      
      // label
      yaxis_enter.append('text')
        .attr('class', 'axis_title_y')
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("font-family", "Helvetica")
        .attr("fill", "#4c4c4c")
        .text(yaxis_var)
        
      // update label
      d3.select(".axis_title_y")
        .attr('width', size.width)
        .attr("transform", "translate(" + (-size.x+25) + "," + (size.y+size.height/2) + ") rotate(-90)")
      
      //===================================================================
      
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // NODES
      //-------------------------------------------------------------------
      
      var arc = d3.svg.arc()
        .innerRadius(0)
        .startAngle(0)
      
      var has_children = nested_data[0].num_children ? true : false;
      
      // filter data AFTER axis have been set
      nested_data = nested_data.filter(function(d){
        
        // if this items name is in the filter list, remove it
        if(filter.indexOf(d.name) > -1){
          return false
        }
        
        // if any of this item's parents are in the filter list, remove it
        for(var i = 0; i < nesting.length; i++){
          if(filter.indexOf(d[nesting[i]]) > -1){
            return false;
          }
        }
        
        if(!solo.length){
          return true
        }
        
        if(solo.indexOf(d.name) > -1){
          return true;
        }

        // if any of this item's parents are in the filter list, remove it
        for(var i = 0; i < nesting.length; i++){
          if(solo.indexOf(d[nesting[i]]) > -1){
            return true;
          }
        }
        
        return false;
      })
      
      // sort nodes so that smallest are always on top
      nested_data.sort(function(node_a, node_b){
        return node_b[value_var] - node_a[value_var];
      })
      
      var nodes = d3.select("g.viz")
        .selectAll("g.circle")
        .data(nested_data, function(d){ return d.name; })
      
      var nodes_enter = nodes.enter().append("g")
        .attr("opacity", 0)
        .attr("class", "circle")
        .attr("transform", function(d) { return "translate("+x_scale(d[xaxis_var])+","+y_scale(d[yaxis_var])+")" } )
        .on(vizwhiz.evt.over, hover(x_scale, y_scale, size_scale, size))
        .on(vizwhiz.evt.out, function(){
          vizwhiz.tooltip.remove();
          d3.selectAll(".axis_hover").remove();
        })
      
      nodes_enter
        .append("circle")
        .style('stroke', function(d){ return d.color })
        .style('stroke-width', 3)
        .style('fill', function(d){ return d.color })
        .style("fill-opacity", function(d) {
          return d.active ? 0.75 : 0.25;
        })
        .attr("r", function(d){ 
          return size_scale(d[value_var]);
        })

      nodes_enter
        .append("path")
        .style('fill', function(d){ return d.color })
        .style("fill-opacity", 1)
      
      // update
      nodes.transition().duration(vizwhiz.timing)
        .attr("transform", function(d) { return "translate("+x_scale(d[xaxis_var])+","+y_scale(d[yaxis_var])+")" } )
        .attr("opacity", 1)
      
      nodes.selectAll("circle")
        .style('fill', function(d){ return d.color })
        .attr("r", function(d){ 
          return size_scale(d[value_var]);
        })
      
      nodes.selectAll("path")
        .attr("d", function(d){
          var angle = 0, radius = 0;
          if(d.num_children){
            angle = (((d.num_children_active / d.num_children)*360) * (Math.PI/180));
            radius = size_scale(d[value_var]);
          }
          return arc.endAngle(angle).outerRadius(radius)(d);
        })
      
      // exit
      nodes.exit()
        .transition().duration(vizwhiz.timing)
        .attr("opacity", 0)
        .remove()
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // TICKS
      //-------------------------------------------------------------------
      
      var ticks = d3.select("g.viz")
        .selectAll("g.ticks")
        .data(nested_data, function(d){ return d.name; })
      
      var ticks_enter = ticks.enter().append("g")
        .attr("class", "ticks")
      
      // y ticks
      // ENTER
      ticks_enter.append("line")
        .attr("class", "yticks")
        .attr("x1", -10)
        .attr("x2", 0)
        .attr("stroke", function(d){
          return d.color;
        })
        .attr("stroke-width", stroke/2)
      
      // UPDATE      
      ticks.selectAll(".yticks")
        .attr("y1", function(d){
          return y_scale(d[yaxis_var])
        })
        .attr("y2", function(d){
          return y_scale(d[yaxis_var])
        })
      
      // x ticks
      // ENTER
      ticks_enter.append("line")
        .attr("class", "xticks")
        .attr("stroke", function(d){
          return d.color;
        })
        .attr("stroke-width", stroke/2)
      
      // UPDATE
      ticks.selectAll(".xticks")
        .attr("y1", size.height)
        .attr("y2", size.height + 10)      
        .attr("x1", function(d){
          return x_scale(d[xaxis_var])
        })
        .attr("x2", function(d){
          return x_scale(d[xaxis_var])
        })
      
      // EXIT (needed for when things are filtered/soloed)
      ticks.exit().remove()
      
      //===================================================================
      
    });

    return chart;
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Hover over nodes
  //-------------------------------------------------------------------
  
  function hover(x_scale, y_scale, size_scale, xsize){

      return function(d){
        
        var radius = size_scale(d[value_var]),
            x = x_scale(d[xaxis_var]),
            y = y_scale(d[yaxis_var]),
            color = d.color,
            viz = d3.select("g.viz"),
            tooltip_data = {};
      
        tooltip_info.forEach(function(t){
          if (d[t]) tooltip_data[t] = d[t]
        })
      
        vizwhiz.tooltip.create({
          "parent": viz,
          "id": d.id,
          "data": tooltip_data,
          "title": d[text_var],
          "x": x,
          "y": y,
          "offset": radius,
          "arrow": true
        })
      
        // vertical line to x-axis
        viz.append("line")
          .attr("class", "axis_hover")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", y+radius+stroke) // offset so hover doens't flicker
          .attr("y2", xsize.height)
          .attr("stroke", color)
          .attr("stroke-width", stroke)
      
        // horizontal line to y-axis
        viz.append("line")
          .attr("class", "axis_hover")
          .attr("x1", 0)
          .attr("x2", x-radius) // offset so hover doens't flicker
          .attr("y1", y)
          .attr("y2", y)
          .attr("stroke", color)
          .attr("stroke-width", stroke)
      
        // x-axis value box
        viz.append("rect")
          .attr("class", "axis_hover")
          .attr("x", x-25)
          .attr("y", size.height)
          .attr("width", 50)
          .attr("height", 20)
          .attr("fill", "white")
          .attr("stroke", color)
          .attr("stroke-width", stroke)
      
        // xvalue text element
        viz.append("text")
          .attr("class", "axis_hover")
          .attr("x", x)
          .attr("y", size.height)
          .attr("dy", 14)
          .attr("text-anchor","middle")
          .style("font-weight","bold")
          .attr("font-size","12px")
          .attr("font-family","Helvetica")
          .attr("fill","#4c4c4c")
          .text(vizwhiz.utils.format_num(d[xaxis_var], false, 3, true))
      
        // y-axis value box
        viz.append("rect")
          .attr("class", "axis_hover")
          .attr("x", -50)
          .attr("y", y-10)
          .attr("width", 50)
          .attr("height", 20)
          .attr("fill", "white")
          .attr("stroke", color)
          .attr("stroke-width", stroke)
      
        // xvalue text element
        viz.append("text")
          .attr("class", "axis_hover")
          .attr("x", -25)
          .attr("y", y-10)
          .attr("dy", 14)
          .attr("text-anchor","middle")
          .style("font-weight","bold")
          .attr("font-size","12px")
          .attr("font-family","Helvetica")
          .attr("fill","#4c4c4c")
          .text(vizwhiz.utils.format_num(d[yaxis_var], false, 3, true))
      }
  }
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // X & Y Axis formatting help
  //-------------------------------------------------------------------
  
  var x_axis = d3.svg.axis()
    .tickSize(0)
    .tickPadding(25)
    .orient('bottom')
    .tickFormat(function(d, i) {
      d3.select(this)
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
      // background line
      d3.select(this.parentNode).append("line")
        .attr("class","x_bg_line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0+stroke)
        .attr("y2", -size.height-stroke)
        .attr("stroke", "#ccc")
        .attr("stroke-width",stroke/2)
      // tick
      d3.select(this.parentNode).append("line")
        .attr("class","tick_line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 1)
        .attr("y2", 20)
        .attr("stroke", "#000")
        .attr("stroke-width", stroke)
      return d
    });
  
  var y_axis = d3.svg.axis()
    .tickSize(0)
    .tickPadding(25)
    .orient('left')
    .tickFormat(function(d, i) {
      d3.select(this)
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
      // background line
      d3.select(this.parentNode).append("line")
        .attr("class","y_bg_line")
        .attr("x1", 0+stroke)
        .attr("x2", 0+size.width-stroke)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#ccc")
        .attr("stroke-width",stroke/2)
      // tick
      d3.select(this.parentNode).append("line")
        .attr("class","tick_line")
        .attr("x1", -20)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#4c4c4c")
        .attr("stroke-width",stroke)
      // return parseFloat(d.toFixed(3))
      return vizwhiz.utils.format_num(d, false, 3, true)
    });

  //===================================================================

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
  
  chart.xaxis_var = function(x) {
    if (!arguments.length) return xaxis_var;
    xaxis_var = x;
    return chart;
  };
  
  chart.yaxis_var = function(x) {
    if (!arguments.length) return yaxis_var;
    yaxis_var = x;
    return chart;
  };
  
  chart.nesting = function(x) {
    if (!arguments.length) return nesting;
    nesting = x;
    return chart;
  };

  chart.tooltip_info = function(x) {
    if (!arguments.length) return tooltip_info;
    tooltip_info = x;
    return chart;
  };

  chart.filter = function(x) {
    if (!arguments.length) return filter;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      filter = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
      }
      // if element is in the solo array remove it and add to this one
      else if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
        filter.push(x)
      }
      // element not in current filter so add it
      else {
        filter.push(x)
      }
    }
    return chart;
  };
  
  chart.solo = function(x) {
    if (!arguments.length) return solo;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      solo = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(solo.indexOf(x) > -1){
        solo.splice(solo.indexOf(x), 1)
      }
      // if element is in the filter array remove it and add to this one
      else if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
        solo.push(x)
      }
      // element not in current filter so add it
      else {
        solo.push(x)
      }
    }
    return chart;
  };

  chart.margin = function(x) {
    if (!arguments.length) return margin;
    margin.top    = typeof x.top    != 'undefined' ? x.top    : margin.top;
    margin.right  = typeof x.right  != 'undefined' ? x.right  : margin.right;
    margin.bottom = typeof x.bottom != 'undefined' ? x.bottom : margin.bottom;
    margin.left   = typeof x.left   != 'undefined' ? x.left   : margin.left;
    size.width    = width-margin.left-margin.right;
    size.height   = height-margin.top-margin.bottom;
    size.x        = margin.left;
    size.y        = margin.top;
    return chart;
  };

  //===================================================================

  return chart;
};
})();