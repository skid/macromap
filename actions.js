var Macromap = (function(Macromap){

function getTooltipHTML(){
    return [
        "<div id='mm_tooltip_bg'></div>",
        "<div id='mm_tooltip_cont'>",
            "<span class='mm_tooltip_title'>", 
                this.display_name , 
                " <a class='mm_tooltip_link' href='javascript:;'", 
                " onclick='MMRemoveAction(\"",this.signature,"\");'>[remove]</a>",
            "</span>",
            "<span>",
                "<strong>", (this.time).fmtTime(), "</strong> to ",
                "<strong>", (this.time + this.duration).fmtTime(), "</strong>",
                " - <strong style='color:#99f'>", (this.duration).fmtTime(), "</strong> total",
            "</span>",
            "<span style='text-align:right'>",
            "</span>",
        "</div>"
    ].join("");
}

var Actions = {
    Build: function( owner, time, product ) {
        this.owner = owner;
        this.time = time;
        this.product = owner.M.race[ product ];
        this.duration = this.product.build_time;
        this.name = "Build";
        this.display_name = "Build " + this.product.name;
        this.short_name = this.product.short_name;
        
        this.sprout = null;
        
        var p = this.product;
        this.change_on_start = {    // When building starts
            minerals: -p.cost_min, 
            gas: -p.cost_gas,
            supply: p.supply_take
        }
        
        var end = time + this.duration;
        // Modifies the state of the unit that executes this action
        this.modify = function(){
            if( p.flags.isAddon ){
                // change the game object of the owner (Barracks-Lab)
                if( owner.state[ end ] ){
                    owner.state[ end ].go = owner.M.race[ owner.go.id + "-" + p.id ];
                    owner.state[ end ].addon = this.sprout;
                }
                else{
                    owner.state[ end ] = { 
                        go: owner.M.race[ owner.go.id + "-" + p.id ],
                        addon: this.sprout
                    };
                }
                
                // change the game object of the sprout (Lab-Barracks)
                if( this.sprout.state[ end ] )
                    this.sprout.state[ end ].go = owner.M.race[ p.id + "-" + owner.go.id ];
                else
                    this.sprout.state[ end ] = { go: owner.M.race[ p.id + "-" + owner.go.id ] };
            }
        }
    },

    Minerals: function( owner, time, base ) {
        this.owner = owner;
        this.time = time;

        this.facility = base;     // ID of the base where the mining ends
    },

    Gas: function( owner, time, refinery ) {
        this.owner = owner;
        this.time = time;

        this.facility = refinery;   // id of the refinery where the mining happens
    },

    Scout: function( owner, time ) {
        this.owner = owner;
        this.time = time;
    },

    Cast: function( owner, time ){
        this.owner = owner;
        this.time = time;
    },
    
    Liftoff: function( owner, time ){
        this.owner = owner;
        this.time = time;
        
        var addon = owner.getProxy( time ).addon;
        // Modifies the state of the unit that executes this action
        // Liftoff removes addons.
        this.modify = function(){
            if( owner.state[ time ] ) {
                owner.state[ time ].go = owner.M.race[ owner.go.id + "-Flying" ];
                owner.state[ time ].addon = null;
            }
            else {
                owner.state[ time ] = { 
                    go: owner.M.race[ owner.go.id + "-Flying" ],
                    addon: null
                };
            }
            
            if( addon && addon.state[ time ] ) {
                // Revert back to original Game Object which is the unconnected addon
                addon.state[ time ].go = addon.go;
            }
            else if( addon ) {
                addon.state[ time ] = { go: addon.go };
            }
        }
    },
    
    Land: function( owner, time, addon ){
        this.owner = owner;
        this.time = time;

        var suffix = "";
        time = time + this.duration;
        if( addon = ( addon && addon !== "None" && owner.M.getUnit( addon ) ) ){
            suffix = "-" + addon.go.id;
            // Checking if the addon was already taken at the end of this action.
            var addon_proxy = addon.getProxy( time );
            if( !$.isEmptyObject( addon_proxy ) && addon_proxy.go !== addon.go )
                throw new MacroMapError( "The addon " + addon.id + " is already taken" );
        }
        this.display_name = "Land on " + (addon ? addon.id : "nothing");
        
        // Modifies the state of the unit that executes this action
        // Liftoff removes addons.
        this.modify = function(){
            if( owner.state[ time ] ) {
                owner.state[ time ].go = owner.M.race[ owner.go.id + suffix ];
                owner.state[ time ].addon = addon;
            }
            else {
                owner.state[ time ] = { 
                    go: owner.M.race[ owner.go.id + suffix ],
                    addon: addon
                };
            }
            
            if( addon && addon.state[ time ] ) {
                // Revert back to original Game Object which is the unconnected addon
                addon.state[ time ].go = owner.M.race[ addon.go.id + "-" + owner.go.id ];
            }
            else if( addon ) {
                addon.state[ time ] = { go: owner.M.race[ addon.go.id + "-" + owner.go.id ] };
            }
        }
    },
    
    Morph: function( owner, time, product ){
        this.owner = owner;
        this.time = time;
        
        var product = owner.M.race[ product ];
        this.product = product;
        this.duration = product.build_time;

        this.name = "Morph";
        this.display_name = "Morph to " + product.name;
        this.short_name = product.short_name;
        
        this.change_on_start = {    // When building starts
            minerals: -product.cost_min, 
            gas: -product.cost_gas,
            supply: product.supply_take
        }
        
        var end = time + this.duration;
        // Modifies the state of the unit that executes this action
        this.modify = function(){
            // change the game object of the owner (OrbitalCommand)
            if( owner.state[ end ] ){
                owner.state[ end ].go = product;
            }
            else{
                owner.state[ end ] = { go: product };
            }
        }
    }
}
$.extend(Actions.Build.prototype, {
    color: 'hsb(.8, .7, .7)',
    concurrent: false,
    fixed: true,
    check: function( state ){
        var p = this.product,
            result = 0,
            M = this.owner.M, i, req, inv;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
            
        if( state.minerals - p.cost_min < 0 )
            result = "Not enough minerals to build " + p.name;
        if( state.gas - p.cost_gas < 0 )
            result = "Not enough gas to build " + p.name;
        if( state.supply_max - (state.supply + p.supply_take) < 0 )
            result = "Not enough supply to build " + p.name;
        if( ( i = p.requires.length ) ) {
            for( i = i-1; i >= 0; --i ){
                req = p.requires[i];
                if( !M.hasTech( req, this.time ) ){
                    result = p.name + " requires " + M.race[ req ].name;
                    break;
                }
            }
        }
        
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Minerals.prototype, {
    color: 'hsb(.6, .7, .9)',
    duration: 0,
    fixed: false,
    concurrent: false,
    change_periodic: { minerals: 5 }, // Changes to the golabal M state that happen in intervals
    change_interval: 5,               // Interval of periodic changes
    name: "Minerals",
    display_name: "Minerals",
    short_name: "Min.",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Gas.prototype, {
    color: 'hsb(.4, .7, .7)',
    duration: 0,
    fixed: false,
    concurrent: false,
    change_periodic: { gas: 4 }, // Changes to the golabal M state that happen in intervals
    change_interval: 4,          // Interval of periodic changes
    name: "Gas",
    display_name: "Gas",
    short_name: "Gas",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        if( !this.owner.M.saturation[ this.facility ] )
            result = "There is no " + this.facility + " to mine gas from";

        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Scout.prototype, {
    color: 'hsb(.2, .7, .7)',
    duration: 0,
    fixed: false,
    concurrent: false,
    name: "Scout",
    display_name: "Scout",
    short_name: "Scout",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Cast.prototype, {
    color: 'hsb(1, .7, .7)',
    duration: 0,
    fixed: true,
    concurrent: true,
    name: "Cast",
    display_name: "Cast",
    short_name: "Cast",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Liftoff.prototype, {
    color: 'hsb(.5, .7, .7)',
    duration: 5,
    fixed: true,
    concurrent: false,
    name: "Liftoff",
    display_name: "Liftoff",
    short_name: "Fly",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Land.prototype, {
    color: 'hsb(.7, .7, .7)',
    duration: 5,
    fixed: true,
    concurrent: false,
    name: "Land",
    display_name: "Land",
    short_name: "Land",
    check: function(){
        var result = 0;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
        return result;
    },
    getTooltipHTML: getTooltipHTML
});
$.extend(Actions.Morph.prototype, {
    color: 'hsb(.9, .7, .7)',
    concurrent: false,
    fixed: true,
    check: function( state ){
        var p = this.product,
            result = 0,
            M = this.owner.M, i, req, inv;
        var proxy = this.owner.getProxy( this.time );
        if( !proxy.go || !proxy.go.actions.hasOwnProperty( this.name ) )
            result = this.owner.id + " can't perform " + this.name + " at " + this.time.fmtTime();
            
        if( state.minerals - p.cost_min < 0 )
            result = "Not enough minerals to build " + p.name;
        if( state.gas - p.cost_gas < 0 )
            result = "Not enough gas to build " + p.name;
        if( state.supply_max - (state.supply + p.supply_take) < 0 )
            result = "Not enough supply to build " + p.name;
        if( ( i = p.requires.length ) ) {
            for( i = i-1; i >= 0; --i ){
                req = p.requires[i];
                if( !M.hasTech( req, this.time ) ){
                    result = p.name + " requires " + M.race[ req ].name;
                    break;
                }
            }
        }
        
        return result;
    },
    getTooltipHTML: getTooltipHTML
});

Macromap.Actions = Actions;
return Macromap;

}(Macromap || {}));