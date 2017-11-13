/*global currentMousePos, getCardObject, reorientmenu, cardIs, $, storedUserlist, primus,prompt, alert, confirm, FileReader, btoa, alertmodal, personOfIntrest, deckeditloader*/


function cardLoadError() {
    var id = $(this).attr('data-id');
    $(this).attr('src', '/img/textures/unknown.jpg');
    // if ($(this).attr('reloaded') === 'failed') {
       
    // }
    // if ($(this).attr('reloaded') === 'attempted') {
    //     $(this).attr('src', getCardObject(parseInt(id, 10)+2).picture);
    //     $(this).attr('reloaded', 'failed');
    // } else {
    //     $(this).attr('reloaded', 'attempted');
    //     if (id !== 'undefined') {
    //         $(this).attr('src', getCardObject(parseInt(id, 10)+1).picture);
    //     } else {
    //         $(this).attr('src', '/img/textures/unknown.jpg');
    //     }

    // }
}

function printError(error) {
    'use strict';
    console.log(error);
}

function getLevel(card) {
    'use strict';
    return card.level & 0xff;
}

function isExtra(card) {
    'use strict';
    return (cardIs('fusion', card) || cardIs('synchro', card) || cardIs('xyz', card) || cardIs('link', card));
}

function cardEvaluate(card) {
    'use strict';
    var value = 0;

    if (cardIs('monster', card)) {
        value -= 100;
    }
    if (card.type === 17) { // normal monster
        value -= 100;
    }
    if (cardIs('ritual', card)) {
        value += 300;
    }
    if (cardIs('fusion', card)) {
        value += 400;
    }
    if (cardIs('synchro', card)) {
        value += 500;
    }
    if (cardIs('xyz', card)) {
        value += 600;
    }
    if (cardIs('link', card)) {
        value += 700;
    }
    if (cardIs('spell', card)) {
        value += 10000;
    }
    if (cardIs('trap', card)) {
        value += 100000;
    }
    return value;

}

function cardStackSort(a, b) {
    'use strict';
    if (cardEvaluate(a) > cardEvaluate(b)) {
        return 1;
    }
    if (cardEvaluate(a) < cardEvaluate(b)) {
        return -1;
    }
    if (getLevel(a) > getLevel(b)) {
        return -1;
    }
    if ((getLevel(a) < getLevel(b))) {
        return 1;
    }
    if (a.atk > b.atk) {
        return -1;
    }
    if (a.atk < b.atk) {
        return 1;
    }
    if (a.def < b.def) {
        return 1;
    }
    if (a.def > b.def) {
        return -1;
    }

    if (a.type > b.type) {
        return 1;
    }
    if (a.type < b.type) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    if (a.name < b.name) {
        return -1;
    }
    if (a.id > b.id) {
        return 1;
    }
    if (a.id < b.id) {
        return -1;
    }
    return 0;
}

function uniqArrayOfStrings(a) {
    'use strict';
    return a.sort().filter(function(item, pos, ary) {
        return !pos || item !== ary[pos - 1];
    });
}

function docardStackSort(db) {
    'use strict';

    if (!db) {
        return [];
    }
    db.sort(cardStackSort);



    return db;
}



var databaseSystem = (function() {
    'use strict';
    var database = [],
        activeBanlist = '',
        banlist = {},
        dbs = {
            'OCGTCG': []
        },
        activedbs = '',
        setcodes,
        status = false,
        completedatabase = [];

    function getBanlist(prop) {
        return (prop) ? banlist[activeBanlist][prop] : banlist[activeBanlist].bannedCards;
    }

    /**
     * Filters duplicate, and unprinted cards out
     * @param   {Array[Object]} list of cards.
     * @returns {Array[Object]} filtered list
     */
    function filterCards(list) {
        var map = {},
            result = [],
            filteredCards = [],
            region = banlist[activeBanlist].region;
        list.forEach(function(card) {
            map[card.id] = card;
        });

        Object.keys(map).forEach(function(id) {
            if (banlist[activeBanlist].bannedCards[id] !== undefined) {
                map[id].limit = parseInt(banlist[activeBanlist].bannedCards[id], 10);
            } else {
                map[id].limit = 3;
            }
            result.push(map[id]);
        });

        filteredCards = result.filter(function(card) {
            if (region && banlist[activeBanlist].endDate) {
                if (card[region]) {
                    if (card[region].date) {
                        return new Date(banlist[activeBanlist].endDate).getTime() > new Date(card[region].date).getTime();
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        });
        return filteredCards;
    }

    /**
     * Exposes the current Database.
     * @returns {Array[Object]} array of cards.
     */
    function getDB() {

        return docardStackSort(database);
    }

    /**
     * Sets the current database based on DB names given.
     * @param   {Array[String]} set array of DB names
     * @returns {Array[Object]}    returns array of cards
     */
    function setDatabase(set) {
        var tokens = [],
            dbsets = set.map(function(dbname) {
                if (dbs[dbname]) {
                    return dbs[dbname];
                } else {
                    return [];
                }
            }),
            listOfCards = dbsets.reduce(function(a, b) {
                return a.concat(b);
            }, []),
            ocgpacks = listOfCards.map(function(card) {
                if (card.ocg) {
                    if (card.ocg.pack_id) {
                        var code = card.ocg.pack_id.split('-');
                        return code[0];
                    }
                    return '';
                }
                return '';
            }),
            tcgpacks = listOfCards.map(function(card) {
                if (card.tcg) {
                    if (card.tcg.pack_id) {
                        var code = card.tcg.pack_id.split('-');
                        return code[0];
                    }
                    return '';
                }
                return '';
            }),
            packs = uniqArrayOfStrings([].concat(tcgpacks, ocgpacks)).filter(function(pack) {
                return (pack && pack.length <= 5);
            }),
            tokenbox = $('#tokendropdown'),
            packsbox = $('.packSelect');
        //console.log(packs.length, tcgpacks, ocgpacks);
        activedbs = set;
        database = filterCards(listOfCards);

        tokens = database.filter(function(card) {
            return (card.type === 16401 || card.type === 16417) && (card.name !== "DO NOT USE");
        });
        tokens.sort(function(current, next) {
            return current.name > next.name;
        });
        $('#tokendropdown').html('');
        tokens.forEach(function(card) {
            var defaulttext = (card.id === 73915052) ? ' selected ' : ''; // sheep token
            tokenbox.append('<option ' + defaulttext + 'value="' + card.id + '">' + card.name + '</option>');
        });

        packs.forEach(function(set) {
            packsbox.append('<option value="' + set + '">' + set + '</option>');
        });


    }

    function setBanlist(newlist) {
        activeBanlist = newlist;
        setDatabase(activedbs);
        return getBanlist();
    }





    $.getJSON('/manifest/manifest_3-Goats.json', function(data) {

        dbs.Goats = data;
    });
    //    $.getJSON('/manifest/manifest_Z-CWA.json', function (data) {
    //        dbs.CWA = data;
    //    });
    $.getJSON('/manifest/banlist.json', function(data) {
        banlist = data;
        $('.banlistSelect').html('');
        Object.keys(banlist).forEach(function(list) {
            var selected = (banlist[list].primary) ? 'selected' : '';
            $('.banlistSelect, #creategamebanlist').append('<option ' + selected + ' value="' + list + '">' + list + '</option>');
        });
        activeBanlist = $('.banlistSelect option:selected').val();
        $.getJSON('/manifest/manifest_0-en-OCGTCG.json', function(data) {
            dbs.OCGTCG = data;
            completedatabase = dbs.OCGTCG;

            setDatabase(['OCGTCG']);
            $('#deckeditloading').remove();
            if (internalLocal === 'deckedit') {
                deckeditloader();
            }

        });
    });

    $.getJSON('./setcodes.json', 'utf-8', function(data) {
        var raw = data,
            setcodes = Object.keys(raw).map(function(arch) {
                return {
                    num: arch,
                    name: raw[arch]
                };
            }).sort(function(a, b) {
                return (a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                }));
            }),
            strings = '<option value="0" data-calc="0">Archetype</option>';

        setcodes.forEach(function(setcode) {
            strings = strings + '<option data-calc="' + setcode.num.slice(2) + '" value="' + parseInt(setcode.num, 16) + '">' + setcode.name + '</option>';
        });

        $('.setcodeSelect').html(strings);
    });


    function directLookup(id) {
        var result = {},
            dbuse = dbs.OCGTCG;

        dbuse.some(function(card, index) {
            if (id === card.id) {
                result = card;
                result.date = new Date(result.date).getTime();
                return true;
            } else {
                return false;
            }
        });

        return result;
    }

    return {
        setDatabase: setDatabase,
        dbs: dbs,
        getDB: getDB,
        getBanlist: getBanlist,
        setBanlist: setBanlist,
        directLookup: directLookup
    };
}());

var deckEditorReference = {};

var currentSearchFilter = (function() {
    'use strict';

    /**
     * Card Filteration Object
     * @returns {object} [[Description]]
     */
    function getFilter() {
        return {
            cardname: undefined,
            description: undefined,
            type: undefined,
            attribute: undefined,
            race: undefined,
            setcode: undefined,
            atk: undefined,
            level: undefined,
            scale: undefined
        };
    }

    var currentSearch = [],
        currentSearchIndex = 0,
        currentSearchPageSize = 15,
        currentSearchNumberOfPages = Math.ceil(currentSearch.length / currentSearchPageSize),
        currentFilter = getFilter(),
        render = [];


    //-----------------------
    //FILTERS BEIGN HERE

    //Filters either attribute or race, depending on the value of AT.
    //at =1 is attribute, Else it's race.
    // Num is the value in the DB for a given attribute or race.
    function fAttrRace(obj, num, at) {

        var val = (at === 1) ? obj.attribute : obj.race;
        if (val === num) {
            return true;
        } else {
            return false;
        }
    }



    //Lv is the level sought. OP is operation.
    //OP =0 is LESS THAN OR EQUAL lv.
    //OP =1 Is EQUALS lv.
    // Else is HIGHER THAN OR EQUAL
    function fLevel(obj, lv, op) {

        var val = obj.level.toString(16);
        lv = parseInt(lv.toString(16), 10);
        if (op === 0) {
            if (parseInt(val.substr(val.length - 2), 10) <= lv) {
                return true;
            } else {
                return false;
            }
        } else if (op === 1) {
            if (parseInt(val.substr(val.length - 2), 10) === lv) {
                return true;
            } else {
                return false;
            }
        } else {
            if (parseInt(val.substr(val.length - 2), 10) >= lv) {
                return true;
            } else {
                return false;
            }
        }
    }

    // Same as Lv, but with SC as the Scale (Assumes Right=Left)
    function fScale(obj, sc, op) {

        var val = obj.level;
        sc = parseInt(sc.toString(16), 0);
        if (op === 0) {
            if (parseInt((val >> 24).toString(16), 0) <= sc) {
                return true;
            } else {
                return false;
            }
        } else if (op === 1) {
            if (parseInt((val >> 24).toString(16), 0) === sc) {
                return true;
            } else {
                return false;
            }
        } else {
            if (parseInt((val >> 24).toString(16), 0) >= sc) {
                return true;
            } else {
                return false;
            }
        }
    }


    // Uses the monsters full Type value from DB to determine.
    //works  either 1 by 1 or against the sum of Type filters.
    function fType(obj, ty) {

        var val = obj.type;
        if ((val & ty) > 0) {
            return true;
        } else {
            return false;
        }
    }

    //As Level, but for ATK/DEF
    //AD =1 is ATK, Else it's DEF being evaluated.
    // Num is the value to compare against.
    function fAtkDef(obj, num, ad, op) {

        var val = (ad === 1) ? obj.atk : obj.def;
        if (op === 0) {
            if (val <= num) {
                return true;
            } else {
                return false;
            }
        } else if (op === 1) {
            if (val === num) {
                return true;
            } else {
                return false;
            }
        } else {
            if (val >= num) {
                return true;
            } else {
                return false;
            }
        }
    }
    // ND=1 is Name, else Desc. Checks if the TXT string is contained.
    function fNameDesc(obj, txt, nd) {

        var val = (nd === 1) ? obj.name.toLowerCase() : obj.desc.toLowerCase();
        if (val.indexOf(txt.toLowerCase()) >= 0) {
            return true;
        } else {
            return false;
        }
    }

    // Filters cards that have 'txt' in their name.
    function filterName(cardsf, txt) {
        if (txt !== undefined) {

            var output = cardsf.filter(function(item) {
                return fNameDesc(item, txt, 1);
            });
            return output;
        }
        return cardsf;
    }

    function filterSet(cardsf, set) {
        if (set === undefined) {
            return cardsf;
        }

        function check(card, region) {
            if (card[region]) {
                if (card[region].pack_id) {
                    var code = card[region].pack_id.split('-');
                    return code[0];
                }
                return '';
            }
            return '';
        }
        return cardsf.filter(function(card) {
            return (check(card, 'ocg') === set || check(card, 'tcg') === set);
        });

    }
    //Filters effect or flavor texts for the txt string
    function filterDesc(cardsf, txt) {
        if (txt !== undefined) {

            var output = cardsf.filter(function(item) {
                return fNameDesc(item, txt, 0);
            });
            return output;
        }
        return cardsf;
    }

    // Returns all cards that have all the types input.
    function filterType(cardsf, type) {
        if (type !== undefined) {

            var output = cardsf.filter(function(item) {
                return fType(item, type);
            });
            return output;
        }
        return cardsf;
    }

    //Attribute must matcht he arg.
    function filterAttribute(cardsf, attribute) {
        if (attribute !== undefined) {

            var output = cardsf.filter(function(item) {
                return fAttrRace(item, attribute, 1);
            });
            return output;
        }
        return cardsf;
    }

    //Returns Cards whose race matches the arg.
    function filterRace(cardsf, race) {
        if (race !== undefined) {

            var output = cardsf.filter(function(item) {
                return fAttrRace(item, race, 0);
            });
            return output;
        }
        return cardsf;
    }

    //SC is setcode in decimal. This handles all possible combinations.
    function fSetcode(obj, sc) {

        var val = obj.setcode,
            hexA = val.toString(16),
            hexB = sc.toString(16);
        if (val === sc || parseInt(hexA.substr(hexA.length - 4), 16) === parseInt(hexB, 16) || parseInt(hexA.substr(hexA.length - 2), 16) === parseInt(hexB, 16) || (val >> 16).toString(16) === hexB) {
            return true;
        } else {
            return false;
        }
    }
    //All cards that share at least 1 setcode with the arg.
    function filteSetcode(cardsf, setcode) {
        if (setcode !== undefined) {
            var output = cardsf.filter(function(item) {
                return fSetcode(item, setcode);
            });
            return output;
        }
        return cardsf;
    }

    //OP here functions just as in the previous function.
    //OP=0 is LOWER THAN OR EQUAL to 
    //OP=1 is EQUALS to 
    //Else it's HIGHER THAN OR EQUAL
    function filterAtk(cardsf, atk, op) {
        if (atk !== undefined) {

            var output = cardsf.filter(function(item) {
                return fAtkDef(item, atk, 1, op);
            });
            return output;
        }
        return cardsf;
    }



    //As above, but DEF
    function filterDef(cardsf, def, op) {
        if (def !== undefined) {

            var output = cardsf.filter(function(item) {
                return fAtkDef(item, def, 0, op);
            });
            return output;
        }
        return cardsf;
    }
    //Just Level.. Zzz as Atk/Def
    function filterLevel(cardsf, level, op) {
        if (level !== undefined) {
            var output = cardsf.filter(function(item) {
                return fLevel(item, level, op);
            });
            return output;
        }
        return cardsf;
    }

    function filterSetcode(result, setcode) {
        if (setcode) {
            return result.filter(function(item) {
                return fSetcode(item, setcode);
            });
        } else {
            return result;
        }

    }

    function filterLimit(result, limit) {
        if (limit !== undefined) {
            return result.filter(function(item) {
                return item.limit === limit;
            });
        } else {
            return result;
        }
    }

    function filterScale(result, scale, op) {
        if (scale !== undefined) {
            return result.filter(function(item) {
                return fScale(item, scale, op);
            });
        } else {
            return result;
        }
    }

    function filterExactType(result, type) {
        if (type !== undefined) {
            return result.filter(function(item) {
                return item.type === type;
            });
        } else {
            return result;
        }
    }

    function filterToken(result) {
        return result.filter(function(item) {
            //item is not a token
            return item.type !== 16401;
        });
    }

    function filterAll(cards, filter) {
        var cardsf = cards;
        cardsf = filterLimit(cardsf, filter.limit) || cardsf;
        cardsf = filterExactType(cardsf, filter.exacttype) || cardsf;
        cardsf = filterName(cardsf, filter.cardname) || cardsf;
        cardsf = filterDesc(cardsf, filter.description) || cardsf;
        cardsf = filterType(cardsf, filter.type) || cardsf;
        cardsf = filterType(cardsf, filter.type1) || cardsf;
        cardsf = filterType(cardsf, filter.type2) || cardsf;
        cardsf = filterAttribute(cardsf, filter.attribute) || cardsf;
        cardsf = filterRace(cardsf, filter.race) || cardsf;
        cardsf = filterSetcode(cardsf, filter.setcode) || cardsf;
        cardsf = filterAtk(cardsf, filter.atk, filter.atkop) || cardsf;
        cardsf = filterDef(cardsf, filter.def, filter.defop) || cardsf;
        cardsf = filterLevel(cardsf, filter.level, filter.levelop) || cardsf;
        cardsf = filterScale(cardsf, filter.scale, filter.scaleop) || cardsf;
        cardsf = filterSet(cardsf, filter.set) || cardsf;
        cardsf = filterToken(cardsf) || cardsf;
        return cardsf;
    }


    function preformSearch() {
        currentSearch = filterAll(databaseSystem.getDB(), currentFilter);
        currentSearchIndex = 0;
    }

    function renderSearch() {
        render = currentSearch.slice(currentSearchIndex, currentSearchPageSize);
        currentSearchNumberOfPages = Math.ceil(render.length / currentSearchPageSize);
        return render;
    }

    function pageForward() {
        var attempted = currentSearchIndex + currentSearchPageSize;

        if (attempted > currentSearch.length) {
            currentSearchIndex = currentSearch.length - currentSearchPageSize;
            renderSearch();
            return;
        }
        currentSearchIndex = attempted;
        renderSearch();
    }

    function pageBack() {
        var attempted = currentSearchIndex - currentSearchPageSize;
        if (attempted < 0) {
            currentSearchIndex = 0;
            renderSearch();
            return;
        }
        currentSearchIndex = attempted;
        renderSearch();
    }

    function setFilter(prop, value) {
        if (!value && value !== 0) {
            return;
        }
        currentFilter[prop] = value;
        preformSearch();
    }

    function clearFilter() {
        currentFilter = getFilter();
        currentSearchIndex = 0;
        preformSearch();
    }

    function getRender(newSearch) {
        if (newSearch || currentSearch.length === 0) {
            preformSearch();
        }
        return currentSearch.slice(currentSearchIndex, currentSearchIndex + currentSearchPageSize);
    }
    return {
        preformSearch: preformSearch,
        getRender: getRender,
        setFilter: setFilter,
        clearFilter: clearFilter,
        pageForward: pageForward,
        pageBack: pageBack,
        currentSearchIndex: currentSearchIndex
    };
}());

var deckEditor = (function() {
    'use strict';
    var inmemoryDeck = {},
        usersDecks = [],
        activeIndex = 0,
        friends = [];

    /**
     * Shuffles array in place.
     * @param {Array} a items The array containing the items This function is in no way optimized.
     */
    function shuffle(deck) {
        var j, x, index;
        for (index = deck.length; index; index--) {
            j = Math.floor(Math.random() * index);
            x = deck[index - 1];
            deck[index - 1] = deck[j];
            deck[j] = x;
        }
    }

    function makeBlankDeck(name, username, date) {
        return {
            main: [],
            extra: [],
            side: [],
            name: name,
            creator: username,
            creationDate: date
        };
    }

    function getInmemoryDeck() {
        return inmemoryDeck;
    }

    function makeNewDeck(name) {
        return makeBlankDeck(name, localStorage.nickname, new Date());

    }

    function updateDeckSelect() {
        var text = '';
        usersDecks.forEach(function(deck, index) {
            text += '<option data-index=' + index + '>' + deck.name + '</option>';
        });
        return text;
    }

    function makeCard(cards, zone) {
        var html = '';
        cards.forEach(function(card, index) {
            var hardcard = JSON.stringify(card),
                src = card.id + '.png';
            html += '<div class="searchwrapper" data-card-limit="' + card.limit + '">';
            html += '<img class="deckeditcard card" id="deceditcard' + index + zone + '" data-dropindex="' + index + '" data-dropzone="' + zone + '"  data-id = "' + card.id + '"';
            html += 'src="'+getCardObject(parseInt(card.id, 10)).picture+'" data-id="' + card.id + '" ondragstart="createCardReference(\'' + zone + '\', ' + index + ');" onclick = "deckeditonclick(' + index + ', \'' + zone + '\')" / >';
            html += '</div>';
        });

        $('#deckedit .cardspace .' + zone).html(html);
        $('#deckedit .cardspace .' + zone + ' img').error(cardLoadError);

        //$('#subreveal').width(cards.length * 197);
    }

    function pullcard(id, data) {
        return data.filter(function(card, index) {
            if (id === card.id) {
                return true;
            } else {
                return false;
            }
        })[0];
    }


    function exporter() {
        var file = '#Created by ' + inmemoryDeck.creator + ' on ' + inmemoryDeck.creationDate + '\r\n#main';

        function printCard(card) {
            file += card.id + '\r\n';
        }

        inmemoryDeck.main.forEach(printCard);
        file += '#extra\r\n';
        inmemoryDeck.extra.forEach(printCard);
        file += '!side\r\n';
        inmemoryDeck.side.forEach(printCard);

        return 'data:application/octet-stream;charset=utf-16le;base64,' + btoa(file);
    }


    function typingLength(category, deck) {
        return inmemoryDeck[deck].filter(function(card, index, array) {
            return cardIs(category, card);
        }).length;
    }

    function renderDeckZone(deck) {
        makeCard(deck.main, 'main');
        makeCard(deck.extra, 'extra');
        makeCard(deck.side, 'side');

        var floatMarkerMain = 's' + Math.ceil(deck.main.length / 4),
            floatMarkerExtra = 's' + deck.extra.length,
            floatMarkerSide = 's' + deck.side.length,
            sorter = {
                main: {},
                side: {},
                extra: {}
            },
            mainMonsters = typingLength('monster', 'main'),
            mainSpells = typingLength('spell', 'main'),
            mainTraps = typingLength('trap', 'main'),
            extraFusions = typingLength('fusion', 'extra'),
            extraSynchros = typingLength('synchro', 'extra'),
            extraXYZ = typingLength('xyz', 'extra'),
            extraLink = typingLength('link', 'extra'),
            sideMonsters = typingLength('monster', 'side'),
            sideSpells = typingLength('spell', 'side'),
            sideTraps = typingLength('trap', 'side'),
            sideFusions = typingLength('fusion', 'side'),
            sideSynchros = typingLength('synchro', 'side'),
            sideXYZ = typingLength('xyz', 'side'),
            sideLink = typingLength('link', 'side');



        $('#deckedit .cardspace .main').attr('floatmarker', floatMarkerMain);
        $('#deckedit .cardspace .extra').attr('floatmarker', floatMarkerExtra);
        $('#deckedit .cardspace .side').attr('floatmarker', floatMarkerSide);

        deck.main.forEach(function(card) {
            if (sorter.main[card.id] === undefined) {
                sorter.main[card.id] = {
                    unit: 1,
                    card: card
                };
                return;
            }
            if (sorter.main[card.id]) {
                sorter.main[card.id].unit++;
            }
        });
        deck.extra.forEach(function(card) {
            if (sorter.extra[card.id] === undefined) {
                sorter.extra[card.id] = {
                    unit: 1,
                    card: card
                };
                return;
            }
            if (sorter.extra[card.id]) {
                sorter.extra[card.id].unit++;
            }
        });
        deck.side.forEach(function(card) {
            if (sorter.side[card.id] === undefined) {
                sorter.side[card.id] = {
                    unit: 1,
                    card: card
                };
                return;
            }
            if (sorter.side[card.id]) {
                sorter.side[card.id].unit++;
            }
        });
        $('#decktextoutput').html('Main Deck ' + deck.main.length + 'x<br/>');
        $('.infoclassmain').html('Main Deck Total: ' + deck.main.length + ' | Monsters: ' + mainMonsters + ' | Spells: ' + mainSpells + ' | Traps: ' + mainTraps);
        Object.keys(sorter.main).sort(function(a, b) {
            return cardStackSort(sorter.main[a].card, sorter.main[b].card);
        }).forEach(function(id) {
            $('#decktextoutput').append(sorter.main[id].unit + 'x ' + sorter.main[id].card.name + '<br />');

        });

        $('#decktextoutput').append('<br />Extra Deck ' + deck.extra.length + 'x<br/>');
        $('.infoclassextra').html('Extra Deck Total: ' + deck.extra.length + ' | Fusions: ' + extraFusions + ' | Synchros: ' + extraSynchros + ' | XYZs: ' + extraXYZ + ' | Links: ' + extraLink);
        Object.keys(sorter.extra).sort(function(a, b) {
            return cardStackSort(sorter.extra[a].card, sorter.extra[b].card);
        }).forEach(function(id) {
            $('#decktextoutput').append(sorter.extra[id].unit + 'x ' + sorter.extra[id].card.name + '<br />');
        });

        $('#decktextoutput').append('<br/ >Side Deck ' + deck.side.length + 'x<br/>');
        $('.infoclassside').html('Side Deck Total: ' + deck.side.length + ' | Monsters: ' + sideMonsters + ' | Spells: ' + sideSpells + ' | Traps: ' + sideTraps + ' | Fusions: ' + sideFusions + ' | Synchros: ' + sideSynchros + ' | XYZs: ' + sideXYZ + ' | Links: ' + sideLink);
        Object.keys(sorter.side).sort(function(a, b) {
            return cardStackSort(sorter.side[a].card, sorter.side[b].card);
        }).forEach(function(id) {
            $('#decktextoutput').append(sorter.side[id].unit + 'x ' + sorter.side[id].card.name + '<br />');
        });

        $('#deckexporter').attr('href', exporter()).attr('download', inmemoryDeck.name + '.ydk');

    }


    function doSearch() {
        var search = currentSearchFilter.getRender();
        inmemoryDeck.search = search;
        makeCard(search, 'search');
    }

    function externalDoSearch() {
        var search,
            description,
            name;
        if (description || name) {
            search = currentSearchFilter.getRender();
            inmemoryDeck.search = search;
            makeCard(search, 'search');
        }
    }

    function renderFriendsList() {
        var userlist = '';
        friends = friends.sort(function(a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        friends.forEach(function(name) {
            var jsco = "userlistonclick('" + name + "');",
                isOnline = (storedUserlist.indexOf(name) > -1) ? 'data-online' : '';
            userlist = userlist + '<li ' + isOnline + ' onclick="' + jsco + '">' + name.trim() + '</li>';
        });
        $('#friendslist').html(userlist);
    }

    function condenseDeck(card) {
        return {
            id: card.id
        };
    }

    function condenseDecks(decks) {
        return decks.map(function(deck) {
            return {
                main: deck.main.map(condenseDeck),
                extra: deck.extra.map(condenseDeck),
                side: deck.side.map(condenseDeck),
                name: deck.name,
                creator: deck.creator,
                creationDate: deck.creationDate
            };
        });
    }

    function addFriend() {
        friends.push(personOfIntrest);
        friends = friends.filter(function(item, pos, self) {
            return self.indexOf(item) === pos;
        });
        primus.write({
            action: 'save',
            decks: condenseDecks(usersDecks),
            friends: friends,
            username: localStorage.nickname
        });
        renderFriendsList();
    }

    function removeFriend() {
        friends.splice(friends.indexOf(personOfIntrest), 1);
        primus.write({
            action: 'save',
            decks: usersDecks,
            friends: friends,
            username: localStorage.nickname
        });
        renderFriendsList();
    }

    function getFriends() {
        return friends;
    }



    function doNewSearch() {

        var cardname = $('.nameInput').val(),
            description = $('.descInput').val(),
            typeSelect = $('.typeSelect option:selected').val(),
            atk = $('.atkInput').val(),
            def = $('.defInput').val(),
            level = $('.levelInput').val(),
            scale = $('.scaleInput').val(),
            atkop = $('#attackrangeop').val(),
            defop = $('#defenserangeop').val(),
            levelop = $('#levelrangeop').val(),
            scaleop = $('#scalerangeop').val(),
            set = $('.packSelect').val(),
            attribute = $('.attributeSelect option:selected').val(),
            race = $('.raceSelect option:selected').val(),
            limit = $('.forbiddenLimitedSelect option:selected').val(),
            setcode = parseInt($('.setcodeSelect option:selected').val() || 0, 10),
            monsterTypeValue = parseInt($('.monsterTypeSelect').val() || 0, 10),
            monsterCardValue = parseInt($('.monsterCardSelect').val() || 0, 10),
            type;

        currentSearchFilter.clearFilter();
        currentSearchFilter.getRender(true);
        currentSearchFilter.setFilter('setcode', setcode);
        if (cardname) {
            currentSearchFilter.setFilter('cardname', cardname);
        }
        if (description) {
            currentSearchFilter.setFilter('description', description);
        }
        if (limit.length) {
            currentSearchFilter.setFilter('limit', parseInt(limit, 10));
        }
        if (set) {
            currentSearchFilter.setFilter('set', set);
        }

        //currentSearchFilter.setFilter('type', parseInt(typeSelect, 10));
        if (typeSelect === '1') {
            currentSearchFilter.setFilter('type', 1);

            if (monsterCardValue) {
                currentSearchFilter.setFilter('type1', parseInt(monsterCardValue, 10));
            }
            if (monsterTypeValue) {
                currentSearchFilter.setFilter('type2', parseInt(monsterTypeValue, 10));
            }
            if (atk) {
                currentSearchFilter.setFilter('atk', parseInt(atk, 10));
                currentSearchFilter.setFilter('atkop', parseInt(atkop, 10));
            }
            if (def) {
                currentSearchFilter.setFilter('def', parseInt(def, 10));
                currentSearchFilter.setFilter('defop', parseInt(defop, 10));
            }
            if (level) {
                currentSearchFilter.setFilter('level', parseInt(level, 10));
                currentSearchFilter.setFilter('levelop', parseInt(levelop, 10));
            }
            if (scale) {
                currentSearchFilter.setFilter('scale', parseInt(scale, 10));
                currentSearchFilter.setFilter('scaleop', parseInt(scaleop, 10));
            }
            if (attribute) {
                currentSearchFilter.setFilter('attribute', parseInt(attribute, 10));
            }
            if (race) {
                currentSearchFilter.setFilter('race', parseInt(race, 10));
            }
        }
        if (typeSelect === '2') {
            currentSearchFilter.setFilter('type', 2);
            currentSearchFilter.setFilter('exacttype', parseInt($('.spellSelect option:selected').val(), 10));
        }
        if (typeSelect === '4') {
            currentSearchFilter.setFilter('type', 4);
            currentSearchFilter.setFilter('exacttype', parseInt($('.trapSelect option:selected').val(), 10));
        }
        doSearch();
    }

    function reset() {
        $('#deckedit .searchRight input').val('');
        $('#deckedit .searchRight select').each(function() {
            var dropdown = $(this);
            dropdown.val(dropdown.find('option').first().val());
        });
        $('.typeSelect').change();
    }



    function saveDeck() {
        inmemoryDeck.creationDate = new Date();
        usersDecks[activeIndex] = JSON.parse(JSON.stringify(inmemoryDeck));
        var message = {
            action: 'save',
            decks: condenseDecks(usersDecks),
            friends: friends,
            username: localStorage.nickname
        };
        primus.write(message);
    }

    function switchDecks(index) {
        activeIndex = index;
        inmemoryDeck = JSON.parse(JSON.stringify(usersDecks[activeIndex]));
        renderDeckZone(inmemoryDeck);
        $('.deckSelect').val(activeIndex);
        doSearch();
    }

    function expandDeck(card, index, deck) {

        var output = databaseSystem.directLookup(card.id);
        return output;
    }

    function labelMain(card) {
        card.zone = 'main';
        return card;
    }

    function labelExtra(card, index, array, thing) {
        card.zone = 'extra';
        return card;
    }

    function labelSide(card) {
        card.zone = 'side';
        return card;
    }

    function expandDecks(decks) {
        if (!decks) {
            return false;
        }
        var output = decks.map(function(deck) {
            var expanded = {
                main: deck.main.map(expandDeck),
                extra: deck.extra.map(expandDeck),
                side: deck.side.map(expandDeck),
                name: deck.name,
                creator: deck.creator,
                creationDate: deck.creationDate
            };
            expanded.main = expanded.main.map(labelMain);
            expanded.extra = expanded.extra.map(labelMain);
            expanded.side = expanded.side.map(labelMain);
            return expanded;
        });
        return output;
    }



    function loadDecks(decks) {
        usersDecks = expandDecks(decks) || [makeNewDeck('New Deck')];
        $('.deckSelect,  #lobbycurrentdeck select').html('');
        usersDecks.forEach(function(deck, index) {
            $('.deckSelect, #lobbycurrentdeck select').append('<option value="' + index + '">' + deck.name + '</option>');
        });
        switchDecks(activeIndex);
        doSearch();
    }

    function loadFriends(newFriends) {
        friends = newFriends;
        renderFriendsList();
    }

    function getDeck(index) {
        return JSON.parse(JSON.stringify(usersDecks[index]));
    }



    function clearCurrentDeck() {
        inmemoryDeck = makeNewDeck(usersDecks[activeIndex].name);
        renderDeckZone(inmemoryDeck);
        doSearch();
    }

    function deleteDeck() {
        var okToDelete = confirm('Delete ' + inmemoryDeck.name + '?');
        if (!okToDelete) {
            return;
        }
        if (usersDecks.length === 1) {
            alertmodal('Thats your last Deck!');
            return;
        }
        usersDecks.splice(activeIndex, 1);
        activeIndex = 0;
        inmemoryDeck = JSON.parse(JSON.stringify(usersDecks[activeIndex]));
        saveDeck();
        loadDecks(usersDecks);
    }

    function moveInArray(array, old_index, new_index) {
        if (new_index >= array.length) {
            var k = new_index - array.length;
            while ((k--) + 1) {
                array.push(undefined);
            }
        }
        array.splice(new_index, 0, array.splice(old_index, 1)[0]);
        return array; // for testing purposes
    }

    function checkLegality(card, deck) {
        function checkCard(reference) {
            var id = card.alias || card.id;
            if (reference.id === id || reference.alias === id) {
                return true;
            }
            return false;
        }
        var masterRule = databaseSystem.getBanlist('masterRule'),
            mainCount = inmemoryDeck.main.filter(checkCard).length,
            extraCount = inmemoryDeck.extra.filter(checkCard).length,
            sideCount = inmemoryDeck.side.filter(checkCard).length;

        if (mainCount + extraCount + sideCount >= card.limit) {
            return false;
        }
        if (deck === 'main' && inmemoryDeck[deck].length >= 60 && masterRule > 0) {
            return false;
        }
        if (deck === 'side' && inmemoryDeck[deck].length >= 15) {
            return false;
        }
        if (deck === 'extra' && inmemoryDeck[deck].length >= 15 && masterRule > 0) {
            return false;
        }
        return true;
    }

    function spaceCheck() {}

    function deckEditorMoveTo(deck) {
        var masterRule = databaseSystem.getBanlist('masterRule');
        if (deck === 'main' && inmemoryDeck[deck].length >= 60 && masterRule > 0) {
            return false;
        }
        if (deck === 'side' && inmemoryDeck[deck].length >= 15) {
            return false;
        }
        if (deck === 'extra' && inmemoryDeck[deck].length >= 15 && masterRule > 0) {
            return false;
        }
        moveInArray(inmemoryDeck[deckEditorReference.zone], deckEditorReference.index, 0);
        var card = inmemoryDeck[deckEditorReference.zone].shift();
        //inmemoryDeck[deck] = docardStackSort(inmemoryDeck[deck]);
        inmemoryDeck[deck].push(card);

        renderDeckZone(inmemoryDeck);

    }

    function sortDeck() {
        inmemoryDeck.main = docardStackSort(inmemoryDeck.main);
        inmemoryDeck.extra = docardStackSort(inmemoryDeck.extra);
        inmemoryDeck.side = docardStackSort(inmemoryDeck.side);
        renderDeckZone(inmemoryDeck);
    }

    function shuffleMainDeck() {
        shuffle(inmemoryDeck.main);
        renderDeckZone(inmemoryDeck);
    }

    function moveInSameZone(deck, oldIndex, newIndex) {
        moveInArray(inmemoryDeck[deck], oldIndex, newIndex);
        renderDeckZone(inmemoryDeck);
    }

    function addCardFromSearch(deck) {

        if (deckEditorReference.zone === deck) {
            return;
        }
        if (!checkLegality(deckEditorReference, deck)) {
            return;
        }
        inmemoryDeck[deck].push(deckEditorReference);
        //docardStackSort(inmemoryDeck[deck]);
        renderDeckZone(inmemoryDeck);

    }

    function removeCard(deck) {
        inmemoryDeck[deckEditorReference.zone].splice(deckEditorReference.index, 1);
        renderDeckZone(inmemoryDeck);
    }

    function rename() {

        var deckName = prompt('New Deck Name?', inmemoryDeck.name),
            deckCheck = usersDecks.filter(function(deck) {
                return (deck.name === deckName);
            });

        if (!deckName) {
            return;
        }
        if (deckCheck.length) {
            alertmodal('Deck Name Already Exist');
            return;
        }
        inmemoryDeck.name = deckName;
        saveDeck();
        loadDecks(usersDecks);
    }

    function createNewDeck(newDeck) {
        if (usersDecks.length > 60) {
            // obviously lying.
            alertmodal('You own more than 60 decks. We cant store that many for you!');
        }
        var deckName = prompt('New Deck Name?', 'New Deck'),
            deckCheck = usersDecks.filter(function(deck) {
                return (deck.name === deckName);
            });

        if (!deckName) {
            return;
        }
        if (deckCheck.length) {
            alertmodal('Deck Name Already Exist');
            return;
        }
        if (newDeck !== undefined) {
            newDeck.name = deckName;
            usersDecks.push(newDeck);
            //console.log(usersDecks);
        } else {
            usersDecks.push(makeNewDeck(deckName));
        }

        switchDecks(usersDecks.length - 1);
        saveDeck();
        loadDecks(usersDecks);
        doNewSearch();

    }

    function saveDeckAs() {
        var newDeck = JSON.parse(JSON.stringify(inmemoryDeck));
        createNewDeck(newDeck);
    }


    loadDecks([makeNewDeck('New Deck')]);

    function makeDeckfromydk(ydkFileContents) {
        var lineSplit = ydkFileContents.split("\n"),
            originalValues = {
                "main": [],
                "side": [],
                "extra": []
            },
            current = "";
        lineSplit = lineSplit.map(function(item) {
            return item.trim();
        });
        try {
            lineSplit.forEach(function(value) {
                if (value === "") {
                    return;
                }
                if (value[0] === "#" || value[0] === "!") {
                    if (originalValues.hasOwnProperty(value.substr(1))) {
                        current = value.substr(1);
                    } else {
                        return;
                    }
                } else {
                    originalValues[current].push(value);
                }
            });
        } catch (er) {
            printError(er);
        }
        return originalValues;
    }




    function filterPulledCard(card) {
        return (card !== undefined);
    }

    function upload(ydk) {
        var newDeck = makeDeckfromydk(ydk),
            data = databaseSystem.getDB();

        newDeck.creator = localStorage.nickname;
        newDeck.creationDate = new Date();
        newDeck.main = newDeck.main.map(function(cardid) {
            var card = pullcard(parseInt(cardid, 10), data);

            return card;
        });
        newDeck.side = newDeck.side.map(function(cardid) {
            return pullcard(parseInt(cardid, 10), data);
        });
        newDeck.extra = newDeck.extra.map(function(cardid) {
            return pullcard(parseInt(cardid, 10), data);
        });

        createNewDeck(newDeck);
    }

    return {
        getDeck: getDeck,
        createNewDeck: createNewDeck,
        updateDeckSelect: updateDeckSelect,
        addCardFromSearch: addCardFromSearch,
        deckEditorMoveTo: deckEditorMoveTo,
        removeCard: removeCard,
        deleteDeck: deleteDeck,
        clearCurrentDeck: clearCurrentDeck,
        loadDecks: loadDecks,
        switchDecks: switchDecks,
        saveDeck: saveDeck,
        saveDeckAs: saveDeckAs,
        doSearch: doSearch,
        renderDeckZone: renderDeckZone,
        makeCard: makeCard,
        makeNewDeck: makeNewDeck,
        usersDecks: usersDecks,
        activeIndex: activeIndex,
        doNewSearch: doNewSearch,
        getInmemoryDeck: getInmemoryDeck,
        rename: rename,
        upload: upload,
        addFriend: addFriend,
        removeFriend: removeFriend,
        getFriends: getFriends,
        loadFriends: loadFriends,
        renderFriendsList: renderFriendsList,
        moveInSameZone: moveInSameZone,
        sortDeck: sortDeck,
        shuffleMainDeck: shuffleMainDeck,
        reset: reset
    };
}());

/**
 * Creates a card reference.
 * @param {Number} zone  zone card was clicked in.
 * @param {Number} index of card being clicked
 */
function createCardReference(zone, index) {
    'use strict';
    deckEditorReference = {
        id: deckEditor.getInmemoryDeck()[zone][index].id,
        name: deckEditor.getInmemoryDeck()[zone][index].name,
        alias: deckEditor.getInmemoryDeck()[zone][index].alias,
        zone: zone,
        index: index,
        type: deckEditor.getInmemoryDeck()[zone][index].type,
        atk: deckEditor.getInmemoryDeck()[zone][index].atk,
        def: deckEditor.getInmemoryDeck()[zone][index].def,
        limit: deckEditor.getInmemoryDeck()[zone][index].limit
    };
}

/**
 * Opens the proper action menu for the card type
 * @param {Number} zone  zone card was clicked in.
 * @param {Number} index of card being clicked
 */
function openActionMenu(zone, index) {
    'use strict';

    var dbEntry = deckEditorReference,
        viewable = {
            'display': 'block'
        };
    if (zone === 'main') {
        $('.de-toside, .de-frommain').css(viewable);

    }
    if (zone === 'extra') {
        $('.de-toside, .de-fromextra').css(viewable);
    }
    if (zone === 'side') {
        if (cardIs('xyz', dbEntry) || cardIs('fusion', dbEntry) || cardIs('synchro', dbEntry) || cardIs('link', dbEntry)) {
            $('.de-toextra, .de-fromextra').css(viewable);
        } else {
            $('.de-tomain, .de-fromextra').css(viewable);
        }
    }
    if (zone === 'search') {
        if (cardIs('xyz', dbEntry) || cardIs('fusion', dbEntry) || cardIs('synchro', dbEntry) || cardIs('link', dbEntry)) {
            $('.de-addtoextra, .de-addtoside').css(viewable);
        } else {
            $('.de-addtomain, .de-addtoside').css(viewable);
        }
    }
}

/**
 * Opens action menu and sets deck edit card reference.
 * @param {Number} index of card being clicked
 * @param {Number} zone  zone card was clicked in.
 */
function deckeditonclick(index, zone) {

    'use strict';

    $('#manualcontrols button').css({
        'display': 'none'
    });

    $('#manualcontrols').css({
        'top': currentMousePos.y,
        'left': currentMousePos.x,
        'display': 'block'
    });

    createCardReference(zone, index);
    openActionMenu(zone, index);
    reorientmenu();
    return;
}

//$('.descInput, .nameInput').on('input', deckEditor.doNewSearch);

$('.descInput, .nameInput').keypress('input', function(event) {
    'use strict';
    if (event.which === 13) {
        deckEditor.doNewSearch();
    }

});
$('.typeSelect, .monsterCardSelect, .monsterTypeSelect, .spellSelect, .trapSelect, .attributeSelect, .raceSelect, .setcodeSelect, .forbiddenLimitedSelect, .packSelect').on('change', deckEditor.doNewSearch);

$('.atkInput, .defInput, .levelInput, .scaleInput, .searchrange').on('change', deckEditor.doNewSearch);
$('.typeSelect').on('change', function() {
    'use strict';
    var target = $('.typeSelect option:selected').text();
    $('.monsterCardSelect, .monsterTypeSelect, .spellSelect, .trapSelect, .attributeSelect, .raceSelect').css('display', 'none');
    $('.attributeSelectl, .raceSelectl').css('display', 'none');
    switch (target) {
        case 'Monster':
            $('.monsterCardSelect, .monsterTypeSelect, .attributeSelect, .raceSelect').css('display', 'block');
            $('.attributeSelectl, .raceSelectl').css('display', 'block');
            break;
        case 'Spells':
            $('.spellSelect').css('display', 'block');
            break;
        case 'Traps':
            $('.trapSelect').css('display', 'block');
            break;
        default:
            break;
    }
});


$('.databaseSelect').on('change', function() {
    'use strict';
    var newDB = $('.databaseSelect').val();
    databaseSystem.setDatabase([newDB]);
    deckEditor.doNewSearch();
});

$('.banlistSelect').on('change', function() {
    'use strict';
    var newList = $('.banlistSelect').val();
    databaseSystem.setBanlist(newList);
    deckEditor.doNewSearch();
});

$('.deckSelect, #lobbycurrentdeck select').on('change', function() {
    'use strict';
    deckEditor.switchDecks(parseInt($('.deckSelect').val(), 10));
});


function readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    'use strict';
    var f = evt.target.files[0],
        r;

    if (f) {
        r = new FileReader();
        r.onload = function(e) {
            var contents = e.target.result,
                action = false;

            action = confirm('Upload Deck?');
            if (action) {
                deckEditor.upload(contents);
            }

        };
        r.readAsText(f);
    } else {
        alertmodal("Failed to load file");
    }
}

$('#deckupload').on('change', readSingleFile);


$("#deckedit .mainDeck,#deckedit .extraDeck,#deckedit .sideDeck").on("dragover dragleave", function(event) {
    'use strict';
    event.preventDefault();
    event.stopPropagation();
});

$("#deckedit .mainDeck,#deckedit .extraDeck,#deckedit .sideDeck").on("drop", function(event) {
    'use strict';
    event.preventDefault();
    event.stopPropagation();

    var from = deckEditorReference.zone,
        target = $(this).data('dragzone'),
        sameIndex = $(this).data('dropindex');

    if (from === 'search' && ((target === 'main' && !isExtra(deckEditorReference)) || (target === 'extra' && isExtra(deckEditorReference)))) {
        deckEditor.addCardFromSearch(target);

    } else if (target === from) {
        deckEditor.moveInSameZone(from, deckEditorReference.index, sameIndex);
    } else if (target === 'main' && isExtra(deckEditorReference)) {
        return;
    } else if (target === 'extra' && !isExtra(deckEditorReference)) {
        return;
    } else {
        deckEditor.deckEditorMoveTo(target);
    }

    deckEditor.doSearch();
});