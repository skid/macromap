var Macromap = (function( Macromap ){

// References to Macromap objects in other files
var M = Macromap.M;

/**
 * GameObject represents anything in Starcraft 2; Units, Buildings, Upgrades.
 */
var GameObject = function( options ) {
    for( var i in options ) 
        this[i] = options[i]; 
};

GameObject.prototype = {
    // The prototype is here just as a reminder of what should be there in a GameObject
    // Object Properties
    type:       null,   // Type of the object (Unit, Building, Spell, Upgrade)
    owner:      null,   // Owner of the object (Player, Opponent)
    id:         null,   // Unique ID for this game object
    flags:      {},     // Flags can be: morphed, addon, worker, flyable, Base ... anything       
    
    // Game Properties
    name:       null,       // In-game name of the object
    race:       null,       // 0: Terran, 1: Protoss, 2:Zerg
    cost_min:   0,          // cost in Minerals
    cost_gas:   0,          // cost in gas
    build_time: 0,          // Seconds
    cost_mana:  0,          // Mana
    supply_give:0,          
    supply_take:0,          
    
    // Relationships
    builds:     [],     // Obs built by this Ob
    requires:   [],     // Tech-tree dependancies
    actions:    [],     // Possible actions performed by this Ob
    
    // Visuals
    icon:       null,    // Icon url
    thumb:      null,    // Thumbnail url
    css:        null     // Css class of the object
};

M.prototype.Terran = {
    getWorker: function(){ return this.Scv; },
    getBase: function(){ return this.CommandCenter; },
    getGas: function(){ return this.Refinery; },
    getStartingSequence: function(){
        return [ [ 'Terran', 0, this.CommandCenter ],
                 [ 'Terran', 0, this.Scv ],
                 [ 'Terran', 0, this.Scv ],
                 [ 'Terran', 0, this.Scv ],
                 [ 'Terran', 0, this.Scv ],
                 [ 'Terran', 0, this.Scv ],
                 [ 'Terran', 0, this.Scv ] ];
    },
    gas_wait_time: 3, // How much time a worker spends in the refinery
    mineral_wait_time: .35, // How much time it takes a worker to go to the next free mineral field 
    zero_state: { minerals: 50, gas: 0, supply: 6 },
    
    // Buildings
    
    CommandCenter: new GameObject({ 
        id:'CommandCenter',
        name:'Command Center',
        short_name: 'CC',
        race: 'Terran', 
        type: 'B',
        build_time: 100,
        category: "economy",
        flags: { base: true, liftoff: true, flying:false },
        cost_min: 400,
        supply_give: 10,
        supply_take: 0,
        actions: { Build: ["Scv"], Morph:["OrbitalCommand", "PlanetaryFortress"], Liftoff: true },
        requires: [],
        renders: true,
        tech_equiv: ["CommandCenter"]
    }),
    
    "CommandCenter-Flying": new GameObject({ 
        id:'CommandCenter-Flying',
        name:'Command Center/Flying',
        short_name: 'CC/Flying',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "economy",
        flags: { base: true, liftoff: true, flying:true },
        cost_min: 400,
        supply_give: 10,
        supply_take: 0,
        actions: { Land: true },
        requires: [],
        renders: true,
        tech_equiv: ["CommandCenter"]
    }),
    
    SupplyDepot: new GameObject({ 
        id: 'SupplyDepot', 
        name: 'Supply Depot', 
        short_name: 'Depot',
        race: 'Terran',
        type: 'B',
        build_time: 30,
        category: "buildings",
        flags: { worker: false },
        cost_min: 100,
        cost_gas: 0,
        supply_give: 8,
        supply_take: 0,
        actions: {},
        requires: ['CommandCenter'],
        renders: false,
        tech_equiv: ["SupplyDepot"]
    }),

    Refinery: new GameObject({ 
        id: 'Refinery', 
        name: 'Refinery', 
        short_name: 'Refinery',
        race: 'Terran',
        type: 'B',
        build_time: 30,
        category: "economy",
        flags: { worker: false, refinery: true },
        cost_min: 75,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: {},
        requires: ['CommandCenter'],
        saturation_point: 3,
        renders: false,
        tech_equiv: ["Refinery"]
    }),

    Barracks: new GameObject({ 
        id: 'Barracks', 
        name: 'Barracks', 
        short_name: 'Rax',
        race: 'Terran', 
        type: 'B',
        build_time: 60,
        category: "buildings",
        flags: { liftoff: true, flying: false, canAddon: true },
        cost_min: 150,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions:{ Build: ["Marine", "TechLab", "Reactor" ], Liftoff: true },
        requires: ['CommandCenter'],
        renders: true,
        tech_equiv: ["Barracks"]
    }),
    
    "Barracks-Flying": new GameObject({ 
        id: 'Barracks-Flying', 
        name: 'Barracks/Flying', 
        short_name: 'Rax/Flying',
        race: 'Terran',
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: true, canAddon: true },
        cost_min: 150,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions:{ Land: true, Scout: true },
        requires: [],
        renders: true,
        tech_equiv: ["Barracks"]
    }),
    
    "Barracks-TechLab": new GameObject({ 
        id: 'Barracks-TechLab', 
        name: 'Barracks/TechLab', 
        short_name: 'Rax/Lab',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false },
        cost_min: 0,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions:{ Build: ["Marine", "Marauder", "Reaper", "Ghost"], Liftoff: true },
        requires: ['CommandCenter'],
        renders: true,
        tech_equiv: ["Barracks"]
    }),
    
    "Barracks-Reactor": new GameObject({ 
        id: 'Barracks-Reactor', 
        name: 'Barracks/Reactor', 
        short_name: 'Rax/Reac',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false, doubleQ: true },
        cost_min: 0,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions:{ Build: ["Marine"], Liftoff: true },
        requires: ['CommandCenter'],
        renders: true,
        tech_equiv: ["Barracks"]
    }),
    
    OrbitalCommand: new GameObject({ 
        id:'OrbitalCommand',
        name:'Orbital Command',
        short_name: 'OC',
        race: 'Terran', 
        type: 'B',
        build_time: 35,
        category: "economy",
        flags: { base: true, liftoff: true, flying: false, morphed: true },
        cost_min: 150,
        supply_give: 0,
        supply_take: 0,
        actions: { 
            Build: ["Scv"], 
            Cast: ["CalldownMULE", "ScannerSweep", "CalldownSupplies"], 
            Liftoff: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["CommandCenter"]
    }),
    
    "OrbitalCommand-Flying": new GameObject({ 
        id:'OrbitalCommand-Flying',
        name:'Orbital Command/Flying',
        short_name: 'OC/Flying',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "economy",
        flags: { base: true, liftoff: true, flying: true, morphed: true },
        cost_min: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Land: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["CommandCenter"]
    }),
    
    EngineeringBay: new GameObject({ 
        id:'EngineeringBay',
        name:'Engineering Bay',
        short_name: 'Bay',
        race: 'Terran', 
        type: 'B',
        build_time: 35,
        category: "buildings",
        flags: { },
        cost_min: 125,
        supply_give: 0,
        supply_take: 0,
        actions: { },
        requires: ["CommandCenter"],
        renders: false,
        tech_equiv: ["EngineeringBay"]
    }),
    
    PlanetaryFortress: new GameObject({ 
        id:'PlanetaryFortress',
        name:'Planetary Fortress',
        short_name: 'Fort',
        race: 'Terran',
        type: 'B',
        build_time: 50,
        category: "buildings",
        flags: { base: true, morphed: true },
        cost_min: 100,
        cost_gas: 100,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Scv"] },
        requires: ["Barracks", "EngineeringBay"],
        renders: true,
        tech_equiv: ["CommandCenter"]
    }),
    
    Bunker: new GameObject({ 
        id:'Bunker',
        name:'Bunker',
        short_name: 'Bunker',
        race: 'Terran', 
        type: 'B',
        build_time: 30,
        category: "buildings",
        flags: { },
        cost_min: 100,
        supply_give: 0,
        supply_take: 0,
        actions: { Cast: ["Salvage"] },
        requires: ["Barracks"],
        renders: false,
        tech_equiv: ["Bunker"]
    }),
    
    MissileTurret: new GameObject({ 
        id:'MissileTurret',
        name:'Missile Turret',
        short_name: 'Turret',
        race: 'Terran', 
        type: 'B',
        build_time: 25,
        category: "buildings",
        flags: { },
        cost_min: 100,
        supply_give: 0,
        supply_take: 0,
        actions: {  },
        requires: ["EngineeringBay"],
        renders: false,
        tech_equiv: ["MissileTurret"]
    }),
    
    SensorTower: new GameObject({ 
        id:'SensorTower',
        name:'Sensor Tower',
        short_name: 'Tower',
        race: 'Terran', 
        type: 'B',
        build_time: 25,
        category: "buildings",
        flags: { },
        cost_min: 125,
        supply_give: 0,
        supply_take: 0,
        actions: {  },
        requires: ["EngineeringBay"],
        renders: false,
        tech_equiv: ["SensorTower"]
    }),
    
    Factory: new GameObject({ 
        id:'Factory',
        name:'Factory',
        short_name: 'Fact.',
        race: 'Terran', 
        type: 'B',
        build_time: 60,
        category: "buildings",
        flags: { liftoff: true, flying: false, canAddon: true },
        cost_min: 150,
        cost_gas: 100,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Reactor", "TechLab", "Hellion"], Liftoff: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["Factory"]
    }),
    
    "Factory-Flying": new GameObject({ 
        id:'Factory-Flying',
        name:'Factory/Flying',
        short_name: 'Fact/Flying',
        race: 'Terran',
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Land: true, Scout: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["Factory"]
    }),
    
    "Factory-TechLab": new GameObject({ 
        id:'Factory-TechLab',
        name:'Factory/TechLab',
        short_name: 'Fact/Lab',
        race: 'Terran',
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Hellion", "SiegeTank", "Thor"], Liftoff: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["Factory"]
    }),
    
    "Factory-Reactor": new GameObject({ 
        id:'Factory-Reactor',
        name:'Factory/Reactor',
        short_name: 'Fact/Reac',
        race: 'Terran',
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false, doubleQ: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Hellion"], Liftoff: true },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["Factory"]
    }),
    
    GhostAcademy: new GameObject({ 
        id:'GhostAcademy',
        name:'GhostAcademy',
        short_name: 'Academy',
        race: 'Terran', 
        type: 'B',
        build_time: 40,
        category: "buildings",
        flags: { },
        cost_min: 150,
        cost_gas: 50,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Nuke"] },
        requires: ["Barracks"],
        renders: true,
        tech_equiv: ["GhostAcademy"]
    }),
    
    Armory: new GameObject({ 
        id:'Armory',
        name:'Armory',
        short_name: 'Armory',
        race: 'Terran', 
        type: 'B',
        build_time: 65,
        category: "buildings",
        flags: { },
        cost_min: 150,
        cost_gas: 100,
        supply_give: 0,
        supply_take: 0,
        actions: {  },
        requires: ["Factory"],
        renders: true,
        tech_equiv: ["Armory"]
    }),
    
    Starport: new GameObject({ 
        id:'Starport',
        name:'Starport',
        short_name: 'Starport',
        race: 'Terran', 
        type: 'B',
        build_time: 50,
        category: "buildings",
        flags: { liftoff: true, flying: false, canAddon: true },
        cost_min: 150,
        cost_gas: 100,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["TechLab", "Reactor", "Viking", "Medivac"], Liftoff: true },
        requires: ["Factory"],
        renders: true,
        tech_equiv: ["Starport"]
    }),
    
    "Starport-Flying": new GameObject({ 
        id:'Starport-Flying',
        name:'Starport/Flying',
        short_name: 'Starport/Flying',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Land:true, Scout:true },
        requires: ["Factory"],
        renders: true,
        tech_equiv: ["Starport"]
    }),
    
    "Starport-TechLab": new GameObject({ 
        id:'Starport-TechLab',
        name:'Starport/TechLab',
        short_name: 'Starport/Lab',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Viking", "Banshee", "Medivac", "Raven", "Battlecruiser" ], Liftoff: true },
        requires: ["Factory"],
        renders: true,
        tech_equiv: ["Starport"]
    }),
    
    "Starport-Reactor": new GameObject({ 
        id:'Starport-Reactor',
        name:'Starport/Reactor',
        short_name: 'Starport/Reac',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { liftoff: true, flying: false, doubleQ: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Viking", "Medivac"], Liftoff: true },
        requires: ["Factory"],
        renders: true,
        tech_equiv: ["Starport"]
    }),
    
    FusionCore: new GameObject({ 
        id:'FusionCore',
        name:'FusionCore',
        short_name: 'Core',
        race: 'Terran', 
        type: 'B',
        build_time: 80,
        category: "buildings",
        flags: { },
        cost_min: 150,
        cost_gas: 150,
        supply_give: 0,
        supply_take: 0,
        actions: { },
        requires: ["Starport"],
        renders: true,
        tech_equiv: ["FusionCore"]
    }),
    
    Reactor: new GameObject({ 
        id:'Reactor',
        name:'Reactor',
        short_name: 'Reactor',
        race: 'Terran', 
        type: 'B',
        build_time: 50,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 50,
        cost_gas: 50,
        supply_give: 0,
        supply_take: 0,
        actions: { },
        requires: [],
        renders: true
    }),
    
    "Reactor-Barracks": new GameObject({ 
        id:'Reactor-Barracks',
        name:'Reactor/Barracks',
        short_name: 'Reac/Rax',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Marine"] },
        requires: [],
        renders: true
    }),
    
    "Reactor-Factory": new GameObject({ 
        id:'Reactor-Factory',
        name:'Reactor/Factory',
        short_name: 'Reac/Fact',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Hellion"] },
        requires: [],
        renders: true
    }),
    
    "Reactor-Starport": new GameObject({ 
        id:'Reactor-Starport',
        name:'Reactor/Starport',
        short_name: 'Reac/Starport',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 0,
        actions: { Build: ["Viking", "Medivac"] },
        requires: [],
        renders: true
    }),
    
    TechLab: new GameObject({ 
        id: 'TechLab', 
        name: 'Tech Lab', 
        short_name: 'Lab',
        race: 'Terran', 
        type: 'B',
        build_time: 25,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 50,
        cost_gas: 50,
        supply_take: 0,
        supply_give: 0,
        actions: {},
        renders: true
    }),
    
    "TechLab-Barracks": new GameObject({ 
        id: 'TechLab-Barracks', 
        name: 'TechLab/Barracks', 
        short_name: 'Lab/Rax',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions: {
            Research: ["Stimpack", "CombatShield", "NitroPacks"]
        },
        renders: true
    }),
    
    "TechLab-Factory": new GameObject({ 
        id: 'TechLab-Factory', 
        name: 'TechLab/Factory', 
        short_name: 'Lab/Fact',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions: {
            Research: ["InfernalPreigniter", "SiegeMode" ]
        },
        renders: true
    }),
    
    "TechLab-Starport": new GameObject({ 
        id: 'TechLab-Starport', 
        name: 'TechLab/Starport', 
        short_name: 'Lab/Starport',
        race: 'Terran', 
        type: 'B',
        build_time: 0,
        category: "buildings",
        flags: { isAddon: true },
        cost_min: 0,
        cost_gas: 0,
        supply_take: 0,
        supply_give: 0,
        actions: {
            Research: ["CaduceusReactor", "Cloaking" ]
        },
        renders: true
    }),
    
    // Units
    
    Scv: new GameObject({ 
        id: 'Scv', 
        name: 'Scv', 
        short_name: 'Scv',
        race: 'Terran', 
        type: 'U',
        build_time: 17,
        category: "economy",
        flags: { worker: true },
        cost_min: 50,
        cost_gas: 0,
        supply_give: 0,
        supply_take: 1,
        actions: { 
            Build: ["CommandCenter", "SupplyDepot", "Barracks", "Refinery", "Bunker", "MissileTurret", 
                    "SensorTower", "Factory", "Armory", "GhostAcademy", "Starport", "FusionCore"],
            Minerals: 1,
            Gas: 1,
            Scout: 1
        },
        requires: [],
        renders: true
    }),
    
    MULE: new GameObject({ 
        id: 'MULE', 
        name: 'MULE', 
        short_name: 'MULE',
        race: 'Terran', 
        type: 'U',
        build_time: 0,
        category: "economy",
        flags: { },
        cost_min: 0,
        cost_gas: 0,
        duration: 60,
        supply_give: 0,
        supply_take: 0,
        actions: { RichMinerals: 1, Scout: 1 },
        requires: [],
        renders: true
    }),
    
    Marine: new GameObject({ 
        id: 'Marine', 
        name: 'Marine', 
        short_name: 'Marine',
        race: 'Terran', 
        type: 'U',
        build_time: 20,
        category: "army",
        flags: { },
        cost_min: 50,
        cost_gas: 0,
        supply_take: 1,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Marauder: new GameObject({ 
        id: 'Marauder', 
        name: 'Marauder', 
        short_name: 'Marauder',
        race: 'Terran', 
        type: 'U',
        build_time: 30,
        category: "army",
        flags: { },
        cost_min: 100,
        cost_gas: 25,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Reaper: new GameObject({ 
        id: 'Reaper', 
        name: 'Reaper', 
        short_name: 'Reaper',
        race: 'Terran', 
        type: 'U',
        build_time: 40,
        category: "army",
        flags: { },
        cost_min: 50,
        cost_gas: 50,
        supply_take: 1,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Ghost: new GameObject({ 
        id: 'Ghost', 
        name: 'Ghost', 
        short_name: 'Ghost',
        race: 'Terran', 
        type: 'U',
        build_time: 40,
        category: "army",
        flags: { },
        cost_min: 150,
        cost_gas: 150,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: ['GhostAcademy'],
        renders: false
    }),
    
    Hellion: new GameObject({ 
        id: 'Hellion', 
        name: 'Hellion', 
        short_name: 'Hellion',
        race: 'Terran', 
        type: 'U',
        build_time: 30,
        category: "army",
        flags: { },
        cost_min: 100,
        cost_gas: 0,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    SiegeTank: new GameObject({ 
        id: 'SiegeTank', 
        name: 'SiegeTank', 
        short_name: 'Tank',
        race: 'Terran', 
        type: 'U',
        build_time: 50,
        category: "army",
        flags: { },
        cost_min: 150,
        cost_gas: 125,
        supply_take: 3,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Thor: new GameObject({ 
        id: 'Thor', 
        name: 'Thor', 
        short_name: 'Thor',
        race: 'Terran', 
        type: 'U',
        build_time: 75,
        category: "army",
        flags: { },
        cost_min: 300,
        cost_gas: 200,
        supply_take: 6,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: ['Armory'],
        renders: false
    }),
    
    Viking: new GameObject({ 
        id: 'Viking', 
        name: 'Viking', 
        short_name: 'Viking',
        race: 'Terran', 
        type: 'U',
        build_time: 42,
        category: "army",
        flags: { },
        cost_min: 150,
        cost_gas: 75,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Medivac: new GameObject({ 
        id: 'Medivac', 
        name: 'Medivac', 
        short_name: 'Medivac',
        race: 'Terran', 
        type: 'U',
        build_time: 42,
        category: "army",
        flags: { },
        cost_min: 100,
        cost_gas: 100,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Raven: new GameObject({ 
        id: 'Raven', 
        name: 'Raven', 
        short_name: 'Raven',
        race: 'Terran', 
        type: 'U',
        build_time: 60,
        category: "army",
        flags: { },
        cost_min: 100,
        cost_gas: 200,
        supply_take: 2,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Banshee: new GameObject({ 
        id: 'Banshee', 
        name: 'Banshee', 
        short_name: 'Banshee',
        race: 'Terran',
        type: 'U',
        build_time: 60,
        category: "army",
        flags: { },
        cost_min: 150,
        cost_gas: 100,
        supply_take: 3,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: [],
        renders: false
    }),
    
    Battlecruiser: new GameObject({ 
        id: 'Battlecruiser', 
        name: 'Battlecruiser', 
        short_name: 'BC',
        race: 'Terran',
        type: 'U',
        build_time: 110,
        category: "army",
        flags: { },
        cost_min: 400,
        cost_gas: 300,
        supply_take: 6,
        supply_give: 0,
        actions: { Scout: 1 },
        requires: ['FusionCore'],
        renders: false
    })
    
};

return Macromap;
}( Macromap || {} ));