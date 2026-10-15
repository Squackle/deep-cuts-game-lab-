// Handcrafted, versioned playtest vaults. Every level is solver-verified in tests.
export const LEVELS = [
  {
    id:"mh-vault-001",engineVersion:"mh-core-0.1.0",chapter:"VAULT I / SPARK",title:"First Light",
    briefing:"Wake the Sunwell, then open the seal. Device activations and opening the vault each count as one move.",
    width:3,height:2,routing:"global",moveBudget:2,goal:{sun:1},
    components:[
      {id:"sunwell",type:"source",at:[0,0],label:"Sunwell",output:{sun:1},uses:1},
      {id:"vault",type:"vault",at:[2,1],label:"Outer Seal"}
    ]
  },
  {
    id:"mh-vault-002",engineVersion:"mh-core-0.1.0",chapter:"VAULT I / SPARK",title:"The Paired Key",
    briefing:"The lock asks for two different energy signatures. Gather both before opening it.",
    width:3,height:2,routing:"global",moveBudget:3,goal:{sun:1,tide:1},
    components:[
      {id:"sunwell",type:"source",at:[0,0],label:"Sunwell",output:{sun:1},uses:1},
      {id:"tidewell",type:"source",at:[0,1],label:"Tidewell",output:{tide:1},uses:1},
      {id:"vault",type:"vault",at:[2,0],label:"Double Seal"}
    ]
  },
  {
    id:"mh-vault-003",engineVersion:"mh-core-0.1.0",chapter:"VAULT I / SPARK",title:"The Alchemist",
    briefing:"The prism spends one Sun energy to make Ember energy. You'll need two Sunwell charges in total.",
    width:3,height:2,routing:"global",moveBudget:4,goal:{sun:1,ember:1},
    components:[
      {id:"sunwell",type:"source",at:[0,0],label:"Sunwell",output:{sun:1},uses:2},
      {id:"prism",type:"converter",at:[1,1],label:"Ember Prism",input:{sun:1},output:{ember:1},uses:1},
      {id:"vault",type:"vault",at:[2,0],label:"Prismatic Seal"}
    ]
  },
  {
    id:"mh-vault-004",engineVersion:"mh-core-0.1.0",chapter:"VAULT II / CONDUIT",title:"A Crooked Wire",
    briefing:"Disconnected sources cannot be activated. Rotate the relay once to connect the Sunwell to the vault.",
    width:3,height:3,routing:"routed",moveBudget:3,goal:{sun:1},
    components:[
      {id:"sunwell",type:"source",at:[0,1],label:"Sunwell",output:{sun:1},uses:1},
      {id:"bridge",type:"relay",shape:"straight",rotation:0,turns:1,at:[1,1],label:"Iron Relay"},
      {id:"vault",type:"vault",at:[2,1],label:"Conduit Seal"}
    ]
  },
  {
    id:"mh-vault-005",engineVersion:"mh-core-0.1.0",chapter:"VAULT II / CONDUIT",title:"Switchback",
    briefing:"A relay turns clockwise when tapped. Align all three to complete the winding connection.",
    width:4,height:3,routing:"routed",moveBudget:5,goal:{tide:1},
    components:[
      {id:"tidewell",type:"source",at:[0,0],label:"Tidewell",output:{tide:1},uses:1},
      {id:"elbowA",type:"relay",shape:"corner",rotation:1,turns:1,at:[1,0],label:"Upper Elbow"},
      {id:"elbowB",type:"relay",shape:"corner",rotation:3,turns:1,at:[1,1],label:"Lower Elbow"},
      {id:"bridge",type:"relay",shape:"straight",rotation:0,turns:1,at:[2,1],label:"Final Relay"},
      {id:"vault",type:"vault",at:[3,1],label:"Switchback Seal"}
    ]
  },
  {
    id:"mh-vault-006",engineVersion:"mh-core-0.1.0",chapter:"VAULT III / CRUCIBLE",title:"The Twin Gambit",
    briefing:"The Twinfont offers Sun or Tide with each activation. Convert Tide into Ember, save Sun for the final seal, and reconnect the route.",
    width:4,height:2,routing:"routed",moveBudget:5,goal:{sun:1,ember:1},
    components:[
      {id:"twinfont",type:"dual",at:[0,0],label:"Twinfont",options:[{sun:1},{tide:1}],uses:2},
      {id:"prism",type:"converter",at:[1,0],label:"Ember Prism",input:{tide:1},output:{ember:1},uses:1},
      {id:"bridge",type:"relay",shape:"straight",rotation:0,turns:1,at:[2,0],label:"Final Relay"},
      {id:"vault",type:"vault",at:[3,0],label:"Twin Seal"}
    ]
  }
];
