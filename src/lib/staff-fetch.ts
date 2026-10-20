"use client";

export async function staffFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await (init === undefined ? fetch(input) : fetch(input, init));
  if (response.status === 401) window.location.assign(window.location.pathname.startsWith('/management') ? '/management/login' : '/admin/login');
  return response;
}
