import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function RepositorySettingsSection({ title, description, children, variant = "card" }) {
  if (variant === "card") {
    return (
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {children}
    </div>
  );
}
