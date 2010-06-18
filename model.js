var Macromap = (function( Macromap ){
/**
 * an Action represent anything that ca be "done" in the game. Building, scouting, gathering...
 */
var Actions = Macromap.Actions;

/**
 * Unit represents a living instance of a GameObject in the Macromap
 */
var Unit = function( gameob, start, saturation_point, is_rich_minerals ) {
    this.go           = gameob;
    this.start        = start;
    this.actions      = {}; // { 0: ['build probe', 'chrono boost'], 20: ['build probe'] }
    
    var name = gameob.flags.base ? "Base" : gameob.short_name;
    !Unit.cache[name] ? (Unit.cache[name] = 1) : (Unit.cache[name] += 1);
    
    this.display_name = name + " " + Unit.cache[name];
    this.id = name + Unit.cache[name];
    this.selected = false;
    this.renders = gameob.renders;
    
    if( gameob.flags.base ){
        if( is_rich_minerals )
            this.is_rich_minerals = is_rich_minerals;
        this.saturation_point = saturation_point;
    } else if( gameob.flags.refinery ){
        this.saturation_point = gameob.saturation_point;
    }
    
    this.state = {};
    this.state[ start ] = {  }
};
Unit.cache = {};

Unit.prototype = {
    doAction: function( time, name, extra, saturation_point ) {
        var last_action, next_action, j, next_event_time, last_event_time, error_message;
        
        if( time < this.start ){
            throw new MacroMapError(this.id + " can't do any actions yet. It will be ready at " + this.start.fmtTime());
        }   
        if( name == "Build" && $.inArray(extra, this.getProxy(time).go.actions.Build) === -1 ) {
            throw new MacroMapError("Unit " + this.id + " can't build " + extra);
        }
        var action = new Actions[ name ]( this, time, extra );
        
        if( (error_message = action.check( this.M.getState( time ) ) ) ) {
            throw new MacroMapError( error_message );
        }
        
        // Non-concurrent (nc) actions come at index 0 in the action list for particular time.
        // That's because there can be only one nc action happening at a time.
        var pushfunc = action.concurrent ?  Array.prototype.push : Array.prototype.unshift;
        if( this.actions[ time ] && this.actions[ time ].length ) {
            // Can't have 2 nc actions happening at exactly the same time
            if ( !this.actions[ time ][0].concurrent && !action.concurrent ) {
                if( this.actions[ time ][0].name === action.name ) {
                    // Doing the same action at the same time, ignore it and delete the action and event
                    throw new RedundantEventError();
                }
                throw new MacroMapError("Can't interrupt " + this.actions[ time ][0].name + " for " + this.id);
            }
            else {
                pushfunc.call( this.actions[ time ], action );
            }
            
        } else {
            this.actions[ time ] = new Array( action );
        }
        
        // Get chronological position of the current action
        var event_times = getSortedKeys( this.actions );
        var i = event_times.length;
        while( j = --i ) {
            if( event_times[i] === time ) {
                 break;
            }
        }
        if( !action.fixed ) {
            action.duration = this.M.max_time - time;
        }

        // Calculate duration for previous unfixed action
        // If previous action is fixed, check if we are interrupting it prematurely
        if( !action.concurrent ) {
            while( typeof ( last_event_time = event_times[ --j ] ) !== 'undefined' ){
                last_action = this.actions[ last_event_time ][ 0 ];
                if( !last_action || last_action.concurrent )
                    continue;
                else {
                    // if last action is unfixed, it will always run till max_time
                    // therefore we need to shorten its duration till the beginning of this action.
                    if( !last_action.fixed ){
                        // unless we're making an identical action, in which case there's no point in making it at all.
                        if( action.name === last_action.name &&
                            (!action.facility || action.facility === last_action.facility) ){
                            for( var k = this.actions[time].length - 1; k >= 0; --k )
                                if( this.actions[time][k] === action ){
                                    this.actions[time].splice(k, 1); // remove action from event.
                                    if( !this.actions[time].length )
                                        delete this.actions[time];   // if no actions left in event, remove event.
                                    throw new RedundantEventError();
                                }
                        }

                        var old_end_time = last_action.time + last_action.duration;
                        last_action.duration = time - last_action.time;
                        // If last action exerted a periodic change, we need to set the end of that periodic
                        // change to the new ENDING TIME of the last action.
                        if( last_action.change_periodic_ref )
                            last_action.change_periodic_ref[0] = last_action.time + last_action.duration;
                        // If last action exerted a change on end, we need to change the time that happens.
                        if( last_action.change_on_end_ref ){
                            this.M.moveStateChange( old_end_time, 
                                last_action.time + last_action.duration, 
                                last_action.change_on_end_ref );
                        }
                    }
                    else if( last_action.duration + last_action.time > time ){
                        throw new MacroMapError("Can't interrupt " + last_action.name + " for " + this.id);
                    }
                    break;
                }
            }
        }
        
        // Sprout is the unit that's been produced by the action.
        // Seed is the action that produced the unit. It's kind of a double linked list.
        if( action.name == "Build" && action.product ) {
            action.sprout = this.M.addUnit( new Unit( action.product, time + action.duration, saturation_point ) );
            action.sprout.seed = action;
        }
        
        // action.modify changes the owner or the action's sprout accordingly 
        action.modify && action.modify();
        
        // Record any periodic modifications exerted by this action (mining minerals)
        if( action.change_periodic )
            action.change_periodic_ref = this.M.addPeriodicChange( time, action.duration, 
                action.change_interval, action.change_periodic, action.facility );
        
        // Record any modifications to the M state exerted by this action at its start
        if( action.change_on_start ) 
            action.change_on_start_ref = this.M.addStateChange( time, action.change_on_start );
        
        // Record any modifications to the M state exerted by this action at its end
        if( action.change_on_end )
            action.change_on_end_ref = this.M.addStateChange( time + action.duration, action.change_on_end );
        
        return action;
    },
    
    getState: function( clock ){
        var state = {}, time, i, j, k;
        var keys = getSortedKeys( this.state );
        for( i=0, j=keys.length; i<j; i++ ){
            if( clock < (time = keys[i]) )
                break;
            for( k in this.state[ time ] )
                state[k] = this.state[ time ][ k ];
        }
        return state;
    },
    
    // Returns a proxy for this unit at "clock". A proxy is a clone of the actual unit
    // that can have a different game object or other different properties. Depends on the time.
    getProxy: function( clock ){
        clock = clock || this.M.clock;
        return  clock >= this.start ? 
                $.extend( $.extend( {}, this ), this.getState( clock ) ) : 
                {};
    }
};

/**
 * Macromap represents the state of a single build order.
 */
var M = function( element, race, starting_mineral_fields, is_rich_minerals ){
    // HTML Elements
    this.main     = $(element);
    
    this.clock     = 0;              // Current time
    this.max_time  = 900;            // Maximum observed time in seconds
    this.race_name = race;
    this.race      = this[ race ];   // The unit definitions for the selected race
    
    this.units  = [ ];              // A list of the units (this has nothing to do with state)
    
    this.state  = { "0": [ this.race.zero_state ] };    // State changes at a particular time.
    this.periodic = {};             // Periodic changes, like a single worker bringing in minerals.
    
    this.saturation = {};           // Counts how many workers are mining gas/minerals at each location and time.
    
    this.smf = starting_mineral_fields; // This needs to be defined in the start
    this.rich = is_rich_minerals;
};

M.prototype = {
    addUnit: function( unit ){
        unit.M = this;
        this.units.push( unit );
        
        if( unit.go.flags.base || unit.go.flags.refinery ){
            this.saturation[ unit.id ] = unit.saturation_point;
            this.periodic[ unit.id ] = {};
        }
        
        if( unit.go.supply_give ) {
            this.addStateChange( unit.start, { supply_max: unit.go.supply_give } );
        }
        
        return unit;
    },
    
    getUnit: function( id ){
        for( var i=this.units.length - 1; i>=0; i-- ){
            if( this.units[i].id === id )
                return this.units[i];
        }
        throw new NotFoundError("Unit " + id + " not found");
    },
    
    // Searches units by their GameObject ID. for exemple: find all supply depots.
    // If proxy is true, it searches the unit's proxies. For example - it won't find
    // any "Reactor" if all reactors are connected to Barracks at "time".
    searchUnits: function( type, proxy, time ){
        var units = [], proxy;
        time = time || this.clock;
        for( var i = this.units.length - 1; i >= 0; i-- ){
            if( proxy && !$.isEmptyObject( proxy = this.units[i].getProxy( time ) ) && proxy.go.id === type ){
                units.push( this.units[i] );
            }
            else if( typeof proxy === "undefined" && this.units[i].go.id === type )
                units.push( this.units[i] );
        }
        
        if( units.length )
            return units;

        throw new NotFoundError("No units of type " + type + " found");
    },
    
    hasTech: function( requirement, time ){
        var proxy;
        for( var i=this.units.length - 1; i>=0; i-- ){
            proxy = this.units[i].getProxy( time );
            if( proxy.go && $.inArray( requirement, proxy.go.tech_equiv ) !== -1 )
                return true;
        }
        return false;
    },
    
    addStateChange: function( time, data ){
        if( this.state[time] )
            this.state[time].push ( data );
        else
            this.state[time] = [ data ];
        return data;
    },
    
    moveStateChange : function( last_time, new_time, ref ){
        // ref is the reference to the state change. Usually action.change_on_end_ref
        if( this.state[last_time] )
            for( var i= this.state[last_time].length - 1; i >= 0; --i )
                if( this.state[last_time][i] === ref ){
                    this.state[last_time].splice(i,1);
                    this.addStateChange( new_time, ref );
                    break;
                }
    },
    
    addPeriodicChange: function( time, duration, interval, change, facility ){
        var ref = this.periodic[ facility ] || ( this.periodic[facility] = {} );
        var changeObj = [time + duration, interval, change]; // reference to the change object
        if( ref[time] )
            ref[time].push ( changeObj );
        else
            ref[time] = [ changeObj ];
        return changeObj;
    },
    
    // Returns dict of facilities that can currently mine minerals or gas.
    getFacilities: function( clock ){
        var i, j, state = this.getState( clock ),
            gas  = this.race.getGas().id,
            base = this.race.getBase().id,
            result = { "Minerals": [], "Gas": [], "RichMinerals": [] };
        for( i in state.economy ){
            if( i === base ){
                for( j = 1; j <= state.economy[i]; j++ ){
                    result.Minerals.push( "Base" + j );
                    result.RichMinerals.push( "Base" + j );
                }
            } else if ( i === gas ){
                for( j=1; j <= state.economy[i]; j++ ){
                    result.Gas.push( gas + j );
                }                
            }
        }
        return result;
    },
    
    // getState is the workhorse of Macromap. It calculates how many resources, units
    // and buildings you have at any singe point in time.
    getState: function( clock ) {
        clock = clock || this.clock;
        var state = {}, time, i,j,k,l, proxy;
        var keys = getSortedKeys( this.state );
        
        // This loop checks all units for their type at "time"
        // Then calculates the total 'inventory'
        for( i=this.units.length-1; i >= 0; --i ){
            proxy = this.units[i].getProxy( clock );
            if( $.isEmptyObject( proxy ) )
                continue; // Empty object means that the unit does not exist yet.
            if( state[ proxy.go.category ] ){
                state[ proxy.go.category ][ proxy.go.id ] ?
                    state[ proxy.go.category ][ proxy.go.id ] += 1 :
                    state[ proxy.go.category ][ proxy.go.id ] = 1;
            } else {
                state[ proxy.go.category ] = {  };
                state[ proxy.go.category ][ proxy.go.id ] = 1;
            }
            
        }
        
        // This loop adds incremental state changes to obtain the final state at "time".
        // Resources are calculated separately in the next loops.
        for( i=0, j=keys.length; i<j; ++i ){
            if( (time = keys[i]) > clock )
                break;
            for( k = this.state[ time ].length; k >= 0; --k ){
                deepExtend( state, this.state[ time ][k] );
            }
        }
        
        var facility_name, facility, pkeys, start, end, totalsat, sat_keys, is_gas,
            sat_key, periodic, added, maxsat, diff, return_trips, msat, sat, doublebreak;
                
        for( facility_name in this.periodic ){
            is_gas = facility_name[0] === this.race.getGas().id[0];
            msat = {}; 
            sat = {};
            satcounter = 0;
            facility = this.periodic[facility_name];
            pkeys = getSortedKeys(facility);
            maxsat = this.saturation[ facility_name ];
            
            // This nested loop gives us msat - a hash of the marginal change of saturation at each time.
            for( i = 0, j = pkeys.length; i < j; ++i ){
                if( (time = pkeys[i]) > clock )
                    break;

                // loop through simultaneous actions
                for( k = facility[ time ].length - 1; k >= 0; --k ){
                    end = facility[ time ][ k ][ 0 ]; // end time
                    msat[ time ] ? ( msat[ time ] += 1 ) : ( msat[ time ] = 1);
                    msat[ end ] ? ( msat[ end ] -= 1 ) : ( msat[ end ] = -1);
                }
            }
            sat_keys = getReverseSortedKeys( msat ); // reverse sort for looping backwards
            // This loop gives us sat - a hash of the total saturation at every time.
            for( i = sat_keys.length - 1; i >= 0; --i ){
                satcounter += msat[ sat_keys[ i ] ];
                sat[ sat_keys[ i ] ] = satcounter;
            }
                        
            for( i = sat_keys.length - 1; i >= 0; --i ){
                if( (time = sat_keys[ i ]) > clock )
                    break;
                    
                totalsat = sat[ time ]; // total saturation of facility at time
                
                if( !facility[ time ] )
                    added = 0;
                else
                    added = facility[ time ].length;  // how many workers we add to facility 
                doublebreak = false;              // sometimes we can exit earlier 
                
                for( k = added - 1; k >= 0; --k ){
                    periodic = facility[ time ][ k ];          // this periodic change {minerals: 5} or similar
                    
                    start = time;                              // start of mining activity
                    end = Math.min( clock, periodic[ 0 ] );    // end of mining activity (or observed time)
                    
                    // If the facility is a refinery, and we are sending more than one
                    // worker on it at the same time, the mining of the second (and possibly third)
                    // worker needs to be delayed by this.race.gas_wait_time - see races.js
                    if( is_gas ) {
                        (start += this.race.gas_wait_time*((added-1)-k));
                    }
                    else {
                        (start += this.race.mineral_wait_time*((added-1)-k));
                    }
                    
                    // diff is the difference between the max allowed saturation
                    // and the current saturation which is calculated as:
                    // (totalsat - k) - the saturation at this time after all workers have
                    // been added minus the number of workers we have not added yet (k)
                    //      remember that we are looping the array backwards.
                    // What we need to find is the next member in "sat" that has a negative
                    // marginal saturation that is smaller (bigger in absolute) than diff.
                    // and we will set start to begin at that time.
                    if( (diff = maxsat - totalsat + k) < 0 ){
                        start = end;   // by default, no mining for this worker, unless we get a free space.
                        for( l=sat_keys.length-1; l>=0; --l ){
                            if( (sat_key = sat_keys[l]) <= time )
                                continue;
                            if( sat_key >= end ){
                                doublebreak = true; // no open slots for the rest of the workers
                                break;
                            }
                            // if maximum saturation is >= saturation at time "sat_key", our worker
                            // has actually started mining i.e. he found a free space.
                            if( maxsat - sat[ sat_key ] >= 0 ){
                                start = sat_key;
                                break;
                            }
                        }
                    }
                    // since there are no open slots for the rest of the workers
                    // there is no point in checking the others that are being added at this time.
                    if( doublebreak )
                        break;
                        
                    // number of return trips made by worker
                    return_trips = Math.ceil( (end - start) / periodic[1] ) - 1;
                    if( return_trips > 0 ) {
                        for( var key in periodic[2] ) {
                            if( periodic[2].hasOwnProperty( key ) ) {
                                if(state[key])
                                    state[key] += return_trips * periodic[2][key];
                                else
                                    state[key] = return_trips * periodic[2][key];
                            }
                        }
                    }
                }
            }
        }
        return state;
    },
    
    registerEvent: function( ){
        this.events.push( Array.prototype.slice.call( arguments ) );
        return this;
    },
    
    unregisterLastEvent: function( ){
        if( this.events.length > 7 )
            this.events.pop();
        return this;
    },
    
    unregisterEvent: function( signature ){
        for( var i = this.events.length-1; i >= 0; --i )
            if( this.events[i].join("") === signature ){
                this.events.splice( i, 1 );
                break;
            }
        return this;
    },
    
    // Loads a seqence of moves to form a build order
    load: function( seq ) {
        seq = seq || [];
        this.events = this.race.getStartingSequence(); // Start with the race initial setup
        for( var i=0, j=seq.length; i<j; i++ ) {
          this.registerEvent( seq[i][0], seq[i][1], seq[i][2], seq[i][3], seq[i][4], seq[i][5] );
        }
        return this;
    },
    
    // Empties the caches and executes the events previously loaded with this.load()
    play: function(){
        Unit.cache  = {};        
        this.units  = [];
        this.state  = { "0": [ this.race.zero_state ] };
        this.periodic = {};
        this.saturation = {};
        
        // Get arrays of RemoveAction and doAction events.
        var saturation, signature, action, ev,
            events = $.grep(this.events, function(el, i){ return el[0] !== "RemoveAction"; }),
            skip = $.map( $.grep( this.events, function(el){ return el[0] === "RemoveAction"; } ),
                          function(el){ return el[1]; } );
        
        // Now sort the events by time. There's no point in executing
        // the actions in a random order when they can't be done like that IRL.
        // Fixme: In chrome when arrays are sorted and they all have 0 difference between elements 
        // (i.e. same elements) the elements do not retain the original order. Find a better sort.
        var tmp = events.splice(0, 7);
        events.sort( function(a,b){ return a[1] - b[1]; } );
        $.merge( tmp, events )
        events = tmp;
        for( var i=0, j=events.length; i<j; i++ ){
            ev = events[i];
            signature = ev.join("");
            
            // skip events whose signature is found in the skip array
            if( $.inArray( signature, skip ) !== -1 )
                continue;
            
            if( ev[0] === this.race_name ){
                // We are setting the base saturation here. It will have no effect on SCVs
                saturation = ev[2] === this.race.getBase() ? this.smf : null;
                this.addUnit( new Unit( ev[2], ev[1], saturation ) );
            }
            else {
                try{
                    action = this.getUnit( ev[0] ).doAction( ev[1], ev[2], ev[3], ev[4], ev[5] );
                }
                catch( e ){
                    if( e.name !== "RedundantEventError" )
                        throw e;
                    this.unregisterEvent( signature );
                    continue;
                }
                action && ( action.signature = signature ); // create action's signature
            }
        }
        return this;
    },
    
    serialize: function() {
        var serialized = [], evt, s;
        for( var i=this.race.getStartingSequence().length, j=this.events.length; i<j; i++ ) {
            evt = this.events[i];
            s = [];
            for( var k=0, l=evt.length; k<l; k++ )
                if( typeof evt[k] !== 'undefined' )
                    s.push( typeof evt[k] === 'string' ? '"' + evt[k] + '"' : evt[k] );
            serialized.push( "[" + s.join(",") + "]" );
        }
        return "[" + serialized.join(",") + "]";
    }
};

// Expose closure variables
Macromap.M = M; 
Macromap.Unit = Unit;
return Macromap;
}( Macromap || {} ));


// FIXME: Rewrite the "remove event" feature to be smarter
// When a build event is removed, all other events of its sprout(s) should be removed also.

// IDEA: Make units INHERIT from game objects. Then try to allow mixins - for example the barracks-reactor 
//       will inheirit from barracks AND reactor.
