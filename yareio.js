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
        PREPARE: 'P',
        MYBASE: 'MB',
        OUTPOSTBASE: 'OB',
        ENEMYBASE: 'EB',
        MYSTAR: 'MS',
        OUTPOSTSTAR: 'OS',
        ENEMYSTAR: 'ES'
    };

    const myStar = base.position[0] <= outpost.position[0] ? star_zxq : star_a1c;
    const enemyStar = base.position[0] <= outpost.position[0] ? star_a1c : star_zxq;
    const outpostStar = star_p89;
    
    function getName(id) {
        if (id == myStar.id) {
            return marks.MYSTAR
        } else if (id == enemyStar.id) {
            return marks.ENEMYSTAR
        } else if (id == outpostStar.id) {
            return marks.OUTPOSTSTAR
        } else if (id.endsWith(username)) {
            return marks.MYBASE
        } else if (id.endsWith(enemyUser)) {
            return marks.ENEMYBASE
        } else {
            return marks.OUTPOSTBASE
        }
    }

    function distance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos2[0] - pos1[0], 2) + Math.pow(pos2[1] - pos1[1], 2));
    }
    function distanceSortWithTiebreaker(a, b, targ, targ2) {
        let dist = distance(a.position, targ.position) - distance(b.position, targ.position)
        if (Math.abs(dist) > speed) {
            return dist;
        }
        dist = distance(a.position, targ2.position) - distance(b.position, targ2.position)
        // if (Math.abs(dist) > speed) {
            return dist;
        // }
        // let e = a.energy - b.energy
        // if (e > 0) {
        //     return e
        // }
        // if (a.last_energized == targ.id) {
        //     return -1
        // }
        // return 1
    }
    function sortDistance(from) {
        return (a, b) => distance(from.position, a.position) - distance(from.position, b.position);
    }
    function sortEnergy(a, b) {
        return a.energy - b.energy;
    }
    function starGrowth(star) {
        // the goal is to let the star keep growing, but as slowly as possible.
        if (star.energy < 900) {
            return 2 + Math.floor((star.energy) * 0.01);
        }
        return 3 + Math.floor((star.energy) * 0.011);
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
        // get the unit vector
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
            let weight = enemySize + 1
            return sortedArray[Math.floor(Math.pow(Math.random(), weight) * sortedArray.length)];
        }
    }
    
    // MICRO FUNCTIONS
    function prepare(me) {
        let energizeTarget = me;
        let movementPosition = undefined;
        if (me.energy < me.energy_capacity) {
            movementPosition = myStar.position
            // energizeTarget = me
        } else if (outpost.control == username) {
        movementPosition = moveBetweenWithOffset(enemy_base.position, outpost.position, 379)
        } else {
            movementPosition = moveBetweenWithOffset(outpost.position, 
                            base.position, outpost.range + speed + 1)
        }
        return {energizeTarget, movementPosition};
    }
    
    function fight(me, friends) {
        let energizeTarget = undefined;
        let movementPosition = undefined;
        let cockiness = range-1 - speed*2; // assumes enemy is also moving towards us
        if (friends.filter((friend) => distance(friend.position, me.position) <= speed*2)
                    .reduce(sizeReducer, me.size) > enemySize &&
                        me.energy >= me.energy_capacity / 2) {
            cockiness = range+1 + speed
        }
        const enemies = me.sight.enemies
            .map((e) => spirits[e])
            .filter((e) => distance(me.position, e.position) <= cockiness)
            .sort(sortEnergy);
    
        let target = findWeighted(enemies); // finds an enemy we're willing to attack
        if (me.energy > 0 && target) {
            movementPosition = moveBetweenWithOffset(target.position, me.position, range - speed);
            energizeTarget = target;
            me.shout('🔫');
        } else {
            energizeTarget = me
            if (distance(me.position, enemy_base.position) < distance(me.position, base.position)) {
                movementPosition = outpost.position
            } else {
                movementPosition = myStar.position;
            }
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

        if (markData.length == 4) {
            // me.shout('⛏');
            movementPosition = [markData[0], markData[1]]
            if (markData[2].endsWith(marks.OUTPOSTBASE)) {
                targetBase = outpost;
            } else if (markData[2].endsWith(marks.ENEMYBASE)) {
                targetBase = enemy_base;
            }
            if (markData[3].endsWith(marks.OUTPOSTSTAR)) {
                targetStar = outpostStar;
            } else if (markData[3].endsWith(marks.ENEMYSTAR)) {
                targetStar = enemyStar;
            }
        } else {
            me.shout("markData wrong length")
        }

        // find someone in more danger than me that can take energy
        const frontlineSupport = findWeighted(
            friends
                .filter(
                    (friend) =>
                        friend.sight.enemies.length > 1 &&
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
        unassignedSpirits.sort((a, b) => distanceSortWithTiebreaker(a, b, minedStar, targetBase));

        const starDistance = distance(targetBase.position, minedStar.position);
        const numCheckpoints = Math.floor(starDistance / 190);
        
        const starPower = starGrowth(minedStar);
        // the checkpoint closest to the star needs twice the miners
        var numMiners = (starPower * (numCheckpoints+1)) / size;
        
        if (numMiners < numCheckpoints*2) {
            return
        } else if (targetBase == outpost && outpost.control == username) {
            // don't over-charge the outpost
            numMiners = Math.min(numMiners, (1000-outpost.energy)/8)
        } else if (targetBase == enemy_base) {
            // use all remaining miners in the attack
            numMiners = unassignedSpirits.length
        }
        const miners = unassignedSpirits.splice(0, numMiners);
        
        // there's one additional "virtual" checkpoint next to the star
        const numberInEachCheckpoint = miners.length / (numCheckpoints+1);
        const gapDistance = starDistance / (numCheckpoints+1)
        
        for (let i = 0; i < miners.length; i++) {
            // const distance = Math.floor((i+1) / numberInEachCheckpoint)*gapDistance;
            let distance = Math.max(Math.floor(i / numberInEachCheckpoint) - 1, 0);
            distance = (distance+1)*gapDistance
            const position = moveBetweenWithOffset(minedStar.position, targetBase.position, distance);
            const baseName = getName(targetBase.id)
            const starName = getName(minedStar.id)
            // miners[i].shout(baseName)
            miners[i].set_mark(
`${marks.HARVESTING}${marksSeparator}${position[0]}${marksSeparator}${position[1]}${marksSeparator}${baseName}${marksSeparator}${starName}`);  
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
        
        if (base.sight.enemies.length*enemySize > 20) {
            /** EMERGENCY */
            for (let me of unassignedSpirits) { 
                me.set_mark(`${marks.PREPARE}`)
            }
        }

        if (outpost.control != enemyUser && !memory.attack) {
            /** MINE MY OWN STAR */
            miningChain(unassignedSpirits, myStar, base)
            // outpost.energy < 700 && outpostStar.active_in < 25 && mySpritsCount > 20
            // if (outpost.energy > 700) {
            //     /** BONUS MINING OF THE OUTPOST */
            //     miningChain(unassignedSpirits, outpostStar, base)
            // }
            /** CONTROL THE OUTPOST */
            miningChain(unassignedSpirits, outpostStar, outpost)
            if (outpost.energy > 800)  {
                /** ATTACK IF THE OUTPOST IS READY */
                console.log(`${unassignedSpirits.length} attackers`)
                for (let me of unassignedSpirits) { 
                    me.set_mark(`${marks.PREPARE}`)
                }
                if (unassignedSpirits.length > 100) {
                    miningChain(unassignedSpirits, outpostStar, enemy_base)
                }
            }
            memory.attack = false
        } else {
            /** PREPARE TO ATTACK THE OUTPOST */
            if (!memory.attack) {
                memory.attack = true
                memory.attackTime = tick
            }
            for (let me of unassignedSpirits) { 
                me.set_mark(`${marks.PREPARE}`)
            }
            if (tick > memory.attackTime+20) {
                while (unassignedSpirits.length > 0) {
                    miningChain(unassignedSpirits, outpostStar, outpost)
                }
                if (outpost.control == username && outpost.energy > 100) {
                    memory.attack = false
                }
            }
        }
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
            case marks.PREPARE:
                var {energizeTarget, movementPosition} = prepare(me);
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



