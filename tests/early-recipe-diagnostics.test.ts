import { expect, it } from "vitest";
import { hashProofClaimParams } from "@reclaimprotocol/js-sdk";
import { spotifyRecipeDiagnostics, spotifyRecipeReference } from "../src/lib/early/recipe-diagnostics";
import { providers } from "../src/lib/early/providers";
const hash=providers.spotify_saved_track.hash;
it("uses the current reviewed pin and compares canonical selector defaults",()=>{
  expect(hashProofClaimParams(spotifyRecipeReference)).toContain(hash);
  const recipe={...spotifyRecipeReference,responseMatches:spotifyRecipeReference.responseMatches.map(m=>({...m,invert:false})),responseRedactions:spotifyRecipeReference.responseRedactions.map(r=>({...r,xPath:null}))};
  expect(spotifyRecipeDiagnostics(JSON.stringify(recipe),hash)).toMatchObject({state:"compared",differences:[],bodyKind:"template"});
});
it("identifies an interpolated body without disclosing its source account or collection",()=>{
  const body=spotifyRecipeReference.body.replace("{{collection_uri}}","spotify:playlist:1234567890123456789012").replace("{{offset}}","7");
  const report=spotifyRecipeDiagnostics(JSON.stringify({...spotifyRecipeReference,body,paramValues:{private:"source-account"}}),hash);
  expect(report).toMatchObject({differences:["body"],bodyKind:"resolved_template"});
  expect(JSON.stringify(report)).not.toContain("1234567890123456789012");expect(JSON.stringify(report)).not.toContain("source-account");
});
it("reports changed matcher/redaction shapes without accepting them",()=>{
  const report=spotifyRecipeDiagnostics(JSON.stringify({...spotifyRecipeReference,responseMatches:[{type:"contains",value:"private history"}],responseRedactions:[]}),hash);
  expect(report).toMatchObject({differences:["responseMatches","responseRedactions"]});expect(JSON.stringify(report)).not.toContain("private history");
});
it("bounds malformed selectors and refuses stale references",()=>{
  expect(spotifyRecipeDiagnostics("invalid",hash)).toEqual({state:"invalid_parameters"});
  expect(spotifyRecipeDiagnostics(JSON.stringify({...spotifyRecipeReference,responseMatches:Array(40).fill({})}),hash)).toEqual({state:"unexpected_selectors"});
  expect(spotifyRecipeDiagnostics(JSON.stringify(spotifyRecipeReference),"wrong-pin")).toEqual({state:"reference_mismatch"});
});
