# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/

# Use d3.js as JavaScript library for manipulating documents based on data.
# Further information is available at
# https://github.com/mbostock/d3/wiki
class LangsStatDrawer
  constructor: (@width = 800, @height = 500) ->
    @maxRadius = Math.min(this.width, this.height) / 2
    @centerCircleSize = 60

    svg = d3.select('.langs-stat')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)

    @g = svg.append('g')
      .attr('transform', "translate(
        #{this.width / 2 - 100},
        #{this.height / 2})
      ")

    @labels = svg.append('g')
      .attr('class', 'labels')
      .attr('transform', "translate(
        #{this.width - 200},
        #{50})
      ")

    # --- used functions ---

    @theta = d3.scale.linear()
          .range([0, 2 * Math.PI])

    @radius = d3.scale.linear()
          .range([0, @maxRadius])

    @arc = d3.svg.arc()
        .startAngle((d) =>
          return Math.max(0, Math.min(2 * Math.PI, this.theta(d.x)));
        )
        .endAngle((d) =>
          return Math.max(0, Math.min(2 * Math.PI, this.theta(d.x + d.dx)));
        )
        .innerRadius((d) =>
          return Math.max(0, this.radius(d.y)) + 0.3;
        )
        .outerRadius((d) =>
          return Math.max(0, this.radius(d.y + d.dy)) - 0.3;
        )

    @allPath = {}


  draw: ->
    deferredRequireJSON = $.getJSON('stat.json', $.noop)
    deferredRequireJSON.done((stats) =>
      # Use d3.layout.partition
      # Further information is available at
      # https://github.com/mbostock/d3/wiki/Partition-Layout#partition

      hierarchy = {
        name: 'All Languages',
        children: [],
      };

      _(stats).each (stat, lang) =>
          hierarchy.children.push({
              name: lang,
              children: stat
          })

      partition = d3.layout.partition()
        .children((d) =>
          # return Array.isArray(d.children) ? d.children : null
          if Array.isArray(d.children)
            d.children
          else
            null
        )
        .value((d) => d.loc)

      color = (d) =>
        colors = ''
        if !d.parent
          colors = d3.scale.category10()
          d.color = '#fff'

        if d.parent && d.children
          startColor = d3.hcl(d.color)
              .darker();
          endColor = d3.hcl(d.color)
              .brighter();
          colors = d3.scale.linear()
              .interpolate(d3.interpolateHcl)
              .range([startColor.toString(), endColor.toString()])
              .domain([0, d.children.length+1]);

        if d.children
          d.children.map((child, i) =>
              return { value: child.loc, idx: i }
          ).sort((a, b) =>
              return b.loc - a.loc
          ).forEach((child, i) =>
              d.children[child.idx].color = colors(i)
          )

        return d.color

      this.allPath = @g.selectAll('path')
          .data(partition.nodes(hierarchy))
        .enter().append('path')
          .attr('d', this.arc)
          .attr('fill', color);

      this.updateLabels(hierarchy);

      # --- set on-click event handler ---

      center = @g.append('text')
          .attr('class', 'stat-center')
          .style('text-anchor', 'middle')
          .style('pointer-events', 'none')
          .text('All Languages')

      this.allPath.on('mouseover', (d) ->
          d3.select(this).style('opacity', '0.8')
        )
        .on('mouseout', (d) ->
          d3.select(this).style('opacity', '1')
        )
        .on('click', this.zoomIn)
    )

  zoomIn: (datum) =>
    return if !datum.children

    this.allPath.transition()
        .duration(750)
        .attrTween('d', this.arcTween(datum));

    # set labels
    center = @g.select('.stat-center')
        .text(datum.name)

    this.updateLabels(datum)

  arcTween: (datum) =>
      thetaDomain  = d3.interpolate(@theta.domain(),
          [datum.x, datum.x + datum.dx]);
      radiusDomain = d3.interpolate(@radius.domain(),
          [datum.y, 1]);

      minRadius = if datum.y then @centerCircleSize else 0
      radiusRange = d3.interpolate(@radius.range(),
          [minRadius, @maxRadius]);

      return calculateNewPath = (d, i) =>
          if i != 0
            return interpolatePathForRoot = (time) =>
              return this.arc(d);
          else
            return interpolatePathForNonRoot = (time) =>
              @theta.domain(thetaDomain(time));
              @radius.domain(radiusDomain(time)).range(radiusRange(time));
              return this.arc(d);


  # update labels
  updateLabels: (d) ->
    dataset = d.children

    d3.select('svg g.labels').selectAll('rect').remove()
    d3.select('svg g.labels').selectAll('text').remove()

    d3.select('svg g.labels').selectAll('rect')
      .data(dataset)
      .enter().append('rect')
      .attr('x', -20)
      .attr('y', (d, i) =>
          return i * 30 - 15
      )
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d) =>
          return d.color
      )

    d3.select('svg g.labels').selectAll('text')
      .data(dataset)
      .enter()
      .append('a')
      .attr('xlink:href', (d) =>
          return d.url
      )
      .append('text')
      .attr('y', (d, i) =>
          return i * 30
      )
      .text((d) =>
          name = d.name.replace(/^.*\//, '')
          return name
      )


# $(document).ready(() ->
#   if $('.langs-stat').length
#     drawer = new LangsStatDrawer(800, 500)
#     drawer.draw()
# )
