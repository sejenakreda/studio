"use client";

import React from 'react';

// This layout ensures that only admins can access routes under /protected/admin
// The actual UI shell is handled by (protected)/layout.tsx -> AppShell
// This file mostly serves to group admin routes and can be used for
// admin-specific context providers or further layout refinements if needed.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication and role checks are handled by the parent ProtectedLayout.
  // If specific admin context or further nested layout is needed, it would go here.
  return <>{children}</>;
}
