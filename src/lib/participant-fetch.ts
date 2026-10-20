"use client";

export async function participantFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await (init === undefined ? fetch(input) : fetch(input, init));
  if (response.status === 401) {
    localStorage.removeItem('currentUser');
    // Discard the previous identity and in-memory page state after session expiry.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }
  return response;
}
