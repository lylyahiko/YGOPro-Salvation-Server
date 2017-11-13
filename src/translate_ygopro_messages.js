/*eslint no-plusplus: 0*/
'use strict';

/**
 * @typedef YGOProMessage
 * @type {Object}
 * @property {String} command
 * @property {Packet} packet
 */

const enums = require('./translate_ygopro_enums.js'),
    makeCard = require('./model_ygopro_card.js');

/**
 * Takes a packet and makes a readable object out of it.
 * @param {Packet} packet a delimited buffer
 * @returns {BufferStreamReader} Wrapper object around a packet with streamed read functionality.
 */
function BufferStreamReader(packet) {
    var readposition = 0,
        stream = {};
    stream.packet = packet; // maybe stream should be read only.
    stream.readposition = function() {
        return readposition;
    };
    stream.setReadposition = function(value) {
        readposition = Number(value);
        return readposition;
    };
    stream.readInt8 = function() {
        // read 1 byte
        var output = packet[readposition];
        readposition += 1;
        return output;
    };
    stream.readUInt8 = stream.readInt8;
    stream.readInt16 = function() {
        var output = packet.readUInt16LE(readposition);
        readposition += 2;
        return output;
    };
    stream.readInt32 = function() {
        var output = packet.readUInt32LE(readposition);
        readposition += 4;
        return output;
    };
    stream.move = function(amount) {
        readposition += amount;
    };
    return stream;
}


function getFieldCards(gameBoard, controller, location, BufferIO) {
    'use strict';
    const cards = [],
        values = gameBoard.generateViewCount(controller),
        requiredIterations = values[location];

    for (let i = 0; requiredIterations > i; ++i) {
        var len = BufferIO.readInt32();
        if (len > 8) {
            let card = makeCard(BufferIO, controller, (gameBoard.masterRule === 4));
            cards.push(card);
        }
    }
    return cards;
}

function getSelectableZones(mask) {
    var i,
        zones = [],
        filter = 0x1;
    for (i = 0; i < 7; ++i, filter <<= 1) {
        if (mask & filter) {
            zones.push({
                player: 0,
                location: 'MONSTERZONE',
                index: i,
                status: !(mask & filter)
            });
        }
    }
    filter = 0x100;
    for (i = 0; i < 8; ++i, filter <<= 1) {
        if (mask & filter) {
            zones.push({
                player: 0,
                location: 'SPELLZONE',
                index: i,
                status: !(mask & filter)
            });
        }
    }
    filter = 0x10000;
    for (i = 0; i < 7; ++i, filter <<= 1) {
        if (mask & filter) {
            zones.push({
                player: 1,
                location: 'MONSTERZONE',
                index: i,
                status: !(mask & filter)
            });
        }
    }
    filter = 0x1000000;
    for (i = 0; i < 8; ++i, filter <<= 1) {
        if (mask & filter) {
            zones.push({
                player: 1,
                location: 'SPELLZONE',
                index: i,
                status: !(mask & filter)
            });
        }
    }
    return zones;
}

function getIdleSet(BufferIO, hasDescriptions) {
    var i,
        cards = [],
        count = BufferIO.readInt8();
    if (hasDescriptions) {
        for (i = 0; i < count; ++i) {
            cards.push({
                id: BufferIO.readInt32(),
                player: BufferIO.readInt8(),
                location: enums.locations[BufferIO.readInt8()],
                index: BufferIO.readInt8(),
                description: BufferIO.readInt32()
            });
        }
    } else {
        for (i = 0; i < count; ++i) {
            cards.push({
                id: BufferIO.readInt32(),
                player: BufferIO.readInt8(),
                location: enums.locations[BufferIO.readInt8()],
                index: BufferIO.readInt8()
            });
        }
    }
    return cards;
}
/**
 * Turn a delimited packet and turn it into a JavaScript Object.
 * @param {Object} gameBoard instance of the manual engine the player is using.
 * @param {Packet} packet delimited buffer of information containing a YGOProMessage.
 * @returns {YGOProMessage} Object with various types of information stored in it.
 */
function recieveSTOC(gameBoard, packet) {


    var BufferIO = new BufferStreamReader(packet.message),
        command,
        bitreader = 0,
        iter = 0,
        errorCode,
        count,
        val = 0,
        i = 0,
        message = {
            duelAction: 'ygopro',
            command: packet.command
        };

    switch (message.command) {
        case ('STOC_UNKNOWN'):
            message = {
                command: 'STOC_UNKNOWN'
            };
            break;

        case ('STOC_GAME_MSG'):
            command = enums.STOC.STOC_GAME_MSG[BufferIO.readInt8()];
            message.command = command;
            bitreader += 1;
            switch (command) {
                case ('MSG_RETRY'):
                    break;

                case ('MSG_START'):
                    message.playertype = BufferIO.readInt8();
                    message.lifepoints1 = BufferIO.readInt32();
                    message.lifepoints2 = BufferIO.readInt32();
                    message.player1decksize = BufferIO.readInt16();
                    message.player1extrasize = BufferIO.readInt16();
                    message.player2decksize = BufferIO.readInt16();
                    message.player2extrasize = BufferIO.readInt16();
                    break;

                case ('MSG_HINT'):
                    message.command = enums.STOC.STOC_GAME_MSG.MSG_HINT[BufferIO.readInt8()];
                    message.player = BufferIO.readInt8(); /* defunct in the code */
                    message.data = BufferIO.readInt32();
                    message.hintforce = BufferIO.readInt8();

                    switch (message.command) {
                        case 'HINT_EVENT':
                            //myswprintf(event_string, L"%ls", dataManager.GetDesc(data));
                            //this is a rabbit hole, the hint system takes bytes and uses that to 
                            //calculate (hurr, god why) the string that should be used from strings.conf
                            // like a direct reference would be hard....
                            break;
                        case 'HINT_MESSAGE':
                            //display task.data after processing it against the DB.
                            break;
                        case 'HINT_SELECTMSG':
                            message.select_hint = message.data;
                            break;

                        case 'HINT_OPSELECTED':
                            break;
                        case 'HINT_EFFECT':
                            message.showcardcode = message.data;
                            message.showcarddif = 0;
                            message.showcard = 1;
                            break;
                    }

                    break;

                case ('MSG_NEW_TURN'):
                    message.player = BufferIO.readInt8();
                    break;

                case ('MSG_WIN'):
                    message.win = BufferIO.readInt8();
                    //need to double check for more variables
                    break;

                case ('MSG_NEW_PHASE'):
                    message.phase = BufferIO.readInt8();
                    message.gui_phase = enums.phase[message.phase];
                    break;

                case ('MSG_DRAW'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.cards = [];
                    for (i = 0; i < message.count; ++i) {
                        message.cards.push({
                            id: BufferIO.readInt32()
                        });
                    }
                    break;

                case ('MSG_SHUFFLE_DECK'):
                    message.player = BufferIO.readInt8();
                    break;

                case ('MSG_SHUFFLE_HAND'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    //for some number that cant be determined here because the count was not sent (getting it from the state like an idiot)
                    // readInt32 off.
                    break;

                case ('MSG_CHAINING'):
                    message.id = BufferIO.readInt32();
                    message.pc = {
                        player: BufferIO.readInt8(),
                        location: enums.locations[BufferIO.readInt8()],
                        index: BufferIO.readInt8()
                    };
                    message.subs = BufferIO.readInt8();
                    message.c = {
                        player: BufferIO.readInt8(),
                        location: enums.locations[BufferIO.readInt8()],
                        index: BufferIO.readInt8()
                    };
                    message.desc = BufferIO.readInt32();
                    message.ct = BufferIO.readInt8(); // defunct in code
                    break;
                case ('MSG_CHAINED'):
                    message.chain_link = BufferIO.readInt8();
                    break;

                case ('MSG_CHAIN_SOLVING'):
                    message.chain_link = BufferIO.readInt8();
                    break;

                case ('MSG_CHAIN_SOLVED'):
                    message.ct = BufferIO.readInt8(); // defunct in the code
                    break;

                case ('MSG_CHAIN_END'):
                    // remove any liggering chain parts with a graphical command
                    break;

                case ('MSG_CHAIN_NEGATED'):
                    message.chain_link = BufferIO.readInt8();
                    break; //graphical and trigger only for replay

                case ('MSG_CHAIN_DISABLED'):
                    message.chain_link = BufferIO.readInt8();
                    break; //graphical and trigger only for replay

                case ('MSG_CARD_SELECTED'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    break;
                case ('MSG_RANDOM_SELECTED'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.selections = [];
                    for (i = 0; i < message.count; ++i) {
                        message.selections.push({
                            c: BufferIO.readInt8(),
                            l: BufferIO.readInt8(),
                            s: BufferIO.readInt8(),
                            ss: BufferIO.readInt8()
                        });
                    }
                    break;
                case ('MSG_BECOME_TARGET'):
                    message.count = BufferIO.readInt8();
                    message.selections = [];
                    for (i = 0; i < message.count; ++i) {
                        message.selections.push({
                            c: BufferIO.readInt8(),
                            l: BufferIO.readInt8(),
                            s: BufferIO.readInt8(),
                            ss: BufferIO.readInt8() // defunct in code
                        });
                    }
                    break;

                case ('MSG_PAY_LPCOST'):
                    message.player = BufferIO.readInt8();
                    message.lp = BufferIO.readInt32();
                    message.multiplier = -1;
                    break;

                case ('MSG_DAMAGE'):
                    message.player = BufferIO.readInt8();
                    message.lp = BufferIO.readInt32();
                    message.multiplier = -1;
                    break;

                case ('MSG_RECOVER'):
                    message.player = BufferIO.readInt8();
                    message.lp = BufferIO.readInt32();
                    message.multiplier = 1;
                    break;
                case ('MSG_LPUPDATE'):
                    message.player = BufferIO.readInt8();
                    message.lp = BufferIO.readInt32();
                    message.multiplier = 1;
                    break;

                case ('MSG_SUMMONING'):
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8(); //defunct in code
                    message.location = enums.locations[BufferIO.readInt8()]; //defunct in code
                    message.index = BufferIO.readInt8(); //defunct in code
                    message.position = enums.positions[BufferIO.readInt8()]; //defunct in code
                    break;

                case ('MSG_EQUIP'):
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    message.c2 = BufferIO.readInt8();
                    message.l2 = BufferIO.readInt8();
                    message.s2 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    break;

                case ('MSG_UNEQUIP'):
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    break;
                case ('MSG_CARD_TARGET'):
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    break;

                case ('MSG_CANCEL_TARGET'):
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    message.c2 = BufferIO.readInt8();
                    message.l2 = BufferIO.readInt8();
                    message.s2 = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding wtf
                    break;

                case ('MSG_ADD_COUNTER'):
                    message.type = BufferIO.readInt16();
                    message.player = BufferIO.readInt8();
                    message.location = enums.locations[BufferIO.readInt8()];
                    message.index = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    break;

                case ('MSG_REMOVE_COUNTER'):
                    message.type = BufferIO.readInt16();
                    message.player = BufferIO.readInt8();
                    message.location = enums.locations[BufferIO.readInt8()];
                    message.index = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    break;

                case ('MSG_ATTACK'):
                    message.attacker = {
                        player: BufferIO.readInt8(),
                        location: enums.locations[BufferIO.readInt8()],
                        index: BufferIO.readInt8()
                    };
                    BufferIO.readInt8();
                    message.defender = {
                        player: BufferIO.readInt8(),
                        location: enums.locations[BufferIO.readInt8()],
                        index: BufferIO.readInt8()
                    };
                    BufferIO.readInt8();
                    break;
                case ('MSG_BATTLE'):
                    message.ca = BufferIO.readInt8();
                    message.la = BufferIO.readInt8();
                    message.sa = BufferIO.readInt8();
                    BufferIO.readInt8(); // padding
                    message.aatk = BufferIO.readInt32();
                    message.adef = BufferIO.readInt32();
                    message.da = BufferIO.readInt8(); //defunct
                    message.cd = BufferIO.readInt8();
                    message.ld = BufferIO.readInt8();
                    message.sd = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding
                    message.datk = BufferIO.readInt32();
                    message.ddef = BufferIO.readInt32();
                    message.dd = BufferIO.readInt8(); //defunct
                    break;

                case ('MSG_ATTACK_DISABLED'):
                    //myswprintf(event_string, dataManager.GetSysString(1621), dataManager.GetName(message.attacker->code));
                    break;

                case ('MSG_DAMAGE_STEP_START'):
                    //no code, just a trigger
                    break;

                case ('MSG_DAMAGE_STEP_END'):
                    //no code just a trigger
                    break;
                case ('MSG_MISSED_EFFECT'):
                    BufferIO.readInt8(); //padding
                    message.id = BufferIO.readInt32();
                    break;
                case ('MSG_TOSS_DICE'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.results = [];
                    for (i = 0; i < message.count; ++i) {
                        message.results.push(BufferIO.readInt8());
                    }
                    break;
                case ('MSG_ROCK_PAPER_SCISSORS'):
                    message.player = BufferIO.readInt8();
                    break;
                case ('MSG_HAND_RES'):
                    message.res = BufferIO.readInt8();
                    message.res1 = (message.res & 0x3) - 1;
                    message.res2 = ((message.res >> 2) & 0x3) - 1;
                    break;
                case ('MSG_TOSS_COIN'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.results = [];
                    for (i = 0; i < message.count; ++i) {
                        message.results.push(BufferIO.readInt8());
                    }
                    break;
                case ('MSG_ANNOUNCE_RACE'):
                    message.player = BufferIO.readInt8();
                    message.announce_count = BufferIO.readInt8();
                    message.avaliable = BufferIO.readInt32();
                    break;
                case ('MSG_ANNOUNCE_ATTRIB'):
                    message.player = BufferIO.readInt8();
                    message.announce_count = BufferIO.readInt8();
                    message.avaliable = BufferIO.readInt32();
                    break;
                case ('MSG_ANNOUNCE_CARD'):
                    message.player = BufferIO.readInt8();
                    message.declarable_type = BufferIO.readInt32();
                    break;
                case ('MSG_ANNOUNCE_NUMBER'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.values = [];
                    for (i = 0; i < message.count; ++i) {
                        message.values.push(BufferIO.readInt32());
                    }
                    break;
                case ('MSG_ANNOUNCE_CARD_FILTER'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.opcodes = [];
                    for (i = 0; i < message.count; ++i) {
                        message.opcodes.push(BufferIO.readInt32());
                    }
                    break;
                case ('MSG_CARD_HINT'):
                    message.controller = BufferIO.readInt8();
                    message.location = BufferIO.readInt8();
                    message.sequence = BufferIO.readInt8();
                    BufferIO.readInt8(); //padding
                    message.chtype = BufferIO.readInt8();
                    message.value = BufferIO.readInt32();
                    break;
                case ('MSG_PLAYER_HINT'):
                    message.player = BufferIO.readInt8();
                    message.chtype = BufferIO.readInt8();
                    message.value = BufferIO.readInt32();
                    break;
                case ('MSG_MATCH_KILL'):
                    message.match_kill = BufferIO.readInt32();
                    break;
                case ('MSG_SELECT_IDLECMD'):
                    message.selecting_player = BufferIO.readInt8();
                    message.summonable_cards = getIdleSet(BufferIO);
                    message.spsummonable_cards = getIdleSet(BufferIO);
                    message.repositionable_cards = getIdleSet(BufferIO);
                    message.msetable_cards = getIdleSet(BufferIO);
                    message.ssetable_cards = getIdleSet(BufferIO);
                    message.activatable_cards = getIdleSet(BufferIO, true);
                    message.enableBattlePhase = BufferIO.readInt8();
                    message.enableEndPhase = BufferIO.readInt8();
                    message.shufflecount = BufferIO.readInt8();
                    break;
                case ('MSG_MOVE'):
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8();
                    message.locationAsEnum = BufferIO.readInt8();
                    message.clocation = enums.locations[message.locationAsEnum];
                    if (message.locationAsEnum & 0x80) {
                        message.location = 'OVERLAY';
                    }
                    message.index = BufferIO.readInt8();
                    message.pp = BufferIO.readInt8(); // padding?? previous position??
                    message.moveplayer = BufferIO.readInt8();
                    message.movelocationAsEnum = BufferIO.readInt8();
                    message.movelocation = enums.locations[message.movelocationAsEnum];
                    if (message.movelocationAsEnum & 0x80){
                        message.movelocation = 'OVERLAY';
                    }
                    message.moveindex = BufferIO.readInt8();
                    message.moveposition = enums.positions[BufferIO.readInt8()];
                    message.reason = BufferIO.readInt32(); //debug data??
                    break;

                case ('MSG_POS_CHANGE'):
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8(); // current controller
                    message.location = enums.locations[BufferIO.readInt8()]; // current cLocation
                    message.index = BufferIO.readInt8(); // current sequence (index)
                    message.pp = BufferIO.readInt8(); // padding??
                    message.position = enums.positions[BufferIO.readInt8()]; // current position
                    break;

                case ('MSG_SET'):
                    //check for variables, defunct in the codebase....
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8(); // current controller
                    message.location = enums.locations[BufferIO.readInt8()]; // current cLocation
                    message.index = BufferIO.readInt8(); // current sequence (index)
                    message.position = enums.positions[BufferIO.readInt8()]; // current position
                    break;

                case ('MSG_SWAP'):
                    message.id1 = BufferIO.readInt8(); // defunct in the code
                    message.c1 = BufferIO.readInt8();
                    message.l1 = BufferIO.readInt8();
                    message.s1 = BufferIO.readInt8();
                    message.p1 = BufferIO.readInt8(); //defunct in the code
                    message.id2 = BufferIO.readInt8(); //defunct in the code
                    message.c2 = BufferIO.readInt8();
                    message.l2 = BufferIO.readInt8();
                    message.s2 = BufferIO.readInt8();
                    message.p2 = BufferIO.readInt8(); //defunct in the code
                    break;

                case ('MSG_FIELD_DISABLED'):
                    message.disabled = BufferIO.readInt32();
                    message.ifisfirst_disabled = (message.disabled >> 16) | (message.disabled << 16);
                    break;

                case ('MSG_SPSUMMONING'):
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8();
                    message.location = enums.locations[BufferIO.readInt8()];
                    message.index = BufferIO.readInt8();
                    message.position = enums.positions[BufferIO.readInt8()];
                    break;

                case ('MSG_SUMMONED'):
                    //myswprintf(event_string, dataManager.GetSysString(1604));
                    //graphical only
                    break;

                case ('MSG_SPSUMMONED'):
                    //myswprintf(event_string, dataManager.GetSysString(1606));
                    //graphical only
                    break;

                case ('MSG_FLIPSUMMONED'):
                    //myswprintf(event_string, dataManager.GetSysString(1608));
                    //graphical only
                    break;
                case ('MSG_FLIPSUMMONING'):
                    // notice pp is missing, and everything is upshifted; not repeating code.
                    message.id = BufferIO.readInt32();
                    message.player = BufferIO.readInt8(); // current controller
                    message.location = enums.locations[BufferIO.readInt8()]; // current cLocation
                    message.index = BufferIO.readInt8(); // current sequence (index)
                    message.position = enums.positions[BufferIO.readInt8()]; // current position
                    break;

                case ('MSG_REQUEST_DECK'):

                    break;
                case ('MSG_SELECT_BATTLECMD'):
                    message.selecting_player = BufferIO.readInt8(); // defunct in the code, just reading ahead.
                    message.activatable_cards = getIdleSet(BufferIO, true);
                    message.attackable_cards = [];
                    message.count = BufferIO.readInt8();
                    for (i = 0; i < message.count; ++i) {
                        message.attackable_cards.push({
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8(),
                            diratt: BufferIO.readInt8() // defuct in code
                        });
                    }
                    message.enableMainPhase2 = BufferIO.readInt8();
                    message.enableEndPhase = BufferIO.readInt8();
                    break;
                case ('MSG_SELECT_EFFECTYN'):
                    message.selecting_player = BufferIO.readInt8();
                    message.c = BufferIO.readInt8();
                    message.cl = BufferIO.readInt8();
                    message.cs = BufferIO.readInt8();
                    message.cp = BufferIO.readInt8();
                    break;

                case ('MSG_SELECT_YESNO'):
                    message.selecting_player = BufferIO.readInt8();
                    message.desc = BufferIO.readInt32();
                    break;
                case ('MSG_SELECT_OPTION'):
                    message.selecting_player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.select_options = [];
                    for (i = 0; i < message.count; ++i) {
                        message.select_options.push(BufferIO.readInt32());
                    }
                    break;
                case ('MSG_SELECT_CARD'):
                    message.selecting_player = BufferIO.readInt8();
                    message.select_cancelable = BufferIO.readInt8();
                    message.select_min = BufferIO.readInt8();
                    message.select_max = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.select_options = [];
                    for (i = 0; i < message.count; ++i) {
                        message.select_options.push({
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8(),
                            ss: BufferIO.readInt8()
                        });
                    }
                    break;
                case ('MSG_SELECT_CHAIN'):
                    message.selecting_player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.specount = BufferIO.readInt8();
                    message.forced = BufferIO.readInt8();
                    message.hint0 = BufferIO.readInt32();
                    message.hint1 = BufferIO.readInt32();
                    message.select_options = [];
                    for (i = 0; i < message.count; ++i) {
                        message.select_options.push({
                            flag: BufferIO.readInt8(),
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8(),
                            ss: BufferIO.readInt8(),
                            desc: BufferIO.readInt32()
                        });
                    }

                    break;
                case ('MSG_SELECT_PLACE'):
                    message.selecting_player = BufferIO.readInt8();
                    message.select_min = BufferIO.readInt8();
                    message.selectable_field = ~BufferIO.readInt32(); // mind the bitwise modifier.
                    message.selected_field = 0;
                    message.zones = getSelectableZones(message.selectable_field);
                    break;
                case ('MSG_SELECT_POSITION'):
                    message.selecting_player = BufferIO.readInt8();
                    message.id = BufferIO.readInt32();
                    message.positionsMask = BufferIO.readInt8();
                    message.positions = [];
                    if (message.positionsMask & 0x1) {
                        message.positions.push(enums.positions[0x1]);
                    }
                    if (message.positionsMask & 0x2) {
                        message.positions.push(enums.positions[0x2]);
                    }
                    if (message.positionsMask & 0x4) {
                        message.positions.push(enums.positions[0x4]);
                    }
                    if (message.positionsMask & 0x8) {
                        message.positions.push(enums.positions[0x8]);
                    }
                    break;
                case ('MSG_SELECT_TRIBUTE'):
                    message.selecting_player = BufferIO.readInt8();
                    message.select_cancelable = BufferIO.readInt8() ? true : false;
                    message.select_min = BufferIO.readInt8();
                    message.select_max = BufferIO.readInt8();
                    count = BufferIO.readInt8();
                    message.selectable_targets = [];
                    for (i = 0; i < count; ++i) {
                        message.selectable_targets.push({
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8(),
                            t: BufferIO.readInt8()
                        });
                    }
                    break;

                case ('MSG_SORT_CHAIN'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.selectable_targets = [];
                    for (i = 0; i < message.count; ++i) {
                        message.selectable_targets.push({
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8()
                        });
                    }
                    break;
                case ('MSG_SELECT_COUNTER'):

                    break;
                case ('MSG_SELECT_SUM'):

                    break;
                case ('MSG_SELECT_DISFIELD'):
                    message.selecting_player = BufferIO.readInt8();
                    message.select_min = BufferIO.readInt8();
                    message.selectable_field = ~BufferIO.readInt32(); // mind the bitwise modifier.
                    message.selected_field = 0;
                    break;
                case ('MSG_SORT_CARD'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.selectable_targets = [];
                    for (i = 0; i < message.count; ++i) {
                        message.selectable_targets.push({
                            id: BufferIO.readInt32(),
                            player: BufferIO.readInt8(),
                            location: enums.locations[BufferIO.readInt8()],
                            index: BufferIO.readInt8()
                        });
                    }
                    break;
                case ('MSG_CONFIRM_DECKTOP'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    message.cards = [];
                    for (i = 0; i < message.count; ++i) {
                        message.cards.push(BufferIO.readInt32());
                        BufferIO.move(3);
                    }
                    break;
                case ('MSG_CONFIRM_CARDS'):
                    message.player = BufferIO.readInt8();
                    message.count = BufferIO.readInt8();
                    for (i = 0; i < message.count; ++i) {
                        message.selections.push({
                            c: BufferIO.readInt8(),
                            l: BufferIO.readInt8(),
                            s: BufferIO.readInt8()
                        });
                    }
                    break;
                case ('MSG_UPDATE_DATA'):
                    message.player = BufferIO.readInt8();
                    message.location = enums.locations[BufferIO.readInt8()];
                    message.cards = getFieldCards(gameBoard, message.player, message.location, BufferIO);
                    break;

                case ('MSG_UPDATE_CARD'):
                    message.player = BufferIO.readInt8();
                    message.location = enums.locations[BufferIO.readInt8()];
                    message.index = BufferIO.readInt8();
                    message.card = makeCard(BufferIO, message.player, (gameBoard.masterRule === 4));
                    break;

                case ('MSG_WAITING'):
                    // Nothing happens, ui only.
                    break;
                case ('MSG_SWAP_GRAVE_DECK'):
                    message.player = BufferIO.readInt8();
                    break;

                case ('MSG_REVERSE_DECK'):
                    //all graphical from what I can tell.
                    break;
                case ('MSG_DECK_TOP'):
                    message.player = BufferIO.readInt8();
                    message.index = BufferIO.readInt8();
                    message.id = BufferIO.readInt32();
                    message.rev = ((message.id & 0x80000000) !== 0);
                    break;
                case ('MSG_SHUFFLE_SET_CARD'):
                    message.count = BufferIO.readInt8();
                    message.targets = [];
                    for (i = 0; i < message.count; ++i) {
                        message.targets.push({
                            c: BufferIO.readInt8(),
                            l: BufferIO.readInt8(),
                            s: BufferIO.readInt8()
                        });
                        BufferIO.readInt8();
                    }
                    message.new_cards = [];
                    for (i = 0; i < message.count; ++i) {
                        message.new_cards.push({
                            c: BufferIO.readInt8(),
                            l: BufferIO.readInt8(),
                            s: BufferIO.readInt8()
                        });
                        BufferIO.readInt8();
                    }
                    break;
                case ('MSG_TAG_SWAP'):
                    message.player = BufferIO.readInt8();
                    message.mcount = BufferIO.readInt8();
                    message.ecount = BufferIO.readInt8();
                    message.pcount = BufferIO.readInt8();
                    message.hcount = BufferIO.readInt8();
                    message.topcode = BufferIO.readInt32();
                    message.hand = [];
                    message.extra_deck = [];
                    for (i = 0; i < message.hcount; ++i) {
                        message.hand.push(BufferIO.readInt32());
                    }
                    for (i = 0; i < message.ecount; ++i) {
                        message.extra_deck.push(BufferIO.readInt32());
                    }
                    break;
                case ('MSG_RELOAD_FIELD'):
                    message.lp = [];
                    message.mzone = [];
                    message.stzone = [];
                    message.deck = [];
                    message.hand = [];
                    message.grave = [];
                    for (i = 0; i < 2; ++i) {
                        message.lp[i] = BufferIO.readInt32();
                        for (let seq = 0; seq < 7; ++seq) {
                            val = BufferIO.readInt8();
                            if (val) {
                                let card = {
                                    val: val,
                                    position: BufferIO.readInt8()
                                };
                                message.mzone.push(card);
                                val = BufferIO.readInt8();
                                if (val) {
                                    for (let xyz = 0; xyz < val; ++xyz) {
                                        message.mzone.push({
                                            position: card.position,
                                            sequence: seq,
                                            overlayunit: xyz
                                        });
                                    }
                                }

                            }
                        }
                        for (let seq = 0; seq < 8; ++seq) {
                            val = BufferIO.readInt8();
                            if (val) {
                                message.stzone.push({
                                    sequence: seq,
                                    position: BufferIO.readInt8()
                                });
                            }
                        }
                        val = BufferIO.readInt8();
                        for (let seq = 0; seq < val; ++seq) {
                            message.deck.push({
                                sequence: seq
                            });
                        }
                        val = BufferIO.readInt8();
                        for (let seq = 0; seq < val; ++seq) {
                            message.hand.push({
                                sequence: seq
                            });
                        }

                        val = BufferIO.readInt8();
                        for (let seq = 0; seq < val; ++seq) {
                            message.grave.push({
                                sequence: seq
                            });
                        }
                        val = BufferIO.readInt8();
                        for (let seq = 0; seq < val; ++seq) {
                            message.removed.push({
                                sequence: seq
                            });
                        }
                        message.extra_deck_p = BufferIO.readInt8();
                    }
                    val = BufferIO.readInt8(); //chains
                    message.id = BufferIO.readInt32();
                    message.pcc = BufferIO.readInt8();
                    message.pcl = BufferIO.readInt8();
                    message.pcs = BufferIO.readInt8();
                    message.subs = BufferIO.readInt8();
                    message.cc = BufferIO.readInt8();
                    message.cl = BufferIO.readInt8();
                    message.cs = BufferIO.readInt8();
                    message.desc = BufferIO.readInt32();
                    break;
                default:
                    console.log('Unparsed!:', command, packet, message);
                    break;
            }
            return message;



        case ('STOC_ERROR_MSG'):
            command = enums.STOC.STOC_ERROR_MSG[BufferIO.readInt8()];
            message.command = command;
            // set the screen back to the join screen.
            switch (command) {

                case ('ERRMSG_JOINERROR'):
                    break;
                case ('ERRMSG_DECKERROR'):
                    message.errorCode = packet.message[1];
                    message.cardID = packet.message.readUInt32LE(1);
                    // complain about deck error. Invalid Deck.
                    message.error = (message.errorCode === 1) ? 'Invalid Deck' : 'Invalid Card, ' + message.cardID; // 
                    break;

                case ('ERRMSG_SIDEERROR'):
                    // complain about side deck error.
                    break;
                case ('ERRMSG_VERERROR'):
                    //wierd math to get the version number, displays and complains about it then resets.
                    break;
                default:
            }

            break;

        case ('STOC_SELECT_HAND'):
            //visual only trigger
            break;

        case ('STOC_SELECT_TP'):
            //prompt turn player trigger
            break;

        case ('STOC_HAND_RESULT'):
            message.showcardcode = (packet.message[0] - 1) + ((packet.message[1] - 1) << 16);
            message.showcarddif = 50;
            message.showcardp = 0;
            message.showcard = 100;
            message.res1 = packet.message[0];
            message.res2 = packet.message[1];
            break;

        case ('STOC_TP_RESULT'):
            break;
            //Literally exact code in duelist.cpp for STOC_TP_RESULT

        case ('STOC_CHANGE_SIDE'):
            //display the deck builder
            break;

        case ('STOC_WAITING_SIDE'):
            // graphical reset
            break;

        case ('STOC_CREATE_GAME'):
            break;

        case ('STOC_JOIN_GAME'):
            message.banlistHashCode = packet.message.readUInt16LE(0);
            message.rule = packet.message[4];
            message.mode = packet.message[5];
            message.prio = packet.message[8];
            message.deckcheck = packet.message[7];
            message.noshuffle = packet.message[8];
            message.startLP = packet.message.readUInt16LE(12);
            message.start_hand = packet.message[16];
            message.draw_count = packet.message[17];
            message.time_limit = packet.message.readUInt16LE(18);

            break;
        case ('STOC_TYPE_CHANGE'):
            message.typec = packet.message[0];
            message.pos = message.typec & 0xF;
            message.ishost = ((message.typec >> 4) & 0xF) !== 0;
            break;

        case ('STOC_LEAVE_GAME'):
            break;

        case ('STOC_DUEL_START'):
            //trigger to start duel, nothing more.
            break;

        case ('STOC_DUEL_END'):
            //trigger to close the duel, nothing more.
            break;

        case ('STOC_REPLAY'):
            break;

        case ('STOC_TIME_LIMIT'):
            message.player = packet.message[0];
            message.time = packet.message[1] + packet.message[2];
            break;

        case ('STOC_CHAT'):
            message.from = packet.message[0] + packet.message[1];
            message.chat = packet.message.toString('utf16le', 2).replace(/\0/g, '');
            message.len = message.chat.length;
            break;

        case ('STOC_HS_PLAYER_ENTER'):
            message.person = packet.message.toString('utf16le', 0, 39).replace(/\0/g, '');
            message.messagelen = message.person.length;
            message.person = message.person.replace('\u0000', '');
            break;

        case ('STOC_HS_PLAYER_CHANGE'):
            message.change = packet.message[0];
            message.changepos = (message.change >> 4) & 0xF;
            message.state = message.change & 0xF;
            message.stateText = enums.lobbyStates[message.state];

            break;

        case ('STOC_HS_WATCH_CHANGE'):
            message.spectators = packet.message[0];
            break;

    }
    return message;
}

module.exports = recieveSTOC;