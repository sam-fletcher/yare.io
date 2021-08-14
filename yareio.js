{
    const allSpiritsCount = Object.values(spirits).filter((s) => s.hp).length;
    const mySpritsCount = my_spirits.filter((s) => s.hp).length;
    console.log(`me: ${mySpritsCount}, them: ${allSpiritsCount - mySpritsCount}`);

    const username = base.id.substring(5);
    const enemyUser = enemy_base.id.substring(5);
    const size = my_spirits[0].size;
    const enemySize = spirits[enemyUser+"_1"].size;
    const range = 200;
    const speed = 20;
    const marksSeparator = ';';
    const marks = {
        HARVESTING: 'H',
        FIGHT: 'F',
        MYBASE: 'MB',
        OUTPOSTBASE: 'OB',
        ENEMYBASE: 'EB',
    };

    const myStar = base.position[0] <= outpost.position[0] ? star_zxq : star_a1c;
    const enemyStar = base.position[0] <= outpost.position[0] ? star_a1c : star_zxq;
    const outpostStar = star_p89;
    
    function getName(baseName) {
        if (baseName.endsWith(username)) {
            return marks.MYBASE
        } else if (baseName.endsWith(enemyUser)) {
            return marks.ENEMYBASE
        } else {
            return marks.OUTPOSTBASE
        }
    }

    function distance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos2[0] - pos1[0], 2) + Math.pow(pos2[1] - pos1[1], 2));
    }
    function sortDistance(from) {
        return (a, b) => distance(from.position, a.position) - distance(from.position, b.position);
    }
    function sortEnergy(a, b) {
        return a.energy - b.energy;
    }
    function starGrowth(star) {
        // the goal is to let the star keep growing, but as slowly as possible.
        // TODO: is the mining less efficient than it should be? used to be 0.01
        if (star.energy < 900) {
            return 3 + Math.floor((star.energy) * 0.01);
        }
        return 3 + Math.ceil((star.energy) * 0.01);
    }
    function sizeReducer(total, spirit) {
        return spirit.size + total;
    }
    function moveBetweenWithOffset(targetPosition, offsetPosition, range = 199) {
        const v = {
            x: offsetPosition[0] - targetPosition[0],
            y: offsetPosition[1] - targetPosition[1],
        };
        length = distance(targetPosition, offsetPosition);
        // normalize vector
        v.x /= length;
        v.y /= length;
        // increase vector size
        v.x *= range;
        v.y *= range;

        v.x += targetPosition[0];
        v.y += targetPosition[1];
        return [v.x, v.y];
    }
    function findWeighted(sortedArray) {
        if (sortedArray.length) {
            return sortedArray[Math.floor(Math.pow(Math.random(), 2) * sortedArray.length)];
        }
    }
    
    // MICRO FUNCTIONS
    function fight(me, friends) {
        let energizeTarget = undefined;
        let movementPosition = undefined;
        let cockiness = range;
        if (friends.filter((friend) => distance(friend.position, me.position) <= range / 2)
                    .reduce(sizeReducer, me.size) > enemySize &&
                        me.energy >= me.energy_capacity / 2) {
            cockiness = range + speed
        }
        const enemies = me.sight.enemies
            .map((e) => spirits[e])
            .filter((e) => distance(me.position, e.position) <= cockiness)
            .sort(sortEnergy);
    
        let target = findWeighted(enemies);
        if (me.energy > 0 && target) {
            movementPosition = moveBetweenWithOffset(target.position, me.position, range - speed);
            energizeTarget = target;
            me.shout('🔫');
        } else {
            energizeTarget = me
            movementPosition = myStar.position;
            me.shout('🦵');
        }
        return {energizeTarget, movementPosition};
    }
    
    function harvest(me, friends, markData, i) {
        let energizeTarget = undefined;
        let movementPosition = undefined;
        let targetBase = base;
        let targetStar = myStar;
        me.divide();

        if (markData.length == 3) {
            // me.shout('⛏');
            movementPosition = [markData[0], markData[1]]
            if (markData[2].endsWith(marks.OUTPOSTBASE)) {
                targetBase = outpost;
                targetStar = outpostStar;
            } else if (markData[2].endsWith(marks.ENEMYBASE)) {
                targetBase = enemy_base;
                targetStar = outpostStar;
            }
        }

        // find someone in more danger than me that can take energy
        const frontlineSupport = findWeighted(
            friends
                .filter(
                    (friend) =>
                        friend.mark.split(marksSeparator)[0] !== marks.HARVESTING &&
                        friend.energy + me.size <= friend.energy_capacity &&
                        distance(me.position, friend.position) <= 200
                )
                .sort(sortEnergy)
        );
        if (frontlineSupport) {
            energizeTarget = frontlineSupport;
            me.shout("f")
        } else if (i % 2 === tick % 2 && 
            distance(me.position, targetStar.position) <= 200) {
            me.shout("s")
            // get energy from star
            energizeTarget = me;
            // can move after energize towards base (not useful yet)
            movementPosition = moveBetweenWithOffset(targetStar.position, 
                                                targetBase.position, range + speed/2);
        } else if (distance(me.position, targetBase.position) <= 200) {
            me.shout("b")
            // push energy to base
            energizeTarget = targetBase;
        } else if (me.energy >= me.size) {
            // find someone to move energy to
            const pass = findWeighted(
                friends
                    .filter(
                        (friend) =>
                            friend.energy + me.size < friend.energy_capacity &&
                            distance(me.position, friend.position) >= speed &&
                            distance(me.position, targetBase.position) > 
                                distance(friend.position, targetBase.position)
                    )
                    .sort(sortEnergy)
            );
            if (pass) {
                me.shout("p")
                energizeTarget = pass;
            }
        }
        return {energizeTarget, movementPosition}
    }
    
    // MACRO FUNCTIONS
    function miningChain(unassignedSpirits, minedStar, targetBase) {
        unassignedSpirits.sort((a, b) => 
        distance(a.position, minedStar.position) - distance(b.position, minedStar.position));

        const starDistance = distance(targetBase.position, minedStar.position);
        const numCheckpoints = Math.floor(starDistance / 190);
        
        const starPower = starGrowth(minedStar);
        // the checkpoint closest to the star needs twice the miners
        var numMiners = (starPower * (numCheckpoints+1)) / size;
        if (numMiners < numCheckpoints*2) {
            return
        }
        const miners = unassignedSpirits.splice(0, numMiners);
        
        // there's one additional "virtual" checkpoint next to the star
        const numberInEachCheckpoint = miners.length / (numCheckpoints+1);
        const gapDistance = starDistance / (numCheckpoints+1)

        for (let i = 0; i < miners.length; i++) {
            const distance = Math.floor((i+1) / numberInEachCheckpoint)*gapDistance;
            const position = moveBetweenWithOffset(minedStar.position, targetBase.position, distance);
            const baseName = getName(targetBase.id)
            // miners[i].shout(baseName)
            miners[i].set_mark(
`${marks.HARVESTING}${marksSeparator}${position[0]}${marksSeparator}${position[1]}${marksSeparator}${baseName}`);
        }
        console.log(`${miners.length} ${minedStar.id} miners fueling ${targetBase.id}`)
    }
    
    // MAIN LOOPS:
    
    function doMacro() {
        const unassignedSpirits = my_spirits.filter((x) => x.hp);

        /** SPIRITS THAT ARE IN DANGER */
        const endangeredSpirits = unassignedSpirits.filter((me) => {
            if (!me.sight.enemies.length) {
                return false;
            }
            const enemies = me.sight.enemies.map((e) => spirits[e]);
            if (!enemies.some((e) => distance(me.position, e.position) <= range + speed)) {
                return false;
            }
            return true;
        });
        for (let i = 0; i < endangeredSpirits.length; i++) {
            const me = endangeredSpirits[i];
            me.set_mark(`${marks.FIGHT}`);
            unassignedSpirits.splice(unassignedSpirits.indexOf(me), 1);
        }
        console.log(`endangered: ${endangeredSpirits.length}`);
        
        if (outpostStar.active_in < 25 && outpost.energy < 700
            && mySpritsCount > 20 && outpost.control != enemyUser) {
            /** DO OUTPOST PROACTIVELY*/
            miningChain(unassignedSpirits, outpostStar, outpost)
        }
        /** MINE MY OWN STAR */
        miningChain(unassignedSpirits, myStar, base)
        
        if (outpost.control == enemyUser) {
            /** DO OUTPOST DEFENSIVELY */
            miningChain(unassignedSpirits, myStar, outpost)
        }
        /** ATTACK WITH THE REMAINDER */
        miningChain(unassignedSpirits, outpostStar, enemy_base)
    }


    function doMicro(me, i) {
        const friends = me.sight.friends
            .map((id) => spirits[id])
            .filter((friend) => distance(me.position, friend.position) < range);

        const markData = me.mark.split(marksSeparator);
        const markType = markData.splice(0, 1)[0];

        var energizeTarget = undefined;
        var movementPosition = undefined;

        switch (markType) {
            case marks.FIGHT:
                var {energizeTarget, movementPosition} = fight(me, friends);
                break;
            case marks.HARVESTING:
                var {energizeTarget, movementPosition} = harvest(me, friends, markData, i);
                break;
            default:
                me.shout('⁉');
                break;
        }

        if (energizeTarget !== undefined) {
            me.energize(energizeTarget);
        }
        if (movementPosition !== undefined) {
            me.move(movementPosition);
        }
    }

    doMacro();
    my_spirits.forEach(doMicro);
}



