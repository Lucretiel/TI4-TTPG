const assert = require("assert");
const { Hex } = require("../hex");
const { ObjectNamespace } = require("../object-namespace");
const UNIT_ATTRS = require("./unit-attrs.data");
const { GameObject, world } = require("../../wrapper/api");

let _nsidToUnitData = false;

function _getUnitPlastic(gameObject) {
    assert(gameObject instanceof GameObject);
    if (!_nsidToUnitData) {
        _nsidToUnitData = {
            "token:base/fighter_1": { unit: "fighter", count: 1 },
            "token:base/fighter_3": { unit: "fighter", count: 3 },
            "token:base/infantry_1": { unit: "infantry", count: 1 },
            "token:base/infantry_3": { unit: "infantry", count: 3 },
        };
        for (const rawAttrs of UNIT_ATTRS) {
            const nsid = rawAttrs.unitNsid;
            if (nsid) {
                const unitType = rawAttrs.unit;
                assert(unitType);
                assert(!_nsidToUnitData[nsid]);
                _nsidToUnitData[nsid] = {
                    unit: unitType,
                    count: 1,
                };
            }
        }
    }
    const nsid = ObjectNamespace.getNsid(gameObject);
    const unitData = _nsidToUnitData[nsid];
    if (unitData) {
        return new UnitPlastic(unitData.unit, unitData.count, gameObject);
    }
}

/**
 * Represent an in-game unit.  May be a "cardboard" token despite "platic" in class name.
 */
class UnitPlastic {
    /**
     * Find all pastic units and cardboard unit tokens.
     * Tokens are anonymous, call assignTokens (preferably with a filtered set).
     *
     * @returns {Array.<UnitPlastic>}
     */
    static getAll() {
        const result = [];
        for (const obj of world.getAllObjects()) {
            if (obj.getContainer()) {
                continue; // inside a container
            }
            const unitPlastic = _getUnitPlastic(obj);
            if (unitPlastic) {
                result.push(unitPlastic);
            }
        }
        return result;
    }

    /**
     * Assign cardboard token owners to closest in-hex plastic.
     * If there is no plastic in hex leave cardboard anonymous.
     *
     * @param {Array.<UnitPlastic>} unitPlastics
     */
    static assignTokens(unitPlastics) {
        const hexToOwnedArray = {};
        const hexToAnonArray = {};
        for (const unitPlastic of unitPlastics) {
            const hex = unitPlastic.hex;
            if (unitPlastic.owningPlayerSlot >= 0) {
                if (!hexToOwnedArray[hex]) {
                    hexToOwnedArray[hex] = [];
                }
                hexToOwnedArray[hex].push(unitPlastic);
            } else {
                if (!hexToAnonArray[hex]) {
                    hexToAnonArray[hex] = [];
                }
                hexToAnonArray[hex].push(unitPlastic);
            }
        }

        for (const [hex, anonArray] of Object.entries(hexToAnonArray)) {
            const ownedArray = hexToOwnedArray[hex];
            if (ownedArray) {
                for (const anon of anonArray) {
                    const anonPos = anon.gameObject.getPosition();
                    let closest = false;
                    let closestDSq = Number.MAX_VALUE;
                    for (const owned of ownedArray) {
                        const dSq = anonPos
                            .subtract(owned.gameObject.getPosition())
                            .magnitudeSquared();
                        if (dSq < closestDSq) {
                            closest = owned;
                            closestDSq = dSq;
                        }
                    }
                    anon._owningPlayerSlot = closest.owningPlayerSlot;
                }
            }
        }
    }

    /**
     * Assign units to planets.
     *
     * @param {Array.<UnitPlastic>} unitPlastics
     */
    static assignPlanets(unitPlastics) {
        // TODO XXX
        throw new Error("not yet implemented");
    }

    // ------------------------------------------------------------------------

    /**
     * Constuctor.  Outsiders should use getAll to retrieve UnitPlastic objects.
     *
     * @param {string} unit - unit type, shared with UnitAttrs.raw.unit
     * @param {number} count
     * @param {GameObject} gameObject
     */
    constructor(unit, count, gameObject) {
        assert(typeof unit === "string");
        assert(typeof count === "number" && count > 0);
        assert(gameObject instanceof GameObject);

        this._unit = unit;
        this._count = count;
        this._gameObject = gameObject;

        this._hex = Hex.fromPosition(gameObject.getPosition());
        this._owningPlayerSlot = gameObject.getOwningPlayerSlot();
        this._planet = false;
    }

    /**
     * Unit type (shared with UnitAttrs.raw.unit).
     *
     * return {string}
     */
    get unit() {
        return this._unit;
    }

    /**
     * How many units does this represent?  (E.g. "Fighter x3 Token")
     *
     * return {number}
     */
    get count() {
        return this._count;
    }

    /**
     * Linked GameObject.
     *
     * return {GameObject}
     */
    get gameObject() {
        return this._gameObject;
    }

    /**
     * Hex.
     *
     * return {string}
     */
    get hex() {
        return this._hex;
    }

    /**
     * Owning player, -1 if anonymous token.
     *
     * return {number}
     */
    get owningPlayerSlot() {
        return this._owningPlayerSlot;
    }

    /**
     * Unit is on this planet (after UnitPlastic.assignPlanets).
     *
     * return {string|undefined}
     */
    get planet() {
        return this._planet;
    }
}

module.exports = {
    UnitPlastic,
    _getUnitPlastic,
};
