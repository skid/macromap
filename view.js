/** 
IDEA: Make a keyboard interface for adding units.
For example, you drag the clockline and depending on which unit is selected you can hit a button as a shortcut
let's say Base1 is selected. You set the clock to the nearest available free time, and you hit "S" to build an
SCV. Or E, to launch a mule.
**/

/**
 * Requires Raphael.js
 */
var Macromap = (function( Macromap ){
// References to Macromap objects in other files
var M = Macromap.M, U = Macromap.Unit;

// Some visual styles
var unit_height = 30; // Height of one unit line in pixels
var svg_background_color = "#333";

var stroke_width = 5;
var hover_stroke_width = 7;
var dot_radius = 4;
var hover_dot_radius = 5;
var stroke_color       = "#fff";
var background_color   = "#333";
var font_family  = "Helvetica";

var clockline_attrs = { 'stroke': 'hsb(0, 0, .1)', 'stroke-width': 1 };
var unit_line_attrs = { 'stroke': 'hsb(0, 0, .2)', 'stroke-width': 25 };
var unit_iline_attrs = { 'stroke': 'hsb(0, 0, .12)', 'stroke-width': 5 };
var selected_unit_line_attrs = { 'stroke': 'hsb(0, 0, .15)', 'stroke-width': 30 };
var dot_attrs = { 'fill': '#333', 'stroke': '#fff', 'stroke-width': 2, 'cursor': 'pointer', 'r':4 };
var hover_dot_attrs = {r: 5, fill: '#fff'}
var action_text_attrs = {
    'font-size': 14, 
    'font-family': font_family, 
    'fill': "#aaa", 
    'text-anchor': 'start', 
    'cursor': 'pointer' };

// Globals
var Zoom = 4 * 5 / 6;
var mouse_down, clockline_offset, timestrip_step;
var action_path_dummy = { attr: function(){}, source_action:{}, node:null };

// HTML Elements
var Main;
var Wrapper;
var Container;
var Canvas;
var Clockline;
var Timestrip;
var Buttons;
var Toolbar;
var StatsClock;
var StatsMinerals;
var StatsGas;
var StatsSupply;
var StatsEconomy;
var StatsArmy;
var StatsTech;
var StatsBuildings;
var Tooltip;
var Widget;

// Other Globals
var TooltipTimeout, TooltipTimeoutValue = 200; // Delay hiding of tooltip, so we can mouseover it.
var MInstance; // The currently used instance of M.
var InvisibleUnits = [];

// The current selected unit; Available in all closures;
var SelectedUnits = [];
function unselectSingleUnit( unit ){
    for( var i = SelectedUnits.length-1; i>=0; i--)
        if( SelectedUnits[i] === unit ) {
            SelectedUnits.splice(i, 1);
            break;
        }
    unit.selected = false;
    unit.vButton.get(0).className = "mm_button";
    unit.vLine.attr( unit_line_attrs );
    return unit;
}
function selectUnit( unit ){
    if( SelectedUnits.length && SelectedUnits[0].go !== unit.go )
        return false; // Can't select units of dirrefent type;
    SelectedUnits.push( unit );
    unit.selected = true;
    unit.vButton.get(0).className = "mm_button selected";
    unit.vLine.attr( selected_unit_line_attrs );
    return unit;
}
function unselectAllUnits( ){
    for( var i = SelectedUnits.length-1; i>=0; i--){
        var unit = SelectedUnits[i];
        unit.selected = false;
        unit.vButton.get(0).className = "mm_button";
        unit.vLine.attr( unit_line_attrs );    
    }
    SelectedUnits = [];
}


// Some global functions cocnected to the HTML Widget

// Scaffolding. Makes a dropdown out of a list. To be made obsolete when icons arrive.
function makeSelect( list, id ){
    if( !list.length )
        return "";
    var sel = ["<span> - </span><select id='", id, "'>"];
    for( var i = 0, j = list.length; i < j; i++ )
        sel.push( "<option value='", list[i], "'>", list[i], "</option>" );
    sel.push("</select>");
    return sel.join("");
}

// Scaffolding. Rewrite to use icons instead of dropdowns
window.MMChooseUnitAttrs = function(select){
    select = $( select );
    var unit_id = select.val(), su = SelectedUnits[0];

    if( unit_id === MInstance.race.getBase().id ){
        select.parent().siblings(".mm_extra").html(
            [ "Mineral Fields", makeSelect([4,5,6,7,8,9,10,11,12,13,14,15,16], 'mm_mineral_fields'),
              "<label><input id='mm_rich_minerals' type='checkbox' value='1' /> Rich</label>" ].join(""));
    }
    else{
        select.parent().siblings(".mm_extra").html("");
    }
}

// Scaffolding. Rewrite to use icons instead of dropdowns
window.MMChooseAction = function( select ){
    select = $( select );
    var action_name = select.val(), su = SelectedUnits[0];
    
    select.siblings().remove();
    
    if( action_name === 'Build' || action_name === 'Morph' ){
        select.after( makeSelect( su.getProxy().go.actions[ action_name ], 'mm_new_product' ) );
    }
    else if( action_name === 'Land' ){
        var addons = [{ id: "None" }];
        try{
            $.merge( addons, MInstance.searchUnits("Reactor", true) );
        } catch ( e ){
            if( e.name !== 'NotFoundError' )
                throw e;
        }
        try{
            $.merge( addons, MInstance.searchUnits("TechLab", true) );
        } catch ( e ){
            if( e.name !== 'NotFoundError' )
                throw e;
        }
        select.after( makeSelect( $.map(addons, function(e){ return e.id; }), 'mm_new_product' ) );
    }
    else if( action_name === 'Minerals' ||  action_name === 'Gas'){
        var facilities = MInstance.getFacilities();
        select.after(makeSelect( facilities[action_name], 'mm_new_facility' ));
    }
    
    $("#mm_new_product").change(function(){
        MMChooseUnitAttrs(this);
    })
    select.parent().siblings(".mm_extra").html("");
    $("#mm_new_product, #mm_new_facility").change();
};

function play( i ){
    i = i || 1;
    try { // Execute the last i events and see what happens.
        MInstance.play().empty().draw();
        Widget.hide();
        Tooltip.hide();
    } catch (e) {
        if( e.name === 'MacroMapError' ){
            while( i ){ // if there's an error, unregister the last i events (which were added simultaneously)
                MInstance.unregisterLastEvent();
                i--;
            }
            MInstance.play().empty().draw();
            alert( e.message );
        }
        else throw e;
    }
}

// Removes an action. It works by registering an additional move
// whose owner is "RemoveAction", and a unique action signature.
// When playing the moves, all actions with this signature will be skipped.
// This allows us to undo the removal of the action by just deleting the
// "RemoveAction" event from the sequence.
window.MMRemoveAction = function( remove_action_signature ){
    if( typeof remove_action_signature === "string" ) {
        MInstance.registerEvent( "RemoveAction", remove_action_signature )
    }
    play();
}

// Executed when the user confirms the new action i.e. clicks the OK button
window.MMExecuteAction = function( ){
    var action = $('#mm_new_action').val(), su = SelectedUnits[0],
        extra1, extra2, extra3;
    
    if( action === "Build" || action === "Morph" ) {
        extra1 = $("#mm_new_product").val();
        if( extra1 === 'CommandCenter' ) {
            extra2 = parseInt($('#mm_mineral_fields').val(), 10);
            extra3 = !!$('#mm_rich_minerals:checked').val();
        }
    }
    else if( action === "Minerals" || action === "Gas" ){
        extra1 = $("#mm_new_facility").val();
    }
    else if( action === "Land" ){
        extra1 = $("#mm_new_product").val();
    }
    for( var i=0, j=SelectedUnits.length; i < j; i++) {
        MInstance.registerEvent( SelectedUnits[i].id, MInstance.clock, action, extra1, extra2, extra3 );
    }
    play( i );
};

// Shows the main control widget that executes stuff for selected units.
function showWidget( e ){
    if( !SelectedUnits.length )
        return;

    for( var i = SelectedUnits.length - 1; i > 0; --i )
        if( SelectedUnits[i].go !== SelectedUnits[i-1].go )
            return alert("You somehow managed to select different units.\nNo soup for you!");
        
    var actions = ["<select id='mm_new_action' onchange='MMChooseAction(this);'>"], 
        action, su = SelectedUnits[0];
    
    var available = su.getProxy().go.actions;
    if( $.isEmptyObject( available ) )
        return;

    for( action in available ){
        if( action === "Gas" && !su.M.getFacilities().Gas.length )
            continue;
        actions.push( "<option value='", action, "'>", action, "</option>" );
    }
    actions.push("</select>");

    Widget.html( [
        "<div id='mm_widget_bg'></div>",
        "<div id='mm_widget_cont'>",
            "<span class='mm_widget_title'>", 
                su.display_name ," at ", su.M.clock.fmtTime(),
            "</span>",
            "<span>", actions.join("") ,"</span>",
            "<span class='mm_extra'></span>",
            "<span>&nbsp;</span>",
            "<span style='text-align:right'>",
                "<input onclick='javascript:MMExecuteAction();' type='button' value='OK' id='mm_do_action' />", 
                "<input type='button' onclick='javascript:$(\"#mm_widget\").hide();' value='Close' />", 
            "</span>",
        "</div>"
    ].join("") );
    Widget.show().css({left: (e.pageX + 5)+"px", top: (e.pageY + 5)+"px"}).show();
    
    $("#mm_new_action", Widget).change();
    $("#mm_do_action", Widget).focus();
}

M.prototype.init = function(){
    Main            = this.main;
    Wrapper         = $(".mm_wrapper", this.main);
    Container       = $(".mm_container", this.main);
    Timestrip       = $(".mm_timestrip", this.main);
    Buttons         = $(".mm_buttons", this.main);
    Toolbar         = $(".mm_toolbar", this.main);
    Stats           = $(".mm_stats", this.main);
    StatsClock      = $(".mm_clock", this.main);
    StatsMinerals   = $(".mm_minerals", this.main);
    StatsGas        = $(".mm_gas", this.main);
    StatsSupply     = $(".mm_supply", this.main);
    StatsEconomy    = $(".mm_economy", this.main);
    StatsArmy       = $(".mm_army", this.main);
    StatsTech       = $(".mm_tech", this.main);
    StatsBuildings  = $(".mm_buildings", this.main);
    Tooltip         = $("#mm_tooltip");
    Widget          = $("#mm_widget");
    
    clockline_offset = 0; // Where is the clockline positioned at start
    timestrip_step = 10;  // Put markers at how many seconds
    mouse_down = 0;       // Mouse is not pressed over Timestrip
    
    Tooltip.hover(function(){
        clearTimeout(TooltipTimout);
    }, function(){
        TooltipTimout = setTimeout( function(){ Tooltip.hide(); }, TooltipTimeoutValue );
    });
    $('#mm_do_stuff').click(function(e){ showWidget( e ); });
    $('#mm_undo').click(function(e){ 
        MInstance.unregisterLastEvent().play().empty().draw();
    });
    $("#mm_show").click(function(e){
        InvisibleUnits = [];
        MInstance.play().empty().draw();
        $(this).html("").hide();
    });
    $('#mm_hide').click(function(e){ 
        for( var i = SelectedUnits.length - 1; i >= 0; --i )
            InvisibleUnits.push( SelectedUnits[i].id );
        unselectAllUnits();
        $("#mm_show").html("Show " + InvisibleUnits.length + " hidden units").show();
        MInstance.play().empty().draw();
    });
    return this;
};

// Draws all units and their timelines on the canvas
M.prototype.draw = function(){
    var rendered_units = this.getRenderedUnits();
    var Width  = this.max_time * Zoom;
    var Height = rendered_units.length * (unit_height + 1) + unit_height;
    var that = this;
    
    Container.width( Width );
    Container.height( Height );
    Timestrip.width( Width );
    
    Canvas = Raphael( Container[0], Width, Height );
    Canvas.rect( 0, 0, Width, Height ).attr({'fill':svg_background_color, 'stroke':'none'});
    
    // Draws the timestrip
    var html = [], cls, lab;
    for ( var i = 0, z = 0; i < this.max_time; i+=timestrip_step, z=i*Zoom ) {
        if( i % 60 ){ lab = i % 60; cls = 'sec'; } else { lab = i / 60; cls = 'min'; }
        html.push("<div style='margin-left:", z, "px;'><div class='", cls ,"'>", lab, "</div></div>");
    }
    Timestrip.html( html.join("") );
    Timestrip.mousemove(function(e){mouse_down && that.setClockline( pos = e.pageX - Timestrip.offset().left );});
    Timestrip.mousedown(function(e){mouse_down = 1;});
    Timestrip.mouseup(function(e){
        that.setClockline( e.pageX - Timestrip.offset().left );
        Widget.hide();
        mouse_down = 0;
    });
    
    this.refreshStats();
    
    for( i=0, voffset = -1; i < rendered_units.length; i++ ) {
        voffset += unit_height;
        rendered_units[i].draw( voffset );
    }
    Clockline = Canvas.path( ["M", clockline_offset, " ", 0, "L", clockline_offset, " ", Height].join("") )
                      .attr( clockline_attrs )
                      .toFront();
    
    // Reselect previously selected units. They are entirely new objects now so you can't compare.
    for( i = SelectedUnits.length - 1; i >= 0; --i )
        selectUnit( this.getUnit( unselectSingleUnit( SelectedUnits[i] ).id ) );

    return this;
};

M.prototype.empty = function() {
    Timestrip.empty().unbind();
    Buttons.children().unbind().remove();
    $(Canvas.canvas).remove();
    return this;
};

// Returns a list of all units that are visible on the SVG surface
M.prototype.getRenderedUnits = function(){ 
    return $.grep( this.units, function(el, i){ 
        return el.renders && $.inArray(el.id, InvisibleUnits) === -1;
    });
}

M.prototype.setClockline = function( pos ){
    Clockline.translate( pos - clockline_offset, 0 ).toFront();
    clockline_offset = pos;
    this.clock = Math.round( pos / Zoom );
    this.refreshStats();
};

// Initializes the statistics panel
M.prototype.refreshStats = function(){
    StatsClock.html( this.clock.fmtTime() );
    
    var st = this.getState();
    StatsMinerals.html( st.minerals );
    StatsGas.html( st.gas );
    StatsSupply.html( [st.supply, st.supply_max].join("/") );
    
    // IDEA: Optimize the HTML rendering
    var wl = {"economy": StatsEconomy, "army": StatsArmy, "tech": StatsTech, "buildings": StatsBuildings};
    for( var word in wl ){
        var html = "<h3>" + word + "</h3>";
        if( st[word] )
            for( var i in st[word] )
                html += [ "<div class='mm_stat'><span class='key'>", this.race[i].short_name, 
                          "</span><span class='value'>", st[word][i], "</span></div>" ].join("");
        wl[word].html(html);
    }
};

// Draws the timeline of a unit
U.prototype.draw = function( voffset ){
    var that = this, dot, i, j, c = Canvas;
    var x1 = this.start * Zoom, y1 = voffset;
    var x2 = this.M.max_time * Zoom, y2 = voffset;
    
    this.vLine     = c.path("M" + 0 + " " + (y1-5) + "L" + x2 +" " + (y2-5)).attr( unit_line_attrs );
    this.vIdleLine = c.path("M" + x1 + " " + y1 + "L" + x2 +" " + y2).attr( unit_iline_attrs );
    this.vButton   = $(["<div id='", this.id, "' class='mm_button'>", this.display_name ,"</div>"].join(""));
        
    Buttons.append( this.vButton.click(function(e){
        MInstance = that.M;
        if( e.metaKey ){ !that.selected ? selectUnit( that ) : unselectSingleUnit( that ); }
        else {
            if( !that.selected || SelectedUnits.length > 1 ) {
                unselectAllUnits();
                selectUnit( that );
            } else {
                unselectAllUnits( );
            }
        }
    }));
    
    var event_times = getSortedKeys( this.actions );
    for( i=0, j = event_times.length; i < j; ) {
        var time = event_times[ i++ ],
            action = this.actions[ time ][ 0 ],
            name = action.duration ? action.short_name : "";
        x1 = time * Zoom;
        x2 = x1 + action.duration * Zoom;
        
        var label = c.text( x1 + 5.5, y1-8.5, name ).attr( action_text_attrs );
        var action_path = action_path_dummy;
        if( action.duration ){  // no action_paths for zero-length actions
            action_path = c.path( "M"+x1+" "+y1+"L"+x2+" "+y1 )
                           .attr( {"stroke": action.color, "stroke-width": stroke_width} );

            // Introducing actions to their action paths and dots
            action.vActionPath = action_path;
            action_path.source_action = action;
        }
        dot = c.circle( x1 , y1, dot_radius ).attr( dot_attrs ).toFront();
        action.vDot = dot;       
        dot.source_action = action;
        
        // Closure to retain references to the label, dot and action_path on each iteration.
        (function( dot, label, action_path, unit ){
            $( dot.node ).add( action_path.node )
            .dblclick(function(e){
                MInstance = that.M;
                MInstance.setClockline( e.pageX - Timestrip.offset().left );
                unselectAllUnits();
                selectUnit( that );
                showWidget( e );
            }).add( label.node )
            .hover(function( e ){
                MInstance = that.M;
                dot.attr( hover_dot_attrs ).toFront();
                action_path.attr('stroke-width', hover_stroke_width );
                if( action_path.source_action.sprout ) // highlight units produced by this action
                    action_path.source_action.sprout.highlight(true);
            }, function( e ){
                dot.attr( dot_attrs );
                action_path.attr('stroke-width', stroke_width );
                if( action_path.source_action.sprout ) // unhighlight units produced by this action
                    action_path.source_action.sprout.highlight(false);
            });
            $( dot.node ).hover(function(e){
                MInstance = that.M;
                if( Widget.css("display") !== "none" )
                    return true;
                Tooltip.html( dot.source_action.getTooltipHTML() );
                Tooltip.css({left: (e.pageX + 10)+"px", top: (e.pageY + 10)+"px"}).show();
                if( typeof TooltipTimout !== 'undefined' )
                    clearTimeout( TooltipTimout );
            }, function(){
                TooltipTimout = setTimeout( function(){ Tooltip.hide(); }, TooltipTimeoutValue );
            });            
        }( dot, label, action_path, that ));
    }
    $( this.vLine.node ).add( $(this.vIdleLine.node) ).dblclick(function(e){
        MInstance = that.M;
        MInstance.setClockline( e.pageX - Timestrip.offset().left );
        unselectAllUnits();
        selectUnit( that );
        showWidget( e );
    });
};

U.prototype.highlight = function( mode ){
    // Highlights or unhighlits the entire unit's representation on the canvas
    var sw, radius, fill;
    if( mode ){
        sw = hover_stroke_width;
        radius = hover_dot_radius;
        fill = stroke_color;
        this.vLine && this.vLine.attr( selected_unit_line_attrs );
    } else {
        sw = stroke_width;
        radius = dot_radius;
        fill = background_color;
        this.selected || this.vLine && this.vLine.attr( unit_line_attrs );
    }
    var i, e, ev;
    for( e in this.actions ) {
        ev = this.actions[e];
        for( i = ev.length - 1; i >= 0; --i ){
            ev[i].vActionPath.attr( 'stroke-width', sw );
            ev[i].vDot.attr( { r: radius, fill: fill } );
        }
    }
};

return Macromap;
}( Macromap || {} ));