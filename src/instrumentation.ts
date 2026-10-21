// Record the actual server runtime so security patch rollouts can be verified.
// Keep this server-only: do not log environment values, credentials or user data.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.info('[runtime-version] Node.js ' + process.version);
  }
}
