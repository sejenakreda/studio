"use client";

import React from 'react';

// This layout ensures that only gurus can access routes under /guru
// The actual UI shell is handled by (protected)/layout.tsx -> AppShell
// This file mostly serves to group guru routes.

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication and role checks are handled by the parent ProtectedLayout.
  return <>{children}</>;
}
