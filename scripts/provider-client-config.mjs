// Fixed proof egress avoids an unresolved DYNAMIC_GEO in Android TEE clients.
export const proofGeoLocation = 'US';
export const spotifyUserAgent = {
  android: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ios: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

export function injectedRequestsForPublication(requests) {
  return requests.map(request => ({
    ...request,
    ...(request.bodySniff?.enabled ? { body: request.bodySniff.template } : {}),
  }));
}
