"use client";

import { useEffect } from 'react';

/** Set the browser/PDF title after commit without mutating the DOM during render. */
export function DocumentTitle({ title }: { title: string }) {
    useEffect(() => {
        const previous = document.title;
        document.title = title;
        return () => { document.title = previous; };
    }, [title]);
    return null;
}
