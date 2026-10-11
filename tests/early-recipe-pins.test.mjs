import { expect, it } from 'vitest';
import { hashProofClaimParams } from '@reclaimprotocol/js-sdk';
import { spotifyTrackRecipe, youtubeSubscriptionRecipe } from '../scripts/provider-recipes.mjs';
import { providers } from '../src/lib/early/providers';
it('pins the complete reviewed Spotify and YouTube request/body/redaction hashes',()=>{
  const spotify=spotifyTrackRecipe({collectionUri:'spotify:playlist:0000000000000000000000',offset:0});
  const youtube=youtubeSubscriptionRecipe({timestamp:'1700000000000000',channelId:'UC0000000000000000000000'});
  expect(hashProofClaimParams({...spotify,body:spotify.body??''})).toEqual([providers.spotify_saved_track.hash]);
  expect(hashProofClaimParams({...youtube,body:youtube.body??''})).toEqual([providers.youtube_subscription.hash]);
  const changed=structuredClone(spotify);changed.body=changed.body.replace('"limit":1','"limit":2');
  expect(hashProofClaimParams(changed)).not.toEqual([providers.spotify_saved_track.hash]);
  const changedYoutube=structuredClone(youtube);changedYoutube.responseRedactions[2].xPath='//script';
  expect(hashProofClaimParams({...changedYoutube,body:''})).not.toEqual([providers.youtube_subscription.hash]);
});
it('pins all four video-like redactions and the exact authenticated source URL', async()=>{
  const {youtubeLikeRecipe}=await import('../scripts/youtube-like-recipe.mjs');
  const recipe={...youtubeLikeRecipe({timestamp:'1700000000000000',videoId:'dQw4w9WgXcQ',channelId:'UCuAXFkgsw1L7xaCfnd5JJOw'}),body:''};
  expect(hashProofClaimParams(recipe)).toEqual([providers.youtube_like.hash]);
  for(let i=0;i<4;i++){const changed=structuredClone(recipe);changed.responseRedactions[i].xPath='//script';expect(hashProofClaimParams(changed)).not.toEqual([providers.youtube_like.hash]);}
});
