import test from 'node:test';
import assert from 'node:assert/strict';
import { potentialRemaining, displayedRanks } from '../js/prono-progress.js';
import { T0, WEEK, LOCKGP } from '../js/data.js';
import { completeTeam, countTeamRoles } from '../js/team-state.js';
import { POSTES } from '../js/data.js';
test('potential includes saved photos and decreases only for missed photos',()=>{
 assert.equal(potentialRemaining({},+T0),100);
 assert(potentialRemaining({},+T0+4*WEEK)<100);
 assert.equal(potentialRemaining({weeks:{0:{pres:'test'}}},+T0+4*WEEK),100);
 assert.equal(potentialRemaining({},+LOCKGP),0);
});
test('equal displayed percentages have equal ranks including podium boundary',()=>{
 assert.deepEqual(displayedRanks([32.1,17.3,9.9,9.9,9.4]).map(x=>x.rank),[1,2,3,3,5]);
});
test('all twelve named roles are necessary for new votes; joker cannot replace one',()=>{
 const team={coeur:'P',pm:'PM',min:Object.fromEntries(POSTES.map(p=>[p,'M']))};
 assert.equal(completeTeam(team),true);
 assert.equal(countTeamRoles(team),12);
 assert.equal(countTeamRoles({...team,pm:' ',min:{...team.min,[POSTES[0]]:'',inconnu:'Joker'},jn:'Joker'}),10);
 assert.equal(countTeamRoles(null),0);
 for(const post of POSTES)assert.equal(completeTeam({...team,min:{...team.min,[post]:' '},jn:'Joker'}),false);
 assert.equal(completeTeam({...team,pm:''}),false);
});
