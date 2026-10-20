import { describe, expect, test } from 'bun:test';
import { normalizeHandle, parseInstagramProfile, instagramProfilePatch, instagramMetrics } from '../src/lib/instagram-profile-data';
import { fetchInstagramProfile } from '../src/lib/instagram-profile.server';
const profile = parseInstagramProfile({ data: { username: 'nasa', full_name: 'NASA', follower_count: 123, following_count: 4, media_count: 5, category: 'Science', is_verified: true } }, 'nasa');
describe('GramScraper mapping and creator preservation', () => {
  test('username and Instagram URLs normalize, foreign URLs and post URLs reject', () => {
    expect(normalizeHandle('@NASA')).toBe('nasa');
    expect(normalizeHandle('https://www.instagram.com/nasa/?hl=en')).toBe('nasa');
    expect(normalizeHandle('https://example.com/instagram.com/nasa')).toBeNull();
    expect(normalizeHandle('https://instagram.com/p/abc')).toBeNull();
  });
  test('documented envelope maps only actual numeric values and platform verification', () => {
    expect(instagramMetrics(profile)).toMatchObject({display_name:'NASA', followers:123, following:4, posts:5, bio_niche:'Science', is_verified:true, likes:null});
  });
  test('confirmation never overwrites creator name, niche, location, languages or content preferences', () => {
    const original = { display_name:'Registered creator', niche:'Fashion', location:'Surat', languages:['Gujarati'], content_types:['Photography'] };
    expect({...original,...instagramProfilePatch(profile,'creator/picture.jpg')}).toEqual({...original,instagram_username:'nasa',profile_link:'https://www.instagram.com/nasa/',follower_count:123,avatar_url:'creator/picture.jpg'});
  });
  test('missing follower and picture values never overwrite existing manual profile values', () => {
    const missing = parseInstagramProfile({username:'nasa'},'nasa');
    expect({...{follower_count:55,avatar_url:'manual.jpg'},...instagramProfilePatch(missing,null)}).toMatchObject({follower_count:55,avatar_url:'manual.jpg'});
  });
  test('switching accounts replaces social snapshot instead of retaining old data', () => {
    const next = instagramMetrics(parseInstagramProfile({username:'natgeo'},'natgeo'));
    expect(next).toMatchObject({display_name:null,followers:null,following:null,posts:null,bio_niche:null,is_verified:null});
  });
  test('private or mismatched responses cannot become successful previews', () => {
    expect(()=>parseInstagramProfile({username:'nasa',is_private:true},'nasa')).toThrow('private');
    expect(()=>parseInstagramProfile({username:'other'},'nasa')).toThrow('different account');
  });
  test('GET uses the specified endpoint exactly once, credit failures never retry', async () => {
    const original=globalThis.fetch; let calls=0;
    globalThis.fetch=(async (url,options)=>{calls++;expect(String(url)).toBe('https://gramscraper.com/api/instagram/v1/user/by/username?username=nasa');expect(options?.method).toBe('GET'); return Response.json({error:'insufficient_credits'},{status:402});}) as typeof fetch;
    try {await expect(fetchInstagramProfile('@nasa','test-only')).rejects.toThrow('credits are exhausted');expect(calls).toBe(1);} finally {globalThis.fetch=original;}
  });
});
