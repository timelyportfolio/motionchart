function motionChart(gdata, params){

  // Various accessors that specify the four dimensions of data to visualize.
  function x(d) { return d[params.x]; }
  function y(d) { return d[params.y]; }
  function radius(d) { return d[params.size]; }
  function color(d) { return d[params.color]; }
  function key(d) { return d[params.key]; }

  // Chart dimensions.
  var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5},
      width = 960 - margin.right,
      height = 500 - margin.top - margin.bottom;

  // Various scales. These domains make assumptions of data, naturally.
  var xScale = d3.scale.log().domain(params.xrange).range([0, width]),
      yScale = d3.scale.linear().domain(params.yrange).range([height, 0]),
      radiusScale = d3.scale.sqrt().domain(params.srange).range(params.rrange),
      colorScale = d3.scale.category10();

  // The x & y axes.
  var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
      yAxis = d3.svg.axis().scale(yScale).orient("left");
      
  // Create the SVG container and set the origin.
  var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      

  // Add the x-axis.
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  // Add the y-axis.
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  // Add an x-axis label.
  svg.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height - 6)
      .text(params.x);

  // Add a y-axis label.
  svg.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("y", 6)
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .text(params.y);

  // Add the year label; the value is set on transition.
  var label = svg.append("text")
      .attr("class", "year label")
      .attr("text-anchor", "end")
      .attr("y", height - 24)
      .attr("x", width)
      .text(params.yearRange[0]);

    var data = transform_data(gdata, params)
    // console.log(data)
    // A bisector since many nation's data is sparsely-defined.
    var bisect = d3.bisector(function(d) { return d[0]; });

     var tip = d3.tip()
      .attr('class', 'd3-tip')
      .html(function(d) { return "check"});

    svg.call(tip)

    // Add a dot per nation. Initialize the data at 1800, and set the colors.
    var dot = svg.append("g")
        .attr("class", "dots")
      .selectAll(".dot")
        .data(interpolateData(params.yearRange[0]))
      .enter().append("circle")
        .attr("class", "dot")
        .style("fill", function(d) { return colorScale(color(d)); })
        .call(position)
        .sort(order);

    // Add a title.
    dot.append("title")
        .text(function(d) { return d[params.key]; });

    // Add an overlay for the year label.
    var box = label.node().getBBox();

    var overlay = svg.append("rect")
          .attr("class", "overlay")
          .attr("x", box.x)
          .attr("y", box.y)
          .attr("width", box.width)
          .attr("height", box.height)
          .on("mouseover", enableInteraction);

    // Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(30000)
        .ease("linear")
        .tween("year", tweenYear)
        .each("end", enableInteraction);

    // Positions the dots based on data.
    function position(dot) {
      dot .attr("cx", function(d) { return xScale(x(d)); })
          .attr("cy", function(d) { return yScale(y(d)); })
          .attr("r", function(d) { return radiusScale(radius(d)); });
    }

    // Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
      return radius(b) - radius(a);
    }

    // After the transition finishes, you can mouseover to change the year.
    function enableInteraction() {
      var yearScale = d3.scale.linear()
          .domain(params.yearRange)
          .range([box.x + 10, box.x + box.width - 10])
          .clamp(true);

      // Cancel the current transition, if any.
      svg.transition().duration(0);

      overlay
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove)
          .on("touchmove", mousemove);

      function mouseover() {
        label.classed("active", true);
      }

      function mouseout() {
        label.classed("active", false);
      }

      function mousemove() {
        displayYear(yearScale.invert(d3.mouse(this)[0]));
      }
    }

    // Tweens the entire chart by first tweening the year, and then the data.
    // For the interpolated data, the dots and label are redrawn.
    function tweenYear() {
      var year = d3.interpolateNumber(params.yearRange[0], params.yearRange[1]);
      return function(t) { displayYear(year(t)); };
    }

    // Updates the display to show the specified year.
    function displayYear(year) {
      dot.data(interpolateData(year), key).call(position).sort(order);
      label.text(Math.round(year));
    }

    // Interpolates the dataset for the given (fractional) year.
    function interpolateData(year) {
          return data.map(function (d) {
              var tmp={}
              tmp[params.key]= d[params.key],
              tmp[params.color]= d[params.color]
              tmp[params.x]= interpolateValues(d[params.x], year)
              tmp[params.size]= interpolateValues(d[params.size], year)
              tmp[params.y]= interpolateValues(d[params.y], year)
              return tmp;
          });
    }

    // Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
      var i = bisect.left(values, year, 0, values.length - 1),
          a = values[i];
      if (i > 0) {
        var b = values[i - 1],
            t = (year - a[0]) / (b[0] - a[0]);
        return a[1] * (1 - t) + b[1] * t;
      }
      return a[1];
    }
    function zip_and_sort(d, year, v) {
      var tmp;
      tmp = _.zip(_.pluck(d, year), _.map(_.pluck(d, v), Number));
      return _.sortBy(tmp, function(y) {
        return y[0];
      });
    };

   function transform_data(data, params) {
      return _.chain(data).groupBy(function(d) {
        return d[params.key];
      }).map(function(d, k) {
          tmp = {}
          tmp[params.key] = k
          tmp[params.color] =  d[0][params.color]
          tmp[params.x] = zip_and_sort(d, params.year, params.x)
          tmp[params.y] =  zip_and_sort(d, params.year, params.y)
          tmp[params.size] = zip_and_sort(d, params.year, params.size)
          return tmp;
      }).value();
    };
}