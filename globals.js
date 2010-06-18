// Global Helpers
if( !console ){
    var console = { log:function(){} };
}

Number.prototype.fmtTime = function(){
    var minutes = Math.floor( this / 60 ),
        seconds = this % 60;
    return [minutes < 10 ? "0" + minutes: minutes, seconds < 10 ? "0" + seconds: seconds ].join(":");
};

// without a compare func, sort() treats members as strings
function generateSortFunc( compare ){
    return function( dict ) {
        var i, r = [];
        for( i in dict ) {
            if( dict.hasOwnProperty(i) ) {
                r.push( parseInt(i, 10) );
            }
        }
        return r.sort( compare ); 
    };
}
var getSortedKeys = generateSortFunc( function(a,b){ return a-b; } ),
    getReverseSortedKeys = generateSortFunc( function(a,b){ return b-a; } );

function MacroMapError(message) {
    this.name = "MacroMapError";
    this.message = (message || "");
}
MacroMapError.prototype = Error.prototype;

function RedundantEventError(message) {
    this.name = "RedundantEventError";
    this.message = (message || "");
}
RedundantEventError.prototype = Error.prototype;

function NotFoundError(message) {
    this.name = "NotFoundError";
    this.message = (message || "");
}
NotFoundError.prototype = Error.prototype;


function deepExtend( obj1, obj2 ){
    // Tf numeric, deepExtend adds (or creates) properties of obj2 to obj1.
    // If objects, it recursively goes looking for numbers creating properties in obj1 if necessary.
    var i;
    for( i in obj2 ){
        if( !obj1[i] ) {
            if( typeof obj2[i] == "number" || typeof obj2[i] == "string" ) {
                obj1[i] = obj2[i]; // copy primitive type
                continue;
            }
            else if( $.isArray( obj2[i] ) ) {
                obj1[i] = obj2[i].slice(0); // copy array;
                continue;
            }
            else {
                obj1[i] = {}; // objects will be copied by deep extend recursive call
            }
        }
        switch( typeof obj1[i] ){
            case "object":
                deepExtend( obj1[i], obj2[i] );
                break;
            case "number":
                obj1[i] += obj2[i];
                break;
            default:
                throw new Error("deepExtend encountered an unknown type " + 
                                (typeof obj1[i]) + " with value: " + obj1[i] );
        }
    }
}