import test from 'node:test';
import assert from 'node:assert/strict';
import { validPortrait, portraitSource, PORTRAITS } from '../js/player-portrait.js';
test('only built-in portraits and bounded JPEG data are accepted',()=>{
 for(const v of ['bouc','chatte','data:image/jpeg;base64,/9j/AA=='])assert(validPortrait(v));
 for(const v of [null,{},'https://example.org/photo.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,\" onerror=alert(1)','data:image/jpeg;base64,'+'A'.repeat(120000)])assert.equal(validPortrait(v),false);
 assert.equal(portraitSource('chatte'),PORTRAITS.chatte);
 assert.equal(portraitSource(null),PORTRAITS.bouc);
});
