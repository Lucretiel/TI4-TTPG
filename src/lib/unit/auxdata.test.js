const assert = require("../../wrapper/assert");
const { AuxData } = require("./auxdata");
const {
    MockCard,
    MockCardDetails,
    MockGameObject,
    MockVector,
    world,
} = require("../../wrapper/api");

it("static createForPair", () => {
    const selfPlayerSlot = 7;
    const opponentPlayerSlot = 8;

    // Place a few units and tokens.
    world.__addObject(
        new MockGameObject({
            templateMetadata: "unit:base/fighter",
            owningPlayerSlot: selfPlayerSlot,
        })
    );
    world.__addObject(
        new MockGameObject({
            templateMetadata: "unit:base/fighter",
            owningPlayerSlot: opponentPlayerSlot,
            position: new MockVector(0.5, 0, 0), // further from tokens than above
        })
    );
    world.__addObject(
        new MockGameObject({
            templateMetadata: "token:base/fighter_3",
        })
    );
    world.__addObject(
        new MockGameObject({
            templateMetadata: "token:base/infantry_1",
        })
    );
    world.__addObject(
        new MockGameObject({
            templateMetadata: "unit:base/pds",
            owningPlayerSlot: selfPlayerSlot,
        })
    );
    world.__addObject(
        new MockGameObject({
            templateMetadata: "unit:base/pds",
            owningPlayerSlot: opponentPlayerSlot,
        })
    );

    // Carrier 2
    world.__addObject(
        new MockCard({
            cardDetails: new MockCardDetails({
                metadata: "card.technology.unit_upgrade:base/carrier_2",
            }),
            owningPlayerSlot: selfPlayerSlot,
        })
    );

    // Morale boost!
    world.__addObject(
        new MockCard({
            cardDetails: new MockCardDetails({
                metadata: "card.action:base/morale_boost.3",
            }),
            owningPlayerSlot: selfPlayerSlot,
        })
    );

    // Opponent cancels our PDS planetary shield.
    world.__addObject(
        new MockCard({
            cardDetails: new MockCardDetails({
                metadata: "card.action:base/disable",
            }),
            owningPlayerSlot: opponentPlayerSlot,
        })
    );

    let aux1, aux2;
    try {
        [aux1, aux2] = AuxData.createForPair(
            selfPlayerSlot,
            opponentPlayerSlot,
            "<0,0,0>",
            new Set()
        );
    } finally {
        for (const gameObject of world.getAllObjects()) {
            world.__removeObject(gameObject);
        }
    }

    // Basic finding.
    assert.equal(aux1.count("fighter"), 4);
    assert.equal(
        aux1.unitAttrsSet.get("carrier").raw.localeName,
        "unit.carrier_2"
    );

    const modifierNames = aux1.unitModifiers.map((x) => x.raw.localeName);
    assert.equal(modifierNames.length, 2);
    assert(modifierNames.includes("unit_modifier.name.morale_boost"));
    assert(modifierNames.includes("unit_modifier.name.disable"));

    assert.equal(aux2.count("fighter"), 1);

    // Verify self modifier.
    assert.equal(aux1.count("fighter"), 4);

    // Verify opponent's opponent modifier.
    assert(!aux1.unitAttrsSet.get("pds").raw.planetaryShield); // disabled
    assert(aux2.unitAttrsSet.get("pds").raw.planetaryShield); // opponent still has it
});

it("constructor", () => {
    new AuxData();
});
