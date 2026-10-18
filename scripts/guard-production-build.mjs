// Refuse a production release with missing credentials; preview/local builds remain usable for review.
if (process.env.VERCEL_ENV === 'production') await import('./check-release-env.mjs');
else console.log('Production environment gate: deferred for this local/preview build.');
