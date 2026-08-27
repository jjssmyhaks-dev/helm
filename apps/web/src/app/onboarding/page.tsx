'use client';

import WorkspaceRegistration from '@/components/WorkspaceRegistration';
import type { WorkspaceData } from '@/components/WorkspaceRegistration';

export default function OnboardingPage() {
  const handleSubmit = (data: WorkspaceData) => {
    // Save to localStorage for now; in production, POST to /api/founder/profile
    localStorage.setItem('helm_workspace', JSON.stringify(data));
    localStorage.setItem('helm_onboarded', 'true');
  };

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceRegistration
        onSubmit={handleSubmit}
        onCancel={() => window.location.href = '/'}
      />
    </div>
  );
}
