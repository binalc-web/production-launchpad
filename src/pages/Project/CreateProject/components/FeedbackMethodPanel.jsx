import React from "react";

export const FeedbackMethodPanel = ({ feedbackIntegrationCard }) => (
  <div className="space-y-4">
    <div className="rounded-xl border bg-muted/20 p-5 md:p-6">
      <h3 className="text-base font-semibold text-foreground">
        Feedback embed setup
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Link Jira so feedback submitted from your embed snippet can be approved
        and turned into tickets. After onboarding, enable the embed and copy the
        snippet from the project page.
      </p>
    </div>
    {feedbackIntegrationCard}
  </div>
);
