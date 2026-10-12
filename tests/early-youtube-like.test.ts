import { expect, it } from 'vitest';
import { youtubeLikeEvidence, youtubeSubscriptionEvidence } from '../src/lib/activity-evidence';
import { parseRoute, evaluate, type Evidence, type Rule } from '../src/lib/early/model';
import { parseTargetLink } from '../src/lib/early/targets';
import { providers, capabilities } from '../src/lib/early/providers';
import { activityLabel, targetLink } from '../src/components/fan-dashboard/model';
const video = 'dQw4w9WgXcQ', channel = 'UCuAXFkgsw1L7xaCfnd5JJOw';
const fields = { source_account_id: '123456789', video_id: video, channel_id: channel, activity_timestamp: '1700000000000000' };
const selection = {route:'youtube_like' as const,targetId:video,cutoff:'2025-01-01T00:00:00.000Z'};
const p = providers.youtube_like;
const evidence:Evidence = {...youtubeLikeEvidence(fields),id:'like-one',route:'youtube_like',providerId:p.id,providerVersion:p.version,recipeHash:p.hash,provedAt:'2026-01-01T00:00:00.000Z',observedAt:'2026-01-01T00:00:00.000Z',coverage:'loaded_english_activity_page'};
const rule:Rule = {version:1,title:'Video likes',alternatives:[selection],minimumDistinctEvents:1,minimumDistinctDays:1,payoutWei:'1',capacity:10,claimExpiry:2000000000};
it('normalizes a same-source video like distinctly from channel subscription evidence',()=>{
 const e=youtubeLikeEvidence(fields);expect(e).toMatchObject({activity:'video_liked',targetId:video,channelId:channel,sourceSubject:fields.source_account_id,artistIds:[],precisionMicros:1});
 expect(e.eventId).toBe(youtubeLikeEvidence(fields).eventId);
 expect(e.eventId).not.toBe(youtubeSubscriptionEvidence(fields).eventId);
 expect(youtubeLikeEvidence({...fields,source_account_id:'987654321'}).eventId).not.toBe(e.eventId);
});
it.each(['source_account_id','video_id','channel_id','activity_timestamp'])('rejects malformed verified %s', key=>{expect(()=>youtubeLikeEvidence({...fields,[key]:'.*'})).toThrow();});
it.each([video,`https://www.youtube.com/watch?v=${video}&si=tracking`,`https://youtu.be/${video}?si=tracking`,`https://m.youtube.com/shorts/${video}`])('canonicalizes an exact video: %s',input=>{expect(parseTargetLink('youtube_like',input)).toMatchObject({targetId:video,url:`https://www.youtube.com/watch?v=${video}`});});
it.each([`https://evil.test/watch?v=${video}`,`https://youtube.com.evil.test/watch?v=${video}`,`https://user@youtube.com/watch?v=${video}`,`http://youtube.com/watch?v=${video}`,`https://youtube.com:444/watch?v=${video}`,`https://youtube.com/watch?v=${video}&v=aaaaaaaaaaa`,`https://youtube.com/channel/${channel}`])('rejects ambiguous or non-video links: %s',input=>{expect(()=>parseTargetLink('youtube_like',input)).toThrow();});
it('does not confuse channel IDs, likes, watches or other videos in campaign rules',()=>{
 expect(parseRoute(selection)).toEqual(selection);expect(()=>parseRoute({...selection,targetId:channel})).toThrow();expect(()=>parseRoute({...selection,route:'youtube_watch'})).toThrow();
 expect(evaluate(rule,[evidence]).status).toBe('eligible');
 expect(evaluate(rule,[{...evidence,targetId:'aaaaaaaaaaa'}]).status).toBe('not_qualifying');
 expect(evaluate(rule,[{...evidence,route:'youtube_subscription',targetId:channel}]).status).toBe('not_qualifying');
 expect(evaluate({...rule,alternatives:[{...selection,targetId:channel}]},[evidence]).status).toBe('not_qualifying');
});
it('enforces exact cutoff precision and counts repeated copies only once',()=>{
 expect(evaluate({...rule,alternatives:[{...selection,cutoff:'2023-11-14T22:13:20.000Z'}]},[evidence]).status).toBe('not_qualifying');
 expect(evaluate({...rule,minimumDistinctEvents:2},[evidence,evidence]).status).toBe('not_qualifying');
});
it('enables the supported reward route and labels links as video likes',()=>{
 expect(capabilities().filter(c=>c.route==='youtube_like')).toHaveLength(1);
 expect(capabilities().find(c=>c.route==='youtube_like')?.rewardReady).toBe(true);
 expect(activityLabel(selection)).toBe('Liked this video');expect(targetLink(selection)).toBe(`https://www.youtube.com/watch?v=${video}`);
});
